"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { addAdminUser, saveSettings, setUserRoles } from "@/features/admin/backoffice-actions";
import { useFormAction } from "@/lib/use-form-action";
import { Card } from "./ui";

type Settings = {
  business: Record<string, string> & { social?: { instagram?: string; facebook?: string } };
  commerce: { vat_rate?: number; reservation_minutes?: number };
  seo: { title?: string; description?: string };
};

function Result({ state }: { state: { ok?: boolean; message?: string } | null }) {
  if (!state?.message) return null;
  return <p role="status" className={`text-sm font-semibold ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>;
}

export function SettingsForm({ settings }: { settings: Settings }) {
  const { state, pending, onSubmit } = useFormAction(saveSettings);
  const b = settings.business ?? {};
  const t = (name: string, label: string, opts: { dir?: "ltr"; hint?: string; type?: string; value?: string } = {}) => (
    <Field label={label} htmlFor={name} hint={opts.hint}>
      <Input id={name} name={name} type={opts.type} dir={opts.dir} defaultValue={opts.value ?? b[name] ?? ""} />
    </Field>
  );
  return (
    <form onSubmit={onSubmit} className="max-w-4xl space-y-5">
      <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <h2 className="font-bold sm:col-span-2">פרטי העסק</h2>
        {t("name", "שם העסק")}
        {t("tagline", "סלוגן")}
        {t("phone", "טלפון", { dir: "ltr" })}
        {t("whatsapp", "WhatsApp", { dir: "ltr", hint: "בפורמט בינלאומי, לדוגמה 972501234567. ריק = בלי כפתור" })}
        {t("email", "דוא״ל", { dir: "ltr", type: "email" })}
        {t("address", "כתובת")}
        {t("hours", "שעות פעילות")}
        {t("company_name", "שם החברה הרשמי")}
        {t("company_number", "ח.פ. / עוסק מורשה", { dir: "ltr" })}
        {t("instagram", "Instagram", { dir: "ltr", value: b.social?.instagram ?? "" })}
        {t("facebook", "Facebook", { dir: "ltr", value: b.social?.facebook ?? "" })}
      </Card>
      <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <h2 className="font-bold sm:col-span-2">מסחר</h2>
        <Field label="שיעור מע״מ (%)" htmlFor="vat_rate" hint="המחירים באתר כוללים מע״מ; משמש לפירוט בהזמנה">
          <Input id="vat_rate" name="vat_rate" type="number" step="0.01" dir="ltr" defaultValue={settings.commerce.vat_rate ?? 18} />
        </Field>
        <Field label="שמירת מלאי להזמנה שלא שולמה (דקות)" htmlFor="reservation_minutes">
          <Input id="reservation_minutes" name="reservation_minutes" type="number" dir="ltr" defaultValue={settings.commerce.reservation_minutes ?? 30} />
        </Field>
      </Card>
      <Card className="grid gap-4 p-5 sm:p-6">
        <h2 className="font-bold">SEO של האתר</h2>
        <Field label="כותרת עמוד הבית" htmlFor="seo_title"><Input id="seo_title" name="seo_title" maxLength={70} defaultValue={settings.seo.title ?? ""} /></Field>
        <Field label="תיאור Meta של עמוד הבית" htmlFor="seo_description"><Textarea id="seo_description" name="seo_description" rows={2} maxLength={170} defaultValue={settings.seo.description ?? ""} /></Field>
      </Card>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "שומר…" : "שמירת הגדרות"}</Button>
        <Result state={state} />
      </div>
    </form>
  );
}

type Role = { id: string; code: string; name: string; description: string | null };

export function AddUserForm({ roles }: { roles: Role[] }) {
  const [state, action, pending] = React.useActionState(addAdminUser, null);
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="דוא״ל" htmlFor="new_email" className="min-w-60 flex-1"><Input id="new_email" name="email" type="email" dir="ltr" required /></Field>
        <Field label="תפקיד" htmlFor="role_id">
          <Select id="role_id" name="role_id" required>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </Field>
        <Button type="submit" disabled={pending}>{pending ? "מוסיף…" : "הוספת משתמש"}</Button>
      </div>
      <Result state={state} />
      {state?.secret && (
        <p className="rounded-xl border border-gold/50 bg-gold/10 p-3 text-sm">
          סיסמה זמנית: <code className="rounded bg-white px-2 py-0.5 font-bold" dir="ltr">{state.secret}</code>
          <br />
          היא מוצגת פעם אחת בלבד. העבירו אותה למשתמש בערוץ בטוח, ובקשו ממנו להחליף אותה.
        </p>
      )}
    </form>
  );
}

export function UserRolesForm({ userId, roles, current, self }: { userId: string; roles: Role[]; current: string[]; self: boolean }) {
  const [state, action, pending] = React.useActionState(setUserRoles, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="user_id" value={userId} />
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {roles.map((r) => (
          <label key={r.id} className="flex items-center gap-1.5 text-sm" title={r.description ?? ""}>
            <input type="checkbox" name="role_ids" value={r.id} defaultChecked={current.includes(r.id)} className="size-4 accent-[var(--color-brand)]" />
            {r.name}
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" size="sm" disabled={pending}>עדכון</Button>
        {!self && <span className="text-xs text-ink-soft">ביטול כל התפקידים מסיר את הגישה לניהול</span>}
        <Result state={state} />
      </div>
    </form>
  );
}
