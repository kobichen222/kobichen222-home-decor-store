"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { addCustomerNote, recordRefund } from "@/features/admin/backoffice-actions";
import { formatPrice } from "@/lib/utils";

export function CustomerNoteForm({ email }: { email: string }) {
  const [state, action, pending] = React.useActionState(addCustomerNote, null);
  // A successful submit lets React reset the form (the default for form
  // actions); a failed one keeps the text by re-rendering it as the default.
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="email" value={email} />
      <Textarea name="note" rows={2} placeholder="הערת שירות פנימית" aria-label="הערת שירות" required />
      {state?.message && <p className="text-sm font-semibold text-danger">{state.message}</p>}
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        הוספת הערה
      </Button>
    </form>
  );
}

export function RefundForm({ orderId, remaining }: { orderId: string; remaining: number }) {
  const [state, action, pending] = React.useActionState(recordRefund, null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("לרשום את ההחזר? יש לבצע את ההחזר הכספי עצמו במערכת חברת הסליקה.")) e.preventDefault();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="id" value={orderId} />
      <Field label={`סכום להחזר (עד ${formatPrice(remaining)})`} htmlFor="amount">
        <Input id="amount" name="amount" type="number" step="0.01" min="0.01" max={remaining} defaultValue={remaining} dir="ltr" required />
      </Field>
      <Field label="סיבה" htmlFor="reason">
        <Input id="reason" name="reason" maxLength={300} />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="restock" className="mt-0.5 size-4 accent-[var(--color-brand)]" />
        המוצרים הוחזרו: להחזיר אותם למלאי
      </label>
      {state?.message && (
        <p role="status" className={`text-sm font-semibold ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit" variant="outline" className="w-full" disabled={pending}>
        רישום החזר
      </Button>
      <p className="text-xs text-ink-soft">הרישום מעדכן את ההזמנה, הדוחות והמלאי. הכסף עצמו מוחזר דרך חברת הסליקה.</p>
    </form>
  );
}
