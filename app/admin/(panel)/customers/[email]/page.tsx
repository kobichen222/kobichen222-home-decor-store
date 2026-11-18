import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerNoteForm } from "@/components/admin/small-forms";
import { AdminHeader, Badge, Card, TableWrap } from "@/components/admin/ui";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/features/orders/queries";
import { can, requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "כרטיס לקוח" };

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[email]">) {
  const admin = await requireAdmin("customers.view");
  const email = decodeURIComponent((await params).email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) notFound();
  const db = await createSessionClient();
  const [{ data: summary }, { data: orders }, { data: profile }, { data: notes }] = await Promise.all([
    db.rpc("admin_customers", { p_q: email, p_segment: "all", p_limit: 5, p_offset: 0 }),
    db.from("orders").select("id, order_number, placed_at, total, status, payment_status, customer_type, company_name, company_number, items:order_items(quantity)").ilike("customer_email", email).order("placed_at", { ascending: false }),
    db.from("profiles").select("id, full_name, phone, created_at, marketing_opt_in").ilike("email", email).maybeSingle(),
    db.from("customer_notes").select("id, note, created_at").ilike("email", email).order("created_at", { ascending: false }),
  ]);
  const customer = ((summary as unknown as { items: Record<string, unknown>[] })?.items ?? []).find((c) => c.email === email);
  if (!customer && !orders?.length && !profile) notFound();
  const { data: addresses } = profile
    ? await db.from("customer_addresses").select("id, city, street, house_number, apartment").eq("user_id", profile.id)
    : { data: [] };
  const { data: lastAddress } = orders?.length
    ? await db.from("order_addresses").select("city, street, house_number, apartment, zip").eq("order_id", orders[0].id).maybeSingle()
    : { data: null };
  const paid = (orders ?? []).filter((o) => ["paid", "refunded", "partially_refunded"].includes(o.payment_status));
  const business = (orders ?? []).find((o) => o.customer_type === "business");
  const returns = (orders ?? []).filter((o) => o.status === "returned" || o.payment_status.includes("refunded")).length;

  return (
    <>
      <AdminHeader title={String(customer?.name ?? profile?.full_name ?? email)} description={email} back={{ href: "/admin/customers", label: "לקוחות" }}>
        {profile ? <Badge tone="success">לקוח רשום</Badge> : <Badge>רוכש כאורח</Badge>}
        {business && <Badge tone="info">לקוח עסקי</Badge>}
      </AdminHeader>
      <dl className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["הזמנות ששולמו", paid.length],
          ["סך רכישות", formatPrice(paid.reduce((s, o) => s + Number(o.total), 0))],
          ["הזמנה אחרונה", paid[0] ? formatDate(paid[0].placed_at) : "—"],
          ["החזרות / ביטולי חיוב", returns],
        ].map(([label, value]) => (
          <Card key={String(label)} className="p-4">
            <dt className="text-xs font-semibold text-ink-soft">{label}</dt>
            <dd className="mt-1.5 text-xl font-bold tabular-nums">{value}</dd>
          </Card>
        ))}
      </dl>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="mb-3 font-bold">היסטוריית הזמנות</h2>
          {can(admin, "orders.view") ? (
            <TableWrap>
              <thead>
                <tr><th>מספר</th><th>תאריך</th><th>פריטים</th><th>סכום</th><th>תשלום</th><th>סטטוס</th></tr>
              </thead>
              <tbody>
                {(orders ?? []).map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`} className="font-bold text-brand hover:underline">{o.order_number}</Link></td>
                    <td className="text-ink-soft">{formatDate(o.placed_at, true)}</td>
                    <td className="tabular-nums">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                    <td className="font-semibold tabular-nums">{formatPrice(o.total)}</td>
                    <td><Badge tone={o.payment_status === "paid" ? "success" : "neutral"}>{PAYMENT_STATUS_LABELS[o.payment_status]}</Badge></td>
                    <td>{ORDER_STATUS_LABELS[o.status]}</td>
                  </tr>
                ))}
                {!orders?.length && <tr><td colSpan={6} className="py-8 text-center text-ink-soft">אין הזמנות</td></tr>}
              </tbody>
            </TableWrap>
          ) : (
            <Card className="p-5 text-sm text-ink-soft">צפייה בהזמנות דורשת הרשאת הזמנות.</Card>
          )}
        </section>
        <div className="space-y-5">
          <Card className="space-y-1.5 p-5 text-sm">
            <h2 className="mb-2 text-base font-bold">פרטים</h2>
            <p>טלפון: <span dir="ltr">{String(customer?.phone ?? profile?.phone ?? "—")}</span></p>
            {profile && <p>נרשם: {formatDate(profile.created_at)}</p>}
            <p>דיוור: {customer?.subscribed || profile?.marketing_opt_in ? "רשום/ה לדיוור" : "לא רשום/ה"}</p>
            {business && <p>חברה: {business.company_name} {business.company_number && `· ח.פ. ${business.company_number}`}</p>}
            {lastAddress && <p>כתובת אחרונה: {lastAddress.street} {lastAddress.house_number}{lastAddress.apartment && `/${lastAddress.apartment}`}, {lastAddress.city}</p>}
            {(addresses ?? []).map((a) => (
              <p key={a.id}>כתובת שמורה: {a.street} {a.house_number}, {a.city}</p>
            ))}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-bold">הערות שירות</h2>
            <ul className="mb-4 space-y-2.5 text-sm">
              {(notes ?? []).map((n) => (
                <li key={n.id} className="rounded-lg bg-sand/60 p-3">
                  <p className="whitespace-pre-wrap">{n.note}</p>
                  <p className="mt-1 text-xs text-ink-soft">{formatDate(n.created_at, true)}</p>
                </li>
              ))}
              {!notes?.length && <li className="text-ink-soft">אין הערות</li>}
            </ul>
            {can(admin, "customers.manage") && <CustomerNoteForm email={email} />}
          </Card>
        </div>
      </div>
    </>
  );
}
