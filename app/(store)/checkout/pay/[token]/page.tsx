import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { simulatePayment } from "@/features/checkout/actions";
import { getOrderByToken } from "@/features/orders/queries";
import { isMockPayments } from "@/lib/payments";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "תשלום (סימולציה)", robots: { index: false } };

// Stand-in for the clearing provider's hosted payment page. It exists only
// while PAYMENT_PROVIDER=mock and is replaced by the real provider in stage 7.
async function Pay({ params }: PageProps<"/checkout/pay/[token]">) {
  if (!isMockPayments()) notFound();
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) notFound();
  if (order.status !== "pending_payment") redirect(`/order/${token}`);
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-7 text-center">
      <p className="inline-block rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-brand">סביבת בדיקות · לא מתבצע חיוב</p>
      <h1 className="mt-4 text-2xl font-bold">תשלום להזמנה {order.order_number}</h1>
      <p className="mt-2 text-4xl font-bold tabular-nums">{formatPrice(order.total)}</p>
      <p className="mt-3 text-sm text-ink-soft">
        זהו עמוד סימולציה שמחליף את עמוד התשלום של חברת הסליקה עד לחיבור ספק סליקה אמיתי.
      </p>
      <form action={simulatePayment} className="mt-7 grid gap-2.5">
        <input type="hidden" name="token" value={token} />
        <Button type="submit" name="outcome" value="success" size="lg">
          סימולציית תשלום מוצלח
        </Button>
        <Button type="submit" name="outcome" value="failure" variant="outline" size="lg">
          סימולציית תשלום שנכשל
        </Button>
      </form>
    </div>
  );
}

export default function PayPage(props: PageProps<"/checkout/pay/[token]">) {
  return (
    <div className="container-page py-14">
      <Suspense fallback={<div className="mx-auto h-72 max-w-md animate-pulse rounded-2xl bg-sand" />}>
        <Pay {...props} />
      </Suspense>
    </div>
  );
}
