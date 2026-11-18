"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { requestBusinessAccount, submitBusinessProject } from "@/features/account/business-actions";

/** Shrinks photos to at most 1600px / JPEG before upload (keeps requests small). */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    return blob ? new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export function BusinessProjectForm() {
  const [state, action, pending] = React.useActionState(submitBusinessProject, null);
  const e = state?.errors ?? {};
  if (state?.ok) return <p role="status" className="rounded-2xl bg-success/10 p-6 text-lg font-semibold text-success">תודה! קיבלנו את פרטי הפרויקט. מעצב מטעמנו יחזור אליכם בהקדם.</p>;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <Field label="שם מלא" htmlFor="b-name" required error={e.full_name}><Input id="b-name" name="full_name" autoComplete="name" required /></Field>
      <Field label="טלפון" htmlFor="b-phone" required error={e.phone}><Input id="b-phone" name="phone" type="tel" dir="ltr" className="text-end" required /></Field>
      <Field label="דוא״ל" htmlFor="b-email" error={e.email}><Input id="b-email" name="email" type="email" dir="ltr" className="text-end" /></Field>
      <Field label="שם העסק" htmlFor="b-company"><Input id="b-company" name="company" autoComplete="organization" /></Field>
      <Field label="סוג העסק" htmlFor="b-type" required error={e.business_type}>
        <Select id="b-type" name="business_type" defaultValue="">
          <option value="" disabled>בחירה</option>
          {["משרד", "חנות", "מסעדה / בית קפה", "קליניקה", "מלון / צימר", "חדר ישיבות", "אחר"].map((t) => <option key={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="גודל החלל (מ״ר)" htmlFor="b-size"><Input id="b-size" name="space_size" inputMode="numeric" /></Field>
      <Field label="תקציב משוער" htmlFor="b-budget">
        <Select id="b-budget" name="budget" defaultValue="">
          <option value="">לא ידוע</option>
          {["עד 5,000 ₪", "5,000–15,000 ₪", "15,000–50,000 ₪", "מעל 50,000 ₪"].map((t) => <option key={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="תאריך יעד" htmlFor="b-date"><Input id="b-date" name="target_date" type="date" dir="ltr" /></Field>
      <Field label="מוצרים מבוקשים" htmlFor="b-products" className="sm:col-span-2" hint="לדוגמה: 6 תמונות קיר, שעון גדול, שילוט לכניסה"><Textarea id="b-products" name="products" rows={2} maxLength={1500} /></Field>
      <Field label="פרטים נוספים" htmlFor="b-message" className="sm:col-span-2"><Textarea id="b-message" name="message" rows={3} maxLength={3000} /></Field>
      <Field label="תמונות של החלל (עד 3, לא חובה)" htmlFor="b-photos" className="sm:col-span-2" hint="JPG, PNG או WebP. התמונות מוקטנות אוטומטית לפני השליחה">
        <input
          id="b-photos"
          name="photos"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={async (ev) => {
            const input = ev.currentTarget;
            const files = await Promise.all(Array.from(input.files ?? []).slice(0, 3).map(shrink));
            const dt = new DataTransfer();
            files.forEach((f) => dt.items.add(f));
            input.files = dt.files;
          }}
          className="block w-full text-sm file:me-3 file:rounded-full file:border-0 file:bg-sand file:px-4 file:py-2 file:font-semibold" />
      </Field>
      {state?.message && <p role="alert" className="text-sm font-semibold text-danger sm:col-span-2">{state.message}</p>}
      <div className="sm:col-span-2"><Button type="submit" size="lg" disabled={pending}>{pending ? "שולח…" : "שליחת פרטי הפרויקט"}</Button></div>
    </form>
  );
}

export function BusinessAccountForm() {
  const [state, action, pending] = React.useActionState(requestBusinessAccount, null);
  const e = state?.errors ?? {};
  if (state?.ok) return <p role="status" className="font-semibold text-success">{state.message}</p>;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="שם החברה" htmlFor="ba-company" error={e.company_name}><Input id="ba-company" name="company_name" /></Field>
      <Field label="ח.פ. / עוסק מורשה" htmlFor="ba-number" error={e.company_number}><Input id="ba-number" name="company_number" inputMode="numeric" dir="ltr" className="text-end" /></Field>
      {state?.message && <p role="alert" className="text-sm font-semibold text-danger sm:col-span-2">{state.message}</p>}
      <div className="sm:col-span-2"><Button type="submit" variant="outline" disabled={pending}>שליחת בקשה לחשבון עסקי</Button></div>
    </form>
  );
}
