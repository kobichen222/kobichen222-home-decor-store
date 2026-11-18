import Link from "next/link";
import { AdminHeader, Badge, Empty, TableWrap } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "הצעות מחיר" };
const QUOTE_STATUS: Record<string, [string, "neutral" | "info" | "success" | "danger" | "warning"]> = {
  draft: ["טיוטה", "neutral"], sent: ["נשלחה", "info"], accepted: ["אושרה", "success"], rejected: ["נדחתה", "danger"], expired: ["פג תוקף", "warning"],
};

export default async function QuotesPage() {
  await requireAdmin("orders.manage");
  const db = await createSessionClient();
  const { data: quotes } = await db
    .from("business_quotes")
    .select("id, quote_number, customer_name, company_name, total, status, valid_until, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return (
    <>
      <AdminHeader title="הצעות מחיר" description="הצעות ללקוחות עסקיים ולהזמנות בכמויות.">
        <Link href="/admin/quotes/new" className={buttonClass("primary", "md")}>+ הצעה חדשה</Link>
      </AdminHeader>
      {!quotes?.length ? (
        <Empty>עדיין אין הצעות מחיר</Empty>
      ) : (
        <TableWrap>
          <thead><tr><th>מספר</th><th>לקוח</th><th>סכום</th><th>סטטוס</th><th>בתוקף עד</th><th>נוצרה</th></tr></thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id} className="relative hover:bg-sand/40">
                <td><Link href={`/admin/quotes/${q.id}`} className="font-bold text-brand after:absolute after:inset-0">{q.quote_number}</Link></td>
                <td>{q.customer_name}{q.company_name && <span className="text-ink-soft"> · {q.company_name}</span>}</td>
                <td className="font-semibold tabular-nums">{formatPrice(q.total)}</td>
                <td><Badge tone={QUOTE_STATUS[q.status]?.[1]}>{QUOTE_STATUS[q.status]?.[0] ?? q.status}</Badge></td>
                <td className="text-ink-soft">{q.valid_until ? formatDate(q.valid_until) : "—"}</td>
                <td className="text-ink-soft">{formatDate(q.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
