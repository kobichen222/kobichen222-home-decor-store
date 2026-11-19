import { CheckCircle2, Clock, Mail, MessageCircle, Phone, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StoreImage } from "@/components/shared/store-image";
import { CartCleared } from "@/components/store/cart-context";
import { OrderProgress } from "@/components/store/order-progress";
import { getStoreSettings } from "@/features/cms/queries";
import { buttonClass } from "@/components/ui/button";
import { getOrderByToken, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/features/orders/queries";
import { isMockPayments } from "@/lib/payments";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "פרטי הזמנה", robots: { index: false, follow: false } };

async function Order({ params }: PageProps<"/order/[token]">) {
  const { token } = await params;
  const [order, { business }] = await Promise.all([getOrderByToken(token), getStoreSettings()]);
  if (!order) notFound();

  const paid = order.payment_status === "paid" && order.status !== "cancelled";
  const pending = order.status === "pending_payment";
  const Icon = paid ? CheckCircle2 : pending ? Clock : XCircle;
  const address = order.address?.[0];

  return (
    <div className="mx-auto max-w-3xl">
      {order.payment_status !== "failed" && <CartCleared />}
      <div className="rounded-3xl bg-sand px-5 py-10 text-center sm:px-10">
        <span className={`mx-auto grid size-20 place-items-center rounded-full bg-cream motion-safe:animate-[rise_.7s_var(--ease-out-soft)_both] ${paid ? "text-success" : pending ? "text-gold" : "text-danger"}`}>
          <Icon className="size-11" strokeWidth={1.4} />
        </span>
        <h1 className="mt-5 text-3xl font-bold sm:text-4xl">
          {paid ? "תודה! ההזמנה התקבלה" : pending ? "ההזמנה ממתינה לתשלום" : order.payment_status === "failed" ? "התשלום לא הושלם" : "ההזמנה בוטלה"}
        </h1>
        <p className="mt-2 text-lg text-ink-soft">
          הזמנה מספר <strong className="text-ink tabular-nums" data-testid="order-number">{order.order_number}</strong> · {formatDate(order.placed_at, true)}
        </p>
        {paid && <p className="mt-1 text-ink-soft">אישור נשלח אליכם בדוא״ל. בעמוד הזה אפשר לעקוב אחרי ההזמנה בכל רגע.</p>}
        {order.payment_status === "failed" && (
          <p className="mt-1 text-ink-soft">לא בוצע חיוב. המוצרים עדיין בסל שלכם ואפשר לנסות שוב.</p>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-sand px-4 py-1.5 text-sm font-semibold" data-testid="order-status">
            סטטוס: {ORDER_STATUS_LABELS[order.status]}
          </span>
          <span className="rounded-full bg-sand px-4 py-1.5 text-sm font-semibold" data-testid="payment-status">
            תשלום: {PAYMENT_STATUS_LABELS[order.payment_status]}
          </span>
          {order.tracking_number && (
            <span className="rounded-full bg-sand px-4 py-1.5 text-sm font-semibold">מספר מעקב: {order.tracking_number}</span>
          )}
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {pending && isMockPayments() && (
            <Link href={`/checkout/pay/${order.public_token}`} className={buttonClass("primary", "md")}>
              המשך לתשלום
            </Link>
          )}
          {order.payment_status === "failed" && (
            <Link href="/checkout" className={buttonClass("primary", "md")}>
              חזרה לקופה
            </Link>
          )}
          <Link href="/shop" className={buttonClass("outline", "md")}>
            המשך קנייה
          </Link>
        </div>
      </div>

      {paid && (
        <div className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-7">
          <h2 className="mb-6 text-lg font-bold">מה קורה עכשיו?</h2>
          <OrderProgress status={order.status} pickup={!address} />
          <ul className="mt-7 grid gap-3 text-sm text-ink-soft sm:grid-cols-3">
            <li className="rounded-xl bg-sand/60 p-4">
              <strong className="block text-ink">אנחנו מכינים את ההזמנה</strong>
              כל פריט נבדק ונארז בקפידה לפני היציאה.
            </li>
            <li className="rounded-xl bg-sand/60 p-4">
              <strong className="block text-ink">{address ? "עדכון כשהיא בדרך" : "הודעה כשהיא מוכנה"}</strong>
              {address ? "נשלח לכם הודעה עם מספר מעקב ברגע שהמשלוח יוצא." : "נודיע לכם ברגע שאפשר לבוא לאסוף."}
            </li>
            <li className="rounded-xl bg-sand/60 p-4">
              <strong className="block text-ink">שאלה? אנחנו כאן</strong>
              מענה אישי בטלפון, בוואטסאפ או במייל.
            </li>
          </ul>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-white p-5 sm:p-7">
        <h2 className="text-lg font-bold">פירוט ההזמנה</h2>
        <ul className="mt-3 divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 py-3.5">
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-sand">
                <StoreImage src={item.image_url} alt="" fill sizes="64px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.product_name}</p>
                <p className="text-sm text-ink-soft">
                  {item.variant_name && `${item.variant_name} · `}
                  {item.quantity} × {formatPrice(item.unit_price)}
                </p>
              </div>
              <p className="font-semibold tabular-nums">{formatPrice(item.line_total)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">סכום ביניים</dt>
            <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
          </div>
          {order.discount_total > 0 && (
            <div className="flex justify-between text-success">
              <dt>הנחה{order.coupon_code && ` (${order.coupon_code})`}</dt>
              <dd className="tabular-nums">−{formatPrice(order.discount_total)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-soft">{order.shipping_method_name}</dt>
            <dd className="tabular-nums">{order.shipping_total > 0 ? formatPrice(order.shipping_total) : "חינם"}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-lg font-bold">
            <dt>סה״כ</dt>
            <dd className="tabular-nums" data-testid="order-total">{formatPrice(order.total)}</dd>
          </div>
          <p className="text-xs text-ink-soft">
            כולל מע״מ ({order.vat_rate}%): {formatPrice(order.vat_amount)}
          </p>
        </dl>
        {address && (
          <div className="mt-5 border-t border-line pt-5 text-sm">
            <h3 className="font-bold">כתובת לאספקה</h3>
            <p className="mt-1 text-ink-soft">
              {address.full_name} · {address.street} {address.house_number}
              {address.apartment && `, דירה ${address.apartment}`}, {address.city} {address.zip}
            </p>
          </div>
        )}
      </div>

      {(business.phone || business.whatsapp || business.email) && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="text-ink-soft">צריכים עזרה עם ההזמנה?</span>
          {business.phone && (
            <a href={`tel:${business.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 font-semibold">
              <Phone className="size-4" strokeWidth={1.7} /> {business.phone}
            </a>
          )}
          {business.whatsapp && (
            <a href={`https://wa.me/${business.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 font-semibold">
              <MessageCircle className="size-4" strokeWidth={1.7} /> וואטסאפ
            </a>
          )}
          {business.email && (
            <a href={`mailto:${business.email}`} className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 font-semibold">
              <Mail className="size-4" strokeWidth={1.7} /> מייל
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrderPage(props: PageProps<"/order/[token]">) {
  return (
    <div className="container-page py-12">
      <Suspense fallback={<div className="mx-auto h-96 max-w-3xl animate-pulse rounded-2xl bg-sand" />}>
        <Order {...props} />
      </Suspense>
    </div>
  );
}
