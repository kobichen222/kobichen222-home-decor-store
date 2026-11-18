import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AddressForm } from "@/components/store/account-forms";
import { AccountShell } from "@/components/store/account-nav";
import { deleteAddress } from "@/features/account/actions";
import { getCustomer } from "@/lib/auth/customer";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "הכתובות שלי", robots: { index: false } };

async function Addresses() {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login?next=/account/addresses");
  const db = await createSessionClient();
  const { data: addresses } = await db.from("customer_addresses").select("*").order("is_default", { ascending: false }).order("created_at");
  return (
    <AccountShell active="/account/addresses" title="כתובות למשלוח">
      <ul className="mb-8 grid gap-3 sm:grid-cols-2">
        {(addresses ?? []).map((a) => (
          <li key={a.id} className="rounded-2xl border border-line bg-white p-4 text-sm">
            <p className="font-bold">{a.label || "כתובת"} {a.is_default && <span className="ms-1 rounded-full bg-sand px-2 py-0.5 text-xs">ברירת מחדל</span>}</p>
            <p className="mt-1">{a.full_name} · <span dir="ltr">{a.phone}</span></p>
            <p className="text-ink-soft">{a.street} {a.house_number}{a.apartment && `/${a.apartment}`}, {a.city} {a.zip}</p>
            <form action={deleteAddress} className="mt-2">
              <input type="hidden" name="id" value={a.id} />
              <button type="submit" className="text-xs font-semibold text-danger hover:underline">מחיקה</button>
            </form>
          </li>
        ))}
        {!addresses?.length && <li className="text-ink-soft">אין כתובות שמורות. כתובת ברירת המחדל תמולא אוטומטית בקופה.</li>}
      </ul>
      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="mb-4 font-bold">כתובת חדשה</h2>
        <AddressForm />
      </section>
    </AccountShell>
  );
}

export default function AddressesPage() {
  return (
    <Suspense fallback={<div className="container-page py-12"><div className="h-72 animate-pulse rounded-2xl bg-sand" /></div>}>
      <Addresses />
    </Suspense>
  );
}
