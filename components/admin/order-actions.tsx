"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { addOrderNote, setOrderStatus } from "@/features/admin/catalog-actions";

const NEXT: [string, string][] = [
  ["processing", "בטיפול"],
  ["preparing", "בהכנה"],
  ["ready_to_ship", "מוכנה למשלוח"],
  ["shipped", "נשלחה"],
  ["delivered", "נמסרה"],
  ["returned", "הוחזרה"],
  ["cancelled", "בוטלה"],
];

export function OrderStatusForm({ orderId, status, tracking }: { orderId: string; status: string; tracking: string | null }) {
  const [state, action, pending] = React.useActionState(setOrderStatus, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <Field label="סטטוס טיפול" htmlFor="status">
        <Select id="status" name="status" key={status} defaultValue={NEXT.some(([v]) => v === status) ? status : "processing"}>
          {NEXT.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="מספר מעקב" htmlFor="tracking">
        <Input id="tracking" name="tracking" defaultValue={tracking ?? ""} dir="ltr" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="notify" defaultChecked className="size-4 accent-[var(--color-brand)]" />
        לשלוח עדכון ללקוח בדוא״ל (נשלחה / נמסרה / מוכנה / בוטלה)
      </label>
      {state?.message && (
        <p role="status" className={`text-sm font-semibold ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "מעדכן…" : "עדכון הזמנה"}
      </Button>
    </form>
  );
}

export function OrderNoteForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = React.useActionState(addOrderNote, null);
  const ref = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="id" value={orderId} />
      <Textarea name="note" rows={2} placeholder="הערה פנימית (לא מוצגת ללקוח)" aria-label="הערה פנימית" required />
      {state?.message && !state.ok && <p className="text-sm font-semibold text-danger">{state.message}</p>}
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        הוספת הערה
      </Button>
    </form>
  );
}
