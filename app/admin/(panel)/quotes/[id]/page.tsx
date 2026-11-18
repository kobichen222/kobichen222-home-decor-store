import { notFound } from "next/navigation";
import { Notice } from "@/components/admin/notice";
import { QuoteForm } from "@/components/admin/quote-form";
import { AdminHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { deleteQuote } from "@/features/admin/backoffice-actions";
import { variantOptions } from "@/features/admin/variant-options";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "הצעת מחיר" };

export default async function QuotePage({ params, searchParams }: PageProps<"/admin/quotes/[id]">) {
  await requireAdmin("orders.manage");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const db = await createSessionClient();
  const variants = await variantOptions();
  const isNew = id === "new";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: quote } = isNew
    ? { data: null }
    : await db.from("business_quotes").select("*, items:business_quote_items(variant_id, description, quantity, unit_price, sort_order)").eq("id", id).maybeSingle();
  if (!isNew && !quote) notFound();
  // "New quote" from a lead pre-fills the customer.
  let prefill = undefined;
  if (isNew && typeof sp.lead === "string" && /^[0-9a-f-]{36}$/i.test(sp.lead)) {
    const { data: lead } = await db.from("leads").select("id, full_name, email, phone").eq("id", sp.lead).maybeSingle();
    if (lead) prefill = { lead_id: lead.id, customer_name: lead.full_name, email: lead.email, phone: lead.phone };
  }
  const items = quote ? [...quote.items].sort((a, b) => a.sort_order - b.sort_order) : [];
  return (
    <>
      <div className="print:hidden">
        <AdminHeader title={quote ? `הצעת מחיר ${quote.quote_number}` : "הצעת מחיר חדשה"} back={{ href: "/admin/quotes", label: "הצעות מחיר" }} />
      </div>
      <div className="hidden print:block print:mb-6">
        <p className="text-2xl font-bold">הצעת מחיר {quote?.quote_number}</p>
        {quote && <p className="text-sm">תאריך: {formatDate(quote.created_at)}</p>}
      </div>
      {sp.saved && <div className="print:hidden"><Notice>ההצעה נשמרה.</Notice></div>}
      <div className="max-w-5xl">
        <QuoteForm key={String(sp.saved ?? "")} quote={quote ? { ...quote, items } : null} variants={variants} prefill={prefill} />
        {quote && (
          <form action={deleteQuote} className="mt-4 print:hidden">
            <input type="hidden" name="id" value={quote.id} />
            <Button type="submit" variant="ghost" size="sm" className="text-danger hover:bg-danger/10">מחיקת ההצעה</Button>
          </form>
        )}
      </div>
    </>
  );
}
