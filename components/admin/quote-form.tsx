"use client";
import { Plus, Printer, Trash2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveQuote } from "@/features/admin/backoffice-actions";
import { useFormAction } from "@/lib/use-form-action";
import { formatPrice } from "@/lib/utils";
import { Card } from "./ui";

type Line = { key: number; variant_id: string; description: string; quantity: string; unit_price: string };
type Quote = {
  id: string; customer_name: string | null; company_name: string | null; email: string | null; phone: string | null;
  status: string; valid_until: string | null; notes: string | null; lead_id: string | null;
  items: { variant_id: string | null; description: string; quantity: number; unit_price: number }[];
};
export type VariantOption = { id: string; label: string; price: number };

const STATUSES = [
  ["draft", "טיוטה"], ["sent", "נשלחה ללקוח"], ["accepted", "אושרה"], ["rejected", "נדחתה"], ["expired", "פג תוקף"],
] as const;
let n = 0;

export function QuoteForm({ quote, variants, prefill }: { quote: Quote | null; variants: VariantOption[]; prefill?: Partial<Quote> }) {
  const action = React.useMemo(() => saveQuote.bind(null, quote?.id ?? null), [quote?.id]);
  const { state, pending, onSubmit } = useFormAction(action);
  const src = quote ?? prefill ?? null;
  const [lines, setLines] = React.useState<Line[]>(() =>
    quote?.items.length
      ? quote.items.map((i) => ({ key: ++n, variant_id: i.variant_id ?? "", description: i.description, quantity: String(i.quantity), unit_price: String(i.unit_price) }))
      : [{ key: ++n, variant_id: "", description: "", quantity: "1", unit_price: "" }],
  );
  const patch = (key: number, c: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...c } : l)));
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0);
  const e = state?.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <input type="hidden" name="items" value={JSON.stringify(lines.map((l) => ({ variant_id: l.variant_id, description: l.description, quantity: l.quantity, unit_price: l.unit_price })))} />
      <input type="hidden" name="lead_id" value={src?.lead_id ?? ""} />
      {state?.message && <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger print:hidden" role="alert">{state.message}</p>}
      <Card className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <Field label="שם הלקוח" htmlFor="customer_name" required error={e.customer_name}>
          <Input id="customer_name" name="customer_name" defaultValue={src?.customer_name ?? ""} />
        </Field>
        <Field label="חברה" htmlFor="company_name"><Input id="company_name" name="company_name" defaultValue={src?.company_name ?? ""} /></Field>
        <Field label="דוא״ל" htmlFor="email" error={e.email}><Input id="email" name="email" type="email" dir="ltr" defaultValue={src?.email ?? ""} /></Field>
        <Field label="טלפון" htmlFor="phone"><Input id="phone" name="phone" dir="ltr" defaultValue={src?.phone ?? ""} /></Field>
        <Field label="סטטוס" htmlFor="status">
          <Select id="status" name="status" defaultValue={quote?.status ?? "draft"}>
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
        <Field label="בתוקף עד" htmlFor="valid_until"><Input id="valid_until" name="valid_until" type="date" dir="ltr" defaultValue={quote?.valid_until ?? ""} /></Field>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 font-bold">פריטים</h2>
        <div className="space-y-3">
          {lines.map((l, i) => (
            <div key={l.key} className="grid gap-2 rounded-xl border border-line p-3 sm:grid-cols-[2fr_3fr_5rem_7rem_auto] sm:items-end">
              <Field label="מוצר מהקטלוג" className="print:hidden">
                <Select
                  value={l.variant_id}
                  aria-label={`מוצר שורה ${i + 1}`}
                  onChange={(ev) => {
                    const v = variants.find((x) => x.id === ev.target.value);
                    patch(l.key, { variant_id: ev.target.value, ...(v ? { description: v.label, unit_price: String(v.price) } : {}) });
                  }}
                >
                  <option value="">פריט חופשי</option>
                  {variants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                </Select>
              </Field>
              <Field label="תיאור"><Input value={l.description} onChange={(ev) => patch(l.key, { description: ev.target.value })} aria-label={`תיאור שורה ${i + 1}`} /></Field>
              <Field label="כמות"><Input type="number" min="1" value={l.quantity} onChange={(ev) => patch(l.key, { quantity: ev.target.value })} dir="ltr" aria-label={`כמות שורה ${i + 1}`} /></Field>
              <Field label="מחיר ליחידה"><Input type="number" min="0" step="0.01" value={l.unit_price} onChange={(ev) => patch(l.key, { unit_price: ev.target.value })} dir="ltr" aria-label={`מחיר שורה ${i + 1}`} /></Field>
              <button type="button" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))} className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-danger/10 hover:text-danger print:hidden" aria-label="הסרת שורה">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={() => setLines((ls) => [...ls, { key: ++n, variant_id: "", description: "", quantity: "1", unit_price: "" }])}>
            <Plus className="size-4" /> הוספת שורה
          </Button>
          <p className="text-lg font-bold">סה״כ (כולל מע״מ): <span className="tabular-nums">{formatPrice(total)}</span></p>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <Field label="הערות ותנאים" htmlFor="notes"><Textarea id="notes" name="notes" rows={4} defaultValue={src?.notes ?? ""} /></Field>
      </Card>
      <div className="flex gap-2 print:hidden">
        <Button type="submit" disabled={pending}>{pending ? "שומר…" : quote ? "שמירת הצעה" : "יצירת הצעה"}</Button>
        {quote && (
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" /> הדפסה / PDF
          </Button>
        )}
      </div>
    </form>
  );
}
