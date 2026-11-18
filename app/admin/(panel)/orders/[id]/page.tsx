import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderNoteForm, OrderStatusForm } from "@/components/admin/order-actions";
import { PrintButton } from "@/components/admin/print-button";
import { RefundForm } from "@/components/admin/small-forms";
import { AdminHeader, Badge, Card } from "@/components/admin/ui";
import { StoreImage } from "@/components/shared/store-image";
import { buttonClass } from "@/components/ui/button";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/features/orders/queries";
import { can, requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "הזמנה" };
const UUID = /^[0-9a-f-]{36}$/i;
const EVENT_LABELS: Record<string, string> = {
  created: "ההזמנה נוצרה",
  paid: "התשלום אושר",
  cancelled: "ההזמנה בוטלה",
  status_changed: "הסטטוס עודכן",
  note: "הערה פנימית",
  payment_amount_mismatch: "אי־התאמה בסכום התשלום",
  paid_after_cancellation: "תשלום התקבל לאחר ביטול. נדרש החזר",
  refunded: "נרשם החזר כספי",
};
const REASONS: Record<string, string> = { expired: "פג תוקף שמירת המלאי", payment_failed: "התשלום נכשל", superseded: "הוחלפה בהזמנה חדשה", cancelled_by_admin: "בוטלה ידנית" };

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const admin = await requireAdmin("orders.view");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const db = await createSessionClient();
  const { data: order } = await db
    .from("orders")
    .select("*, items:order_items(*), address:order_addresses(*), events:order_events(*), payments(*), refunds(*)")
    .eq("id", id)
    .maybeSingle();
  if (!order) notFound();
  const address = order.address[0];
  const refunded = order.refunds.filter((r) => r.status === "succeeded").reduce((s, r) => s + Number(r.amount), 0);
  const canRefund = can(admin, "orders.manage") && ["paid", "partially_refunded"].includes(order.payment_status) && order.total - refunded > 0;
  const events = [...order.events].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <>
      <AdminHeader title={`הזמנה ${order.order_number}`} description={formatDate(order.placed_at, true)} back={{ href: "/admin/orders", label: "הזמנות" }}>
        <Badge tone={order.payment_status === "paid" ? "success" : order.payment_status === "failed" ? "danger" : "neutral"}>תשלום: {PAYMENT_STATUS_LABELS[order.payment_status]}</Badge>
        <Badge tone={order.status === "cancelled" ? "danger" : "info"}>{ORDER_STATUS_LABELS[order.status]}</Badge>
        <PrintButton label="הדפסה / מסמך אריזה" />
        <Link href={`/order/${order.public_token}`} target="_blank" className={buttonClass("outline", "sm", "print:hidden")}>
          עמוד הלקוח
        </Link>
      </AdminHeader>

      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-2 font-bold">מוצרים</h2>
            <ul className="divide-y divide-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3">
                  <span className="relative block h-16 w-13 shrink-0 overflow-hidden rounded-md bg-sand">
                    <StoreImage src={item.image_url} alt="" fill sizes="52px" className="object-cover" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{item.product_name}</p>
                    <p className="text-sm text-ink-soft">
                      {item.variant_name && `${item.variant_name} · `}
                      <span dir="ltr">{item.sku}</span>
                    </p>
                  </div>
                  <p className="text-sm tabular-nums text-ink-soft">
                    {item.quantity} × {formatPrice(item.unit_price)}
                  </p>
                  <p className="w-20 text-end font-semibold tabular-nums">{formatPrice(item.line_total)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">סכום ביניים</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discount_total > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">הנחה {[order.promotion_name, order.coupon_code].filter(Boolean).join(" + ")}</dt>
                  <dd className="tabular-nums">−{formatPrice(order.discount_total)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">{order.shipping_method_name}</dt>
                <dd className="tabular-nums">{formatPrice(order.shipping_total)}</dd>
              </div>
              <div className="flex justify-between pt-1 text-base font-bold">
                <dt>סה״כ</dt>
                <dd className="tabular-nums">{formatPrice(order.total)}</dd>
              </div>
              <div className="flex justify-between text-xs text-ink-soft">
                <dt>מתוכו מע״מ ({order.vat_rate}%)</dt>
                <dd className="tabular-nums">{formatPrice(order.vat_amount)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5 print:hidden">
            <h2 className="mb-3 font-bold">יומן פעילות</h2>
            <ol className="space-y-3 text-sm">
              {events.map((ev) => {
                const data = (ev.data ?? {}) as Record<string, string>;
                return (
                  <li key={ev.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-gold" />
                    <div>
                      <p className="font-semibold">
                        {EVENT_LABELS[ev.type] ?? ev.type}
                        {ev.type === "status_changed" && `: ${ORDER_STATUS_LABELS[data.from]} ← ${ORDER_STATUS_LABELS[data.to]}`}
                        {ev.type === "cancelled" && data.reason && ` (${REASONS[data.reason] ?? data.reason})`}
                      </p>
                      {ev.type === "note" && <p className="whitespace-pre-wrap">{data.text}</p>}
                      {ev.type === "refunded" && (
                        <p>
                          {formatPrice(Number(data.amount))}
                          {data.reason && ` · ${data.reason}`}
                          {String(data.restock) === "true" && " · הוחזר למלאי"}
                        </p>
                      )}
                      <p className="text-xs text-ink-soft">{formatDate(ev.created_at, true)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            {can(admin, "orders.manage") && (
              <div className="mt-5 border-t border-line pt-4">
                <OrderNoteForm orderId={order.id} />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          {can(admin, "orders.manage") && (
            <Card className="p-5 print:hidden">
              <h2 className="mb-3 font-bold">טיפול בהזמנה</h2>
              <OrderStatusForm orderId={order.id} status={order.status} tracking={order.tracking_number} />
            </Card>
          )}
          {canRefund && (
            <Card className="p-5 print:hidden">
              <h2 className="mb-3 font-bold">החזר כספי / החזרת מוצר</h2>
              {refunded > 0 && <p className="mb-2 text-sm text-ink-soft">הוחזרו עד כה: {formatPrice(refunded)}</p>}
              <RefundForm orderId={order.id} remaining={Math.round((order.total - refunded) * 100) / 100} />
            </Card>
          )}
          <Card className="space-y-1 p-5 text-sm">
            <h2 className="mb-2 text-base font-bold">לקוח</h2>
            <Link href={`/admin/customers/${encodeURIComponent(order.customer_email)}`} className="font-semibold hover:text-brand">{order.customer_name}</Link>
            <p dir="ltr" className="text-end">
              <a href={`mailto:${order.customer_email}`} className="hover:text-brand">
                {order.customer_email}
              </a>
            </p>
            <p dir="ltr" className="text-end">
              <a href={`tel:${order.customer_phone}`} className="hover:text-brand">
                {order.customer_phone}
              </a>
            </p>
            {order.customer_type === "business" && (
              <p className="text-ink-soft">
                לקוח עסקי · {order.company_name} {order.company_number && `· ח.פ. ${order.company_number}`}
              </p>
            )}
            {order.customer_note && <p className="mt-2 rounded-lg bg-sand p-3">הערת לקוח: {order.customer_note}</p>}
          </Card>
          <Card className="space-y-1 p-5 text-sm">
            <h2 className="mb-2 text-base font-bold">אספקה</h2>
            <p className="font-semibold">{order.shipping_method_name}</p>
            {address ? (
              <>
                <p>
                  {address.street} {address.house_number}
                  {address.apartment && `, דירה ${address.apartment}`}
                </p>
                <p>
                  {address.city} {address.zip}
                </p>
                {address.notes && <p className="text-ink-soft">{address.notes}</p>}
              </>
            ) : (
              <p className="text-ink-soft">ללא כתובת (איסוף עצמי)</p>
            )}
          </Card>
          <Card className="space-y-2 p-5 text-sm print:hidden">
            <h2 className="text-base font-bold">תשלומים</h2>
            {order.payments.length === 0 && <p className="text-ink-soft">לא נרשמו תשלומים</p>}
            {order.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <span>
                  {p.provider} <span dir="ltr" className="text-ink-soft">{p.provider_ref}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums">{formatPrice(p.amount)}</span>
                  <Badge tone={p.status === "succeeded" ? "success" : "danger"}>{p.status === "succeeded" ? "אושר" : "נכשל"}</Badge>
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
