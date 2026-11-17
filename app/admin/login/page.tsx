import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "כניסה למערכת הניהול", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-sand px-4">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-soft">
        <p className="text-center font-display text-2xl font-bold">
          בית ועיצוב<span className="text-gold">.</span>
        </p>
        <h1 className="mt-1 text-center text-ink-soft">מערכת ניהול החנות</h1>
        <LoginForm />
      </div>
    </main>
  );
}
