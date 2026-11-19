import { AlertTriangle, Banknote, CalendarRange, Clock, PackageOpen, Receipt, ShoppingBag, ShoppingCart, Truck, UserPlus, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { DailyBars } from "@/components/admin/charts";
import { parseRange } from "@/features/admin/report-range";
import { AdminHeader, Badge, Card, TableWrap } from "@/components/admin/ui";
import { ORDER_STATUS_LABELS } from "@/features/orders/queries";
import { can, requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "לוח בקרה" };

// Start of "today" / "this month" in Israel time, as UTC instants.
function israelStart(unit: "day" | "month"): string {
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const offsetHours = (Number(parts.hour) % 24) - now.getUTCHours();
  const offset = ((offsetHours + 36) % 24) - 12;
  const day = unit === "day" ? Number(parts.day) : 1;
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, day, -offset)).toISOString();
}

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin();
  const { denied } = await searchParams;
  const db = await createSessionClient();
  const seeOrders = can(admin, "orders.view");
  const seeStock = can(admin, "inventory.manage", "catalog.manage");

  // Sales = orders whose payment was confirmed and that were not cancelled
  // or returned, counted by payment time. RLS returns nothing to roles
  // without the matching permission.
  const SOLD = ["paid", "processing", "preparing", "ready_to_ship", "shipped", "delivered"] as const;
  const [today, month, fresh, inProgress, done, unpaid, recent, alerts] = await Promise.all([
    seeOrders ? db.from("orders").select("total").in("status", SOLD).gte("paid_at", israelStart("day")) : null,
    seeOrders ? db.from("orders").select("total").in("status", SOLD).gte("paid_at", israelStart("month")) : null,
    seeOrders ? db.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid") : null,
    seeOrders ? db.from("orders").select("id", { count: "exact", head: true }).in("status", ["processing", "preparing", "ready_to_ship"]) : null,
    seeOrders ? db.from("orders").select("id", { count: "exact", head: true }).in("status", ["shipped", "delivered"]) : null,
    seeOrders ? db.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_payment") : null,
    seeOrders
      ? db.from("orders").select("id, order_number, customer_name, total, status, placed_at").neq("status", "pending_payment").order("placed_at", { ascending: false }).limit(6)
      : null,
    seeStock
      ? db.from("stock_alerts").select("id, kind, variant:product_variants(sku, name, product:products(id, name))").is("resolved_at", null).order("created_at", { ascending: false }).limit(8)
      : null,
  ]);
  const seeReports = can(admin, "reports.view", "finance.view");
  const last14 = parseRange({ range: "14" });
  const [report, abandoned, lowStock, customers] = await Promise.all([
    seeReports ? db.rpc("report_sales", { p_from: last14.from, p_to: last14.to }) : null,
    can(admin, "marketing.manage") ? db.rpc("admin_abandoned_carts", { p_hours: 1 }) : null,
    seeStock ? db.from("stock_alerts").select("id", { count: "exact", head: true }).is("resolved_at", null) : null,
    can(admin, "customers.view") ? db.rpc("admin_customers", { p_segment: "new", p_limit: 1 }) : null,
  ]);
  const r14 = report?.data as unknown as { by_day: { day: string; revenue: number; orders: number }[]; aov: number; top_products: { name: string; units: number }[] } | null;
  const sum = (rows: { total: number }[] | null | undefined) => (rows ?? []).reduce((s, r) => s + Number(r.total), 0);
  type Kpi = { label: string; value: React.ReactNode; href?: string; icon: LucideIcon; tone?: "alert" };
  const cards: Kpi[] = seeOrders
    ? [
        { label: "מכירות היום", value: formatPrice(sum(today?.data)), icon: Banknote, href: seeReports ? "/admin/reports" : undefined },
        { label: "מכירות החודש", value: formatPrice(sum(month?.data)), icon: CalendarRange, href: seeReports ? "/admin/reports" : undefined },
        { label: "הזמנות חדשות", value: fresh?.count ?? 0, icon: ShoppingBag, href: "/admin/orders?status=paid", tone: (fresh?.count ?? 0) > 0 ? "alert" : undefined },
        { label: "הזמנות בטיפול", value: inProgress?.count ?? 0, icon: PackageOpen, href: "/admin/orders?status=processing" },
        { label: "נשלחו / נמסרו", value: done?.count ?? 0, icon: Truck, href: "/admin/orders?status=shipped" },
        { label: "ממתינות לתשלום", value: unpaid?.count ?? 0, icon: Clock, href: "/admin/orders?status=pending_payment" },
      ]
    : [];
  if (lowStock) cards.push({ label: "התראות מלאי", value: lowStock.count ?? 0, icon: AlertTriangle, href: "/admin/inventory", tone: (lowStock.count ?? 0) > 0 ? "alert" : undefined });
  if (customers?.data) cards.push({ label: "לקוחות חדשים (30 יום)", value: (customers.data as unknown as { total: number }).total, icon: UserPlus, href: "/admin/customers" });
  if (abandoned?.data) cards.push({ label: "סלים נטושים", value: (abandoned.data as unknown as unknown[]).length, icon: ShoppingCart, href: "/admin/abandoned-carts" });
  if (r14) cards.push({ label: "ממוצע הזמנה (14 יום)", value: formatPrice(r14.aov), icon: Receipt });

  return (
    <>
      <AdminHeader title="לוח בקרה" description={`מחובר/ת כ־${admin.email}`} />
      <MfaReminder />
      {denied && (
        <p className="mb-5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger" role="alert">
          אין לך הרשאה לעמוד שביקשת.
        </p>
      )}
      {cards.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {cards.map(({ label, value, href, icon: Icon, tone }) => {
            const body = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <dt className="text-xs font-semibold text-ink-soft">{label}</dt>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-full ${tone === "alert" ? "bg-gold/25 text-brand-dark" : "bg-sand text-brand"}`}>
                    <Icon className="size-4" strokeWidth={1.8} />
                  </span>
                </div>
                <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
              </>
            );
            return (
              <Card key={label} className="p-0">
                {href ? (
                  <Link href={href} className="block h-full rounded-2xl p-4 transition-colors hover:bg-sand/40">
                    {body}
                  </Link>
                ) : (
                  <div className="p-4">{body}</div>
                )}
              </Card>
            );
          })}
        </dl>
      )}
      {r14 && (
        <Card className="mt-6 p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-bold">מכירות ב־14 הימים האחרונים</h2>
            <Link href="/admin/reports" className="text-sm font-semibold text-brand hover:underline">לדוחות המלאים ←</Link>
          </div>
          <DailyBars data={r14.by_day} label="מכירות יומיות ב־14 הימים האחרונים" />
        </Card>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {seeOrders && (
          <section>
            <h2 className="mb-3 font-bold">הזמנות אחרונות</h2>
            <TableWrap>
              <thead>
                <tr>
                  <th>מספר</th>
                  <th>לקוח</th>
                  <th>תאריך</th>
                  <th>סטטוס</th>
                  <th>סכום</th>
                </tr>
              </thead>
              <tbody>
                {(recent?.data ?? []).map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="font-bold text-brand hover:underline">
                        {o.order_number}
                      </Link>
                    </td>
                    <td>{o.customer_name}</td>
                    <td className="text-ink-soft">{formatDate(o.placed_at, true)}</td>
                    <td>
                      <Badge tone={o.status === "cancelled" ? "danger" : o.status === "paid" ? "info" : "neutral"}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                    </td>
                    <td className="font-semibold tabular-nums">{formatPrice(o.total)}</td>
                  </tr>
                ))}
                {!recent?.data?.length && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-ink-soft">
                      עדיין אין הזמנות
                    </td>
                  </tr>
                )}
              </tbody>
            </TableWrap>
          </section>
        )}
        {seeStock && (
          <section>
            <h2 className="mb-3 font-bold">התראות מלאי</h2>
            <Card className="divide-y divide-line">
              {(alerts?.data ?? []).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <Link href={`/admin/products/${a.variant?.product?.id}`} className="font-semibold hover:text-brand">
                    {a.variant?.product?.name}
                    {a.variant?.name && <span className="font-normal text-ink-soft"> · {a.variant.name}</span>}
                  </Link>
                  <Badge tone={a.kind === "out_of_stock" ? "danger" : "warning"}>{a.kind === "out_of_stock" ? "אזל" : "מלאי נמוך"}</Badge>
                </div>
              ))}
              {!alerts?.data?.length && <p className="px-4 py-10 text-center text-sm text-ink-soft">אין התראות פתוחות</p>}
            </Card>
          </section>
        )}
      </div>
    </>
  );
}

async function MfaReminder() {
  const db = await createSessionClient();
  const { data } = await db.auth.mfa.listFactors();
  if (data?.totp.some((f) => f.status === "verified")) return null;
  return (
    <p className="mb-5 rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-sm">
      מומלץ להפעיל אימות דו־שלבי לחשבון הניהול.{" "}
      <Link href="/admin/security" className="font-semibold text-brand underline">להפעלה</Link>
    </p>
  );
}
