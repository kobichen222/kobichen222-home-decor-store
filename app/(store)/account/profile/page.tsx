import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PasswordForm, ProfileForm } from "@/components/store/account-forms";
import { BusinessAccountForm } from "@/components/store/business-forms";
import { AccountShell } from "@/components/store/account-nav";
import { getCustomer } from "@/lib/auth/customer";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "פרטים אישיים", robots: { index: false } };

async function Profile() {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login?next=/account/profile");
  const db = await createSessionClient();
  const [{ data: profile }, { data: business }] = await Promise.all([
    db.from("profiles").select("full_name, phone, marketing_opt_in").eq("id", customer.id).maybeSingle(),
    db.from("business_accounts").select("company_name, status, discount_percent").eq("user_id", customer.id).maybeSingle(),
  ]);
  return (
    <AccountShell active="/account/profile" title="פרטים אישיים">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <ProfileForm profile={{ full_name: profile?.full_name ?? null, phone: profile?.phone ?? null, marketing_opt_in: profile?.marketing_opt_in ?? false, email: customer.email }} />
        </section>
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="mb-4 font-bold">שינוי סיסמה</h2>
          <PasswordForm />
        </section>
        <section className="rounded-2xl border border-line bg-white p-5 lg:col-span-2">
          <h2 className="mb-2 font-bold">חשבון עסקי</h2>
          {business ? (
            <p className="text-sm">
              {business.company_name} ·{" "}
              {business.status === "approved" ? (
                <span className="font-semibold text-success">מאושר{Number(business.discount_percent) > 0 && `, ${business.discount_percent}% הנחה בכל הזמנה`}</span>
              ) : business.status === "pending" ? (
                <span className="font-semibold text-brand">הבקשה ממתינה לאישור</span>
              ) : (
                <span className="text-ink-soft">הבקשה לא אושרה. לפרטים פנו אלינו.</span>
              )}
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-ink-soft">עסקים מאושרים מקבלים מחירים מיוחדים וחשבונית על שם החברה.</p>
              <BusinessAccountForm />
            </>
          )}
        </section>
      </div>
    </AccountShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="container-page py-12"><div className="h-72 animate-pulse rounded-2xl bg-sand" /></div>}>
      <Profile />
    </Suspense>
  );
}
