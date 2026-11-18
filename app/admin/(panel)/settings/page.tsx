import Link from "next/link";
import { SettingsForm } from "@/components/admin/settings-forms";
import { AdminHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
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
      <SettingsForm settings={{ business: map.business ?? {}, commerce: map.commerce ?? {}, seo: map.seo ?? {} } as never} />
    </>
  );
}
