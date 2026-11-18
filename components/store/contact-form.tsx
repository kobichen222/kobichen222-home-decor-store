"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { submitContact } from "@/features/cms/actions";

export function ContactForm() {
  const [state, action, pending] = React.useActionState(submitContact, null);
  if (state?.ok) return <p role="status" className="font-semibold text-success">תודה! קיבלנו את הפנייה ונחזור אליכם בהקדם.</p>;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {/* honeypot: real visitors never see or fill this */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <Field label="שם מלא" htmlFor="c-name" required><Input id="c-name" name="name" autoComplete="name" required /></Field>
      <Field label="טלפון" htmlFor="c-phone" required><Input id="c-phone" name="phone" type="tel" dir="ltr" className="text-end" autoComplete="tel" required /></Field>
      <Field label="דוא״ל" htmlFor="c-email"><Input id="c-email" name="email" type="email" dir="ltr" className="text-end" autoComplete="email" /></Field>
      <Field label="נושא" htmlFor="c-kind">
        <Select id="c-kind" name="kind" defaultValue="contact">
          <option value="contact">שאלה כללית</option>
          <option value="quote">הצעת מחיר / הזמנה בכמות</option>
          <option value="business_project">פרויקט עיצוב לעסק</option>
        </Select>
      </Field>
      <Field label="הודעה" htmlFor="c-message" className="sm:col-span-2"><Textarea id="c-message" name="message" rows={4} maxLength={2000} /></Field>
      {state?.error && <p className="text-sm font-semibold text-danger sm:col-span-2" role="alert">{state.error}</p>}
      <div className="sm:col-span-2"><Button type="submit" disabled={pending}>{pending ? "שולח…" : "שליחה"}</Button></div>
    </form>
  );
}
