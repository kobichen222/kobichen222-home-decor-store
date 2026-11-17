import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckoutForm, type ShippingOption } from "@/components/store/checkout-form";
import { PageHeader } from "@/components/store/page-header";
import { readCartId, summarize } from "@/features/cart/server";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "קופה", robots: { index: false } };

async function Checkout() {
  const cartId = await readCartId();
  const base = await summarize(cartId);
  if (!cartId || base.items.length === 0 || base.items.some((i) => !i.purchasable)) redirect("/cart");

  const { data: methods } = await createPublicClient()
    .from("shipping_methods")
    .select("id, name, description, requires_address, delivery_days_min, delivery_days_max")
    .order("sort_order");
  // Totals are priced on the server once per shipping method, so switching
  // method in the form shows exact amounts without trusting the browser.
  const options: ShippingOption[] = await Promise.all(
    (methods ?? []).map(async (m) => ({ ...m, summary: await summarize(cartId, m.id) })),
  );
  if (!options.length) throw new Error("No active shipping methods are configured");
  return <CheckoutForm options={options} />;
}

export default function CheckoutPage() {
  return (
    <>
      <PageHeader
        title="קופה"
        crumbs={[
          { name: "סל הקניות", href: "/cart" },
          { name: "קופה", href: "/checkout" },
        ]}
      />
      <div className="container-page py-10">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-sand" aria-hidden="true" />}>
          <Checkout />
        </Suspense>
      </div>
    </>
  );
}
