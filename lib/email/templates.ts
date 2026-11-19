import { siteUrl } from "@/lib/env";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const money = (n: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 2 }).format(n);

const C = { cream: "#faf9f6", sand: "#f2efea", ink: "#242424", soft: "#5b5650", brand: "#705b4b", gold: "#b49a76", line: "#e8e5e1", success: "#3f6b4f" };
const FONT = "'Assistant','Heebo',Arial,Helvetica,sans-serif";

/**
 * Shared frame for every message: table layout and inline styles only, so it
 * renders the same in Gmail, Outlook and phone mail apps. `preheader` is the
 * grey preview line shown in the inbox list.
 */
function layout(
  store: string,
  title: string,
  body: string,
  cta?: { label: string; href: string },
  opts: { preheader?: string; badge?: string } = {},
) {
  const site = siteUrl();
  const host = site.replace(/^https?:\/\//, "");
  const link = (path: string, label: string) => `<a href="${esc(site + path)}" style="color:${C.soft};text-decoration:underline">${label}</a>`;
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:${FONT};color:${C.ink}">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">
<tr><td style="padding:0 6px 18px;text-align:center;font-size:26px;font-weight:800;letter-spacing:-0.3px"><a href="${esc(site)}" style="color:${C.ink};text-decoration:none">${esc(store)}<span style="color:${C.gold}">.</span></a></td></tr>
<tr><td style="background:#ffffff;border:1px solid ${C.line};border-radius:20px;overflow:hidden">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="background:${C.sand};padding:34px 28px 28px;text-align:center">
${opts.badge ? `<div style="display:inline-block;width:56px;height:56px;line-height:56px;border-radius:50%;background:#ffffff;color:${C.success};font-size:28px;font-weight:700;margin-bottom:14px">${opts.badge}</div>` : ""}
<h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:800">${esc(title)}</h1>
</td></tr>
<tr><td dir="rtl" style="padding:26px 28px 30px;font-size:16px;line-height:1.65;text-align:right">
${body}
${cta ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px"><tr><td align="center"><a href="${esc(cta.href)}" style="display:inline-block;background:${C.ink};color:${C.cream};text-decoration:none;padding:14px 30px;border-radius:999px;font-weight:700;font-size:15px">${esc(cta.label)}</a></td></tr></table>` : ""}
</td></tr>
</table></td></tr>
<tr><td style="padding:22px 10px 0;text-align:center;font-size:12px;line-height:1.8;color:${C.soft}">
${link("/faq", "שאלות נפוצות")} &nbsp;·&nbsp; ${link("/shipping", "משלוחים")} &nbsp;·&nbsp; ${link("/returns", "החזרות")} &nbsp;·&nbsp; ${link("/contact", "יצירת קשר")}<br>
${esc(store)} · <a href="${esc(site)}" style="color:${C.soft};text-decoration:none">${esc(host)}</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

export type OrderForEmail = {
  order_number: number; public_token: string; customer_name: string; total: number; shipping_method_name: string;
  tracking_number?: string | null;
  items: { product_name: string; variant_name: string | null; quantity: number; line_total: number }[];
};

function itemsTable(o: OrderForEmail) {
  const rows = o.items
    .map(
      (i) => `<tr><td style="padding:12px 0;border-bottom:1px solid ${C.line}"><strong style="font-weight:700">${esc(i.product_name)}</strong>${i.variant_name ? `<br><span style="color:${C.soft};font-size:13px">${esc(i.variant_name)}</span>` : ""}<br><span style="color:${C.soft};font-size:13px">כמות: ${i.quantity}</span></td><td style="padding:12px 0;border-bottom:1px solid ${C.line};text-align:left;white-space:nowrap;vertical-align:top">${money(i.line_total)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px;font-size:14px">${rows}
<tr><td style="padding:14px 0 0;font-weight:800;font-size:16px">סה״כ</td><td style="padding:14px 0 0;text-align:left;font-weight:800;font-size:16px;white-space:nowrap">${money(o.total)}</td></tr></table>`;
}

function infoBox(rows: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};border-radius:12px;font-size:14px;margin:4px 0 0">${rows
    .map(([k, v]) => `<tr><td style="padding:10px 16px;color:${C.soft}">${esc(k)}</td><td style="padding:10px 16px;text-align:left;font-weight:700">${v}</td></tr>`)
    .join("")}</table>`;
}

const STEPS = ["התקבלה", "בהכנה", "נשלחה", "נמסרה"];
function progress(step: number) {
  const cells = STEPS.map((label, i) => {
    const on = i <= step;
    return `<td align="center" style="font-size:12px;color:${on ? C.ink : C.soft};font-weight:${i === step ? 800 : 400}"><div style="width:14px;height:14px;border-radius:50%;margin:0 auto 6px;background:${on ? C.success : C.line}"></div>${label}</td>`;
  }).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px"><tr>${cells}</tr></table>`;
}

export function orderConfirmation(store: string, o: OrderForEmail) {
  const href = `${siteUrl()}/order/${o.public_token}`;
  return {
    subject: `אישור הזמנה ${o.order_number} · ${store}`,
    html: layout(
      store,
      `תודה ${o.customer_name}, ההזמנה התקבלה!`,
      `<p style="margin:0 0 16px">שמחים שבחרתם בנו. אנחנו כבר מתחילים להכין את ההזמנה, ונעדכן אתכם בכל שלב.</p>
${infoBox([["מספר הזמנה", String(o.order_number)], ["אספקה", esc(o.shipping_method_name)]])}
${itemsTable(o)}`,
      { label: "מעקב אחר ההזמנה", href },
      { preheader: `הזמנה ${o.order_number} התקבלה · ${money(o.total)}`, badge: "✓" },
    ),
    text: `תודה ${o.customer_name}! הזמנה ${o.order_number} התקבלה. סה״כ ${money(o.total)}. מעקב: ${href}`,
  };
}

const STEP_OF: Record<string, number> = { התקבלה: 0, שולמה: 0, בטיפול: 0, בהכנה: 1, "מוכנה למשלוח": 1, נשלחה: 2, נמסרה: 3 };

export function orderStatus(store: string, o: OrderForEmail, statusLabel: string) {
  const href = `${siteUrl()}/order/${o.public_token}`;
  return {
    subject: `עדכון להזמנה ${o.order_number}: ${statusLabel}`,
    html: layout(
      store,
      `עדכון: ההזמנה ${statusLabel}`,
      `${statusLabel in STEP_OF ? progress(STEP_OF[statusLabel]) : ""}<p style="margin:0 0 14px">שלום ${esc(o.customer_name)}, יש עדכון בהזמנה מספר <strong>${o.order_number}</strong>.</p>
${infoBox([["סטטוס", esc(statusLabel)], ...(o.tracking_number ? ([["מספר מעקב", `<span dir="ltr">${esc(o.tracking_number)}</span>`]] as [string, string][]) : [])])}`,
      { label: "לפרטי ההזמנה", href },
      { preheader: `הזמנה ${o.order_number}: ${statusLabel}` },
    ),
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
    html: layout(
      store,
      `שלום ${name}, שמחים שהצטרפתם`,
      `<p style="margin:0 0 14px">החשבון שלכם מוכן. מעכשיו תוכלו:</p>
<ul style="margin:0;padding:0 18px 0 0;line-height:2">
<li>לעקוב אחרי כל ההזמנות במקום אחד</li><li>לשמור כתובות לקופה מהירה</li><li>לשמור מוצרים אהובים ברשימת המועדפים</li></ul>`,
      { label: "לגלות את החנות", href: `${siteUrl()}/shop` },
      { preheader: "החשבון שלכם מוכן", badge: "♥" },
    ),
    text: `שלום ${name}, ברוכים הבאים ל${store}. ${siteUrl()}/shop`,
  };
}

export function abandonedCart(store: string, name: string | null, products: string, couponHint?: string) {
  return {
    subject: `שכחתם משהו בסל · ${store}`,
    html: layout(
      store,
      `${name ? `${name}, ` : ""}המוצרים עדיין מחכים לכם`,
      `<p style="margin:0 0 14px">שמרנו עבורכם את הסל, כדי שתוכלו להמשיך בדיוק מאיפה שעצרתם:</p>
${infoBox([["בסל", esc(products)]])}
${couponHint ? `<p style="margin:16px 0 0;padding:12px 16px;border:1px dashed ${C.gold};border-radius:12px;text-align:center;font-weight:700">${esc(couponHint)}</p>` : ""}
<p style="margin:18px 0 0;font-size:12px;color:${C.soft}">קיבלתם הודעה זו כי נרשמתם לדיוור. להסרה השיבו להודעה.</p>`,
      { label: "להשלמת ההזמנה", href: `${siteUrl()}/cart` },
      { preheader: "המוצרים שבחרתם שמורים עבורכם" },
    ),
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
