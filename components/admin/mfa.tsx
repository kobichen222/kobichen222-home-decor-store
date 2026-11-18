"use client";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createBrowserSupabase } from "@/lib/supabase/browser";

async function verifyCode(code: string): Promise<string | null> {
  const supabase = createBrowserSupabase();
  const { data: factors, error } = await supabase.auth.mfa.listFactors();
  if (error) return "לא הצלחנו לטעון את אמצעי האימות";
  const factor = factors.totp.find((f) => f.status === "verified");
  if (!factor) return "לא הוגדר אמצעי אימות";
  const { error: vErr } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  return vErr ? "הקוד שגוי או שפג תוקפו" : null;
}

export function MfaChallenge() {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const err = await verifyCode(code.trim());
        setBusy(false);
        if (err) return setError(err);
        router.replace("/admin");
        router.refresh();
      }}
      className="mt-6 space-y-4"
    >
      <Field label="קוד בן 6 ספרות מאפליקציית האימות" htmlFor="code">
        <Input id="code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" dir="ltr" className="text-center text-xl tracking-[0.4em]" autoFocus required />
      </Field>
      {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>{busy ? "מאמת…" : "אימות"}</Button>
    </form>
  );
}

export function MfaSetup({ enrolled }: { enrolled: boolean }) {
  const router = useRouter();
  const [qr, setQr] = React.useState<{ id: string; svg: string; secret: string } | null>(null);
  const [code, setCode] = React.useState("");
  const [msg, setMsg] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function start() {
    setBusy(true);
    setMsg(null);
    const supabase = createBrowserSupabase();
    // Drop a half-finished enrolment before starting again.
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `admin-${Date.now()}` });
    setBusy(false);
    if (error || !data) return setMsg({ ok: false, text: `ההפעלה נכשלה: ${error?.message ?? ""}` });
    setQr({ id: data.id, svg: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmCode() {
    if (!qr) return;
    setBusy(true);
    const { error } = await createBrowserSupabase().auth.mfa.challengeAndVerify({ factorId: qr.id, code });
    setBusy(false);
    if (error) return setMsg({ ok: false, text: "הקוד שגוי. ודאו שהשעון בטלפון מדויק ונסו שוב." });
    setQr(null);
    setMsg({ ok: true, text: "האימות הדו־שלבי הופעל." });
    router.refresh();
  }

  async function disable() {
    if (!window.confirm("לבטל את האימות הדו־שלבי? החשבון יהיה מוגן בסיסמה בלבד.")) return;
    setBusy(true);
    const supabase = createBrowserSupabase();
    const { data } = await supabase.auth.mfa.listFactors();
    for (const f of data?.totp ?? []) await supabase.auth.mfa.unenroll({ factorId: f.id });
    setBusy(false);
    setMsg({ ok: true, text: "האימות הדו־שלבי בוטל." });
    router.refresh();
  }

  if (enrolled) {
    return (
      <div className="space-y-3">
        <p className="font-semibold text-success">✓ האימות הדו־שלבי פעיל בחשבון שלך.</p>
        <Button variant="outline" onClick={disable} disabled={busy}>ביטול האימות הדו־שלבי</Button>
        {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {!qr ? (
        <Button onClick={start} disabled={busy}>{busy ? "מכין…" : "הפעלת אימות דו־שלבי"}</Button>
      ) : (
        <div className="space-y-4">
          <p className="text-sm">1. סרקו את הקוד באפליקציית אימות (Google Authenticator, Microsoft Authenticator, 1Password וכו׳).</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URI from the auth server */}
          <img src={qr.svg} alt="קוד QR להגדרת אפליקציית האימות" className="size-48 rounded-lg border border-line bg-white p-2" />
          <p className="text-xs text-ink-soft">אין אפשרות לסרוק? הזינו ידנית: <code dir="ltr" className="rounded bg-sand px-1.5 py-0.5">{qr.secret}</code></p>
          <p className="text-sm">2. הזינו את הקוד שמופיע באפליקציה:</p>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" dir="ltr" className="w-40 text-center tracking-[0.3em]" aria-label="קוד אימות" />
            <Button onClick={confirmCode} disabled={busy || code.length !== 6}>אישור</Button>
          </div>
        </div>
      )}
      {msg && <p role="status" className={`text-sm font-semibold ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
