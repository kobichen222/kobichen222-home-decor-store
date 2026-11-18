import { siteUrl } from "@/lib/env";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const money = (n: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 }).format(n);

function layout(store: string, title: string, body: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html lang="he" dir="rtl"><body style="margin:0;background:#faf9f6;font-family:Arial,Helvetica,sans-serif;color:#242424">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border:1px solid #e8e5e1;border-radius:16px" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 28px;border-bottom:1px solid #e8e5e1;font-size:22px;font-weight:bold">${esc(store)}<span style="color:#b49a76">.</span></td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.6;text-align:right">
<h1 style="margin:0 0 12px;font-size:22px">${esc(title)}</h1>${body}
${cta ? `<p style="margin:28px 0 0"><a href="${esc(cta.href)}" style="display:inline-block;background:#242424;color:#faf9f6;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e8e5e1;font-size:12px;color:#5b5650">${esc(store)} · ${esc(siteUrl().replace(/^https?:\/\//, ""))}</td></tr>
</table></td></tr></table></body></html>`;
}

export type OrderForEmail = {
  order_number: number; public_token: string; customer_name: string; total: number; shipping_method_name: string;
  tracking_number?: string | null;
  items: { product_name: string; variant_name: string | null; quantity: number; line_total: number }[];
};

function itemsTable(o: OrderForEmail) {
  const rows = o.items
    .map((i) => `<tr><td style="padding:6px 0">${esc(i.product_name)}${i.variant_name ? ` · ${esc(i.variant_name)}` : ""} × ${i.quantity}</td><td style="padding:6px 0;text-align:left">${money(i.line_total)}</td></tr>`)
    .join("");
  return `<table role="presentation" width="100%" style="margin:16px 0;border-top:1px solid #e8e5e1;border-bottom:1px solid #e8e5e1;font-size:14px">${rows}
<tr><td style="padding:10px 0;font-weight:bold">סה״כ</td><td style="padding:10px 0;text-align:left;font-weight:bold">${money(o.total)}</td></tr></table>`;
}

export function orderConfirmation(store: string, o: OrderForEmail) {
  const href = `${siteUrl()}/order/${o.public_token}`;
  return {
    subject: `אישור הזמנה ${o.order_number} · ${store}`,
    html: layout(store, `תודה ${o.customer_name}, ההזמנה התקבלה`, `<p>מספר ההזמנה: <strong>${o.order_number}</strong>. אספקה: ${esc(o.shipping_method_name)}.</p>${itemsTable(o)}<p>נעדכן אתכם כשההזמנה תישלח.</p>`, { label: "מעקב אחר ההזמנה", href }),
    text: `תודה ${o.customer_name}! הזמנה ${o.order_number} התקבלה. סה״כ ${money(o.total)}. מעקב: ${href}`,
  };
}

export function orderStatus(store: string, o: OrderForEmail, statusLabel: string) {
  const href = `${siteUrl()}/order/${o.public_token}`;
  const tracking = o.tracking_number ? `<p>מספר מעקב: <strong>${esc(o.tracking_number)}</strong></p>` : "";
  return {
    subject: `עדכון להזמנה ${o.order_number}: ${statusLabel}`,
    html: layout(store, `ההזמנה שלכם ${statusLabel}`, `<p>שלום ${esc(o.customer_name)}, סטטוס הזמנה <strong>${o.order_number}</strong> עודכן: <strong>${esc(statusLabel)}</strong>.</p>${tracking}`, { label: "לפרטי ההזמנה", href }),
    text: `הזמנה ${o.order_number}: ${statusLabel}. ${o.tracking_number ? `מספר מעקב: ${o.tracking_number}. ` : ""}${href}`,
  };
}

export function adminNewOrder(store: string, o: OrderForEmail, orderId: string) {
  const href = `${siteUrl()}/admin/orders/${orderId}`;
  return {
    subject: `הזמנה חדשה ${o.order_number} · ${money(o.total)}`,
    html: layout(store, `הזמנה חדשה ${o.order_number}`, `<p>${esc(o.customer_name)} · ${esc(o.shipping_method_name)}</p>${itemsTable(o)}`, { label: "פתיחה בניהול", href }),
    text: `הזמנה חדשה ${o.order_number} מ־${o.customer_name}, ${money(o.total)}. ${href}`,
  };
}

export function welcome(store: string, name: string) {
  return {
    subject: `ברוכים הבאים ל${store}`,
    html: layout(store, `שלום ${name}, שמחים שהצטרפתם`, `<p>בחשבון תוכלו לעקוב אחר הזמנות, לשמור כתובות ומוצרים אהובים.</p>`, { label: "לחנות", href: `${siteUrl()}/shop` }),
    text: `שלום ${name}, ברוכים הבאים ל${store}. ${siteUrl()}/shop`,
  };
}

export function abandonedCart(store: string, name: string | null, products: string, couponHint?: string) {
  return {
    subject: `שכחתם משהו בסל · ${store}`,
    html: layout(store, `${name ? `${name}, ` : ""}המוצרים עדיין מחכים לכם`, `<p>שמרנו עבורכם את הסל: ${esc(products)}.</p>${couponHint ? `<p>${esc(couponHint)}</p>` : ""}<p style="font-size:12px;color:#5b5650">קיבלתם הודעה זו כי נרשמתם לדיוור. להסרה השיבו להודעה.</p>`, { label: "להשלמת ההזמנה", href: `${siteUrl()}/cart` }),
    text: `המוצרים בסל עדיין מחכים לכם: ${products}. ${siteUrl()}/cart`,
  };
}

export function adminLead(store: string, lead: { full_name: string; phone: string; email: string | null; message: string; id: string }) {
  return {
    subject: `פנייה חדשה מהאתר: ${lead.full_name}`,
    html: layout(store, "פנייה חדשה", `<p>${esc(lead.full_name)} · <span dir="ltr">${esc(lead.phone)}</span> ${lead.email ? `· ${esc(lead.email)}` : ""}</p><p style="white-space:pre-line">${esc(lead.message)}</p>`, { label: "פתיחה בניהול", href: `${siteUrl()}/admin/leads/${lead.id}` }),
    text: `פנייה חדשה מ־${lead.full_name} ${lead.phone}: ${lead.message}`,
  };
}
