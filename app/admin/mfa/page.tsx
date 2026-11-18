import type { Metadata } from "next";
import { MfaChallenge } from "@/components/admin/mfa";
import { signOut } from "@/features/admin/auth-actions";

export const metadata: Metadata = { title: "אימות דו־שלבי", robots: { index: false, follow: false } };

export default function MfaPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-sand px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-soft">
        <h1 className="text-center text-xl font-bold">אימות דו־שלבי</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">פתחו את אפליקציית האימות והזינו את הקוד.</p>
        <MfaChallenge />
        <form action={signOut} className="mt-4 text-center">
          <button type="submit" className="text-sm text-ink-soft underline">יציאה</button>
        </form>
      </div>
    </main>
  );
}
