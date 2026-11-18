import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckoutForm, type CheckoutPrefill, type ShippingOption } from "@/components/store/checkout-form";
import { getCustomer } from "@/lib/auth/customer";
import { createSessionClient } from "@/lib/supabase/server";
import { CheckoutSteps } from "@/components/store/checkout-steps";
import { PageHeader } from "@/components/store/page-header";
import { readCartId, summarize, syncCartOwner } from "@/features/cart/server";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "קופה", robots: { index: false } };

async function Checkout() {
  const cartId = await readCartId();
  if (cartId) await syncCartOwner(cartId);
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
  // A signed-in shopper starts with their details and default address.
  let prefill: CheckoutPrefill = null;
  const customer = await getCustomer();
  if (customer) {
    const db = await createSessionClient();
    const [{ data: profile }, { data: address }] = await Promise.all([
      db.from("profiles").select("full_name, phone").eq("id", customer.id).maybeSingle(),
      db.from("customer_addresses").select("city, street, house_number, apartment, zip").eq("user_id", customer.id).order("is_default", { ascending: false }).limit(1).maybeSingle(),
    ]);
    prefill = { name: profile?.full_name ?? undefined, phone: profile?.phone ?? undefined, email: customer.email, address };
  }
  return <CheckoutForm options={options} prefill={prefill} />;
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
        <CheckoutSteps current={2} />
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-sand" aria-hidden="true" />}>
          <Checkout />
        </Suspense>
      </div>
    </>
  );
}
