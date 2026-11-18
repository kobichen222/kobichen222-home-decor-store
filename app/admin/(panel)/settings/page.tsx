import Link from "next/link";
import { SettingsForm } from "@/components/admin/settings-forms";
import { AdminHeader } from "@/components/admin/ui";
import { Card } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { formatDate } from "@/lib/utils";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata = { title: "פרטי החנות" };

export default async function SettingsPage() {
  await requireAdmin("settings.manage");
  const db = await createSessionClient();
  const { data } = await db.from("store_settings").select("key, value");
  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return (
    <>
      <AdminHeader title="פרטי החנות והגדרות" description="הפרטים מוצגים בכותרת, בתחתית האתר, בעמוד יצירת הקשר ובנתונים המובנים למנועי חיפוש." />
      <p className="mb-5 max-w-4xl rounded-xl bg-white p-3 text-sm text-ink-soft">
        מפתחות של ספק סליקה, דוא״ל ו־WhatsApp אינם נשמרים כאן: הם מוגדרים כמשתני סביבה מוצפנים ב־Vercel. שיטות משלוח נערכות ב
        <Link href="/admin/shipping" className="font-semibold text-brand underline"> מסך המשלוחים</Link>.
      </p>
      <SettingsForm settings={{ business: map.business ?? {}, commerce: map.commerce ?? {}, seo: map.seo ?? {}, analytics: map.analytics ?? {} } as never} />
      <EmailStatus />
    </>
  );
}

const EMAIL_TYPES: Record<string, string> = {
  order_confirmation: "אישור הזמנה", admin_new_order: "הזמנה חדשה (לחנות)", order_status: "עדכון סטטוס", welcome: "ברוכים הבאים",
  abandoned_cart: "תזכורת סל", admin_lead: "פנייה חדשה (לחנות)",
};

async function EmailStatus() {
  const configured = !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const db = await createSessionClient();
  const { data } = await db.from("integration_events").select("id, type, status, payload, created_at").eq("integration", "email").order("created_at", { ascending: false }).limit(15);
  return (
    <Card className="mt-6 max-w-4xl p-5 sm:p-6">
      <h2 className="font-bold">דוא״ל ללקוחות</h2>
      <p className={`mt-1 text-sm font-semibold ${configured ? "text-success" : "text-danger"}`}>
        {configured ? "ספק הדוא״ל מחובר." : "ספק דוא״ל לא מחובר: ההודעות נרשמות אך לא נשלחות. יש להגדיר RESEND_API_KEY ו־EMAIL_FROM ב־Vercel."}
      </p>
      <ul className="mt-4 divide-y divide-line text-sm">
        {(data ?? []).map((e) => (
          <li key={e.id} className="flex flex-wrap justify-between gap-2 py-2">
            <span>{EMAIL_TYPES[e.type] ?? e.type} · <span dir="ltr">{String((e.payload as { to?: string })?.to ?? "")}</span></span>
            <span className="text-ink-soft">{e.status === "sent" ? "נשלח" : e.status === "failed" ? "נכשל" : "לא נשלח (לא מחובר)"} · {formatDate(e.created_at, true)}</span>
          </li>
        ))}
        {!data?.length && <li className="py-2 text-ink-soft">עדיין לא נוצרו הודעות</li>}
      </ul>
    </Card>
  );
}
