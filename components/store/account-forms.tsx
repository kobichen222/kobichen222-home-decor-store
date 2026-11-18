"use client";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { changePassword, login, register, saveAddress, updateProfile } from "@/features/account/actions";
import { useFormAction } from "@/lib/use-form-action";

function Message({ state }: { state: { ok?: boolean; message?: string } | null }) {
  if (!state?.message) return null;
  return <p role={state.ok ? "status" : "alert"} className={`text-sm font-semibold ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>;
}

export function LoginForm({ next }: { next?: string }) {
  const { state, pending, onSubmit } = useFormAction(login);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="דוא״ל" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" dir="ltr" required /></Field>
      <Field label="סיסמה" htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" dir="ltr" required /></Field>
      <Message state={state} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "מתחבר…" : "כניסה"}</Button>
      <p className="text-center text-sm text-ink-soft">
        אין לכם חשבון? <Link href={`/account/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand underline">להרשמה</Link>
      </p>
      <p className="text-center text-xs text-ink-soft">שכחתם סיסמה? <Link href="/contact" className="underline">פנו אלינו</Link> ונאפס אותה עבורכם.</p>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const { state, pending, onSubmit } = useFormAction(register);
  const e = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="שם מלא" htmlFor="full_name" required error={e.full_name}><Input id="full_name" name="full_name" autoComplete="name" required /></Field>
      <Field label="דוא״ל" htmlFor="email" required error={e.email}><Input id="email" name="email" type="email" autoComplete="email" dir="ltr" required /></Field>
      <Field label="טלפון נייד" htmlFor="phone" required error={e.phone}><Input id="phone" name="phone" type="tel" autoComplete="tel" dir="ltr" className="text-end" required /></Field>
      <Field label="סיסמה" htmlFor="password" required error={e.password} hint="8 תווים לפחות"><Input id="password" name="password" type="password" autoComplete="new-password" dir="ltr" required /></Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="marketing" className="mt-1 size-4 accent-[var(--color-brand)]" />
        אשמח לקבל עדכונים, השראה והטבות בדוא״ל (אפשר להסיר בכל עת)
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="terms" className="mt-1 size-4 accent-[var(--color-brand)]" />
        <span>קראתי ואני מאשר/ת את <Link href="/terms" target="_blank" className="font-semibold underline">התקנון</Link> ואת <Link href="/privacy" target="_blank" className="font-semibold underline">מדיניות הפרטיות</Link></span>
      </label>
      {e.terms && <p className="text-xs font-semibold text-danger">{e.terms}</p>}
      <Message state={state} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "נרשם…" : "יצירת חשבון"}</Button>
      <p className="text-center text-sm text-ink-soft">
        כבר רשומים? <Link href={`/account/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand underline">לכניסה</Link>
      </p>
    </form>
  );
}

export function ProfileForm({ profile }: { profile: { full_name: string | null; phone: string | null; marketing_opt_in: boolean; email: string } }) {
  const { state, pending, onSubmit } = useFormAction(updateProfile);
  const e = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="דוא״ל" htmlFor="pemail" hint="לשינוי כתובת הדוא״ל פנו אלינו"><Input id="pemail" value={profile.email} dir="ltr" disabled /></Field>
      <Field label="שם מלא" htmlFor="full_name" error={e.full_name}><Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} /></Field>
      <Field label="טלפון נייד" htmlFor="phone" error={e.phone}><Input id="phone" name="phone" type="tel" dir="ltr" className="text-end" defaultValue={profile.phone ?? ""} /></Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="marketing" defaultChecked={profile.marketing_opt_in} className="size-4 accent-[var(--color-brand)]" />
        רשום/ה לדיוור
      </label>
      <Message state={state} />
      <Button type="submit" disabled={pending}>שמירה</Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = React.useActionState(changePassword, null);
  return (
    <form action={action} className="space-y-4">
      <Field label="סיסמה חדשה" htmlFor="new_password" hint="8 תווים לפחות"><Input id="new_password" name="password" type="password" autoComplete="new-password" dir="ltr" required /></Field>
      <Message state={state} />
      <Button type="submit" variant="outline" disabled={pending}>עדכון סיסמה</Button>
    </form>
  );
}

export function AddressForm() {
  const { state, pending, onSubmit } = useFormAction(saveAddress);
  const e = state?.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-6 gap-4">
      <Field label="כינוי" htmlFor="label" className="col-span-6 sm:col-span-2"><Input id="label" name="label" placeholder="בית / משרד" /></Field>
      <Field label="שם הנמען" htmlFor="full_name" required error={e.full_name} className="col-span-6 sm:col-span-2"><Input id="full_name" name="full_name" /></Field>
      <Field label="טלפון" htmlFor="phone" required error={e.phone} className="col-span-6 sm:col-span-2"><Input id="phone" name="phone" type="tel" dir="ltr" className="text-end" /></Field>
      <Field label="עיר" htmlFor="city" required error={e.city} className="col-span-6 sm:col-span-3"><Input id="city" name="city" /></Field>
      <Field label="רחוב" htmlFor="street" required error={e.street} className="col-span-6 sm:col-span-3"><Input id="street" name="street" /></Field>
      <Field label="מספר בית" htmlFor="house_number" required error={e.house_number} className="col-span-2"><Input id="house_number" name="house_number" /></Field>
      <Field label="דירה" htmlFor="apartment" className="col-span-2"><Input id="apartment" name="apartment" /></Field>
      <Field label="מיקוד" htmlFor="zip" error={e.zip} className="col-span-2"><Input id="zip" name="zip" dir="ltr" className="text-end" /></Field>
      <label className="col-span-6 flex items-center gap-2 text-sm"><input type="checkbox" name="is_default" className="size-4 accent-[var(--color-brand)]" /> כתובת ברירת מחדל</label>
      <div className="col-span-6 flex items-center gap-3"><Button type="submit" disabled={pending}>הוספת כתובת</Button><Message state={state} /></div>
    </form>
  );
}
