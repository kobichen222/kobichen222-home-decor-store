import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountShell } from "@/components/store/account-nav";
import { buttonClass } from "@/components/ui/button";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/features/orders/queries";
import { getCustomer } from "@/lib/auth/customer";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "האזור האישי", robots: { index: false } };

async function Orders() {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login");
  const db = await createSessionClient();
  const [{ data: profile }, { data: orders }] = await Promise.all([
    db.from("profiles").select("full_name").eq("id", customer.id).maybeSingle(),
    db.from("orders").select("id, order_number, public_token, placed_at, total, status, payment_status, tracking_number, items:order_items(quantity)").order("placed_at", { ascending: false }),
  ]);
  const visible = (orders ?? []).filter((o) => !(o.status === "cancelled" && o.payment_status === "unpaid"));
  return (
    <AccountShell active="/account" title={`שלום${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}>
      <h2 className="mb-4 text-xl font-bold">ההזמנות שלי</h2>
      {!visible.length ? (
        <div className="rounded-2xl bg-sand px-6 py-14 text-center">
          <p className="font-semibold">עדיין אין הזמנות בחשבון</p>
          <p className="mt-1 text-sm text-ink-soft">הזמנות שתבצעו כשאתם מחוברים יופיעו כאן.</p>
          <Link href="/shop" className={buttonClass("primary", "md", "mt-5")}>לחנות</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((o) => (
            <li key={o.id}>
              <Link href={`/order/${o.public_token}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-line bg-white p-4 hover:border-brand">
                <span className="font-bold">הזמנה {o.order_number}</span>
                <span className="text-sm text-ink-soft">{formatDate(o.placed_at)}</span>
                <span className="text-sm text-ink-soft">{o.items.reduce((s, i) => s + i.quantity, 0)} פריטים</span>
                <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold">{ORDER_STATUS_LABELS[o.status]}</span>
                {o.payment_status !== "paid" && <span className="text-xs text-ink-soft">{PAYMENT_STATUS_LABELS[o.payment_status]}</span>}
                {o.tracking_number && <span className="text-xs">מעקב: {o.tracking_number}</span>}
                <span className="ms-auto font-semibold tabular-nums">{formatPrice(o.total)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="container-page py-12"><div className="h-72 animate-pulse rounded-2xl bg-sand" /></div>}>
      <Orders />
    </Suspense>
  );
}
