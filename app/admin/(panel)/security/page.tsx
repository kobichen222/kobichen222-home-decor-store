import { MfaSetup } from "@/components/admin/mfa";
import { AdminHeader, Card } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata = { title: "אבטחת החשבון" };

export default async function SecurityPage() {
  await requireAdmin();
  const db = await createSessionClient();
  const { data } = await db.auth.mfa.listFactors();
  const enrolled = !!data?.totp.some((f) => f.status === "verified");
  return (
    <>
      <AdminHeader title="אבטחת החשבון" description="אימות דו־שלבי מגן על מערכת הניהול גם אם הסיסמה דלפה." />
      <Card className="max-w-2xl p-5 sm:p-6">
        <h2 className="mb-1 font-bold">אימות דו־שלבי (2FA)</h2>
        <p className="mb-4 text-sm text-ink-soft">לאחר ההפעלה, בכל כניסה תתבקשו להזין קוד מתחלף מאפליקציה בטלפון. ההגנה נאכפת גם בבסיס הנתונים.</p>
        <MfaSetup enrolled={enrolled} />
      </Card>
    </>
  );
}
