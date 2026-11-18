import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type Email = { to: string; subject: string; html: string; text: string; tag: string };

/**
 * Sends through Resend when RESEND_API_KEY and EMAIL_FROM are set.
 * Without them nothing is sent; the attempt is recorded as an integration
 * event, so the flows work end to end and can be switched on later.
 */
export async function sendEmail(email: Email): Promise<{ sent: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  let sent = false;
  let error: string | undefined;
  if (key && from) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [email.to], subject: email.subject, html: email.html, text: email.text, tags: [{ name: "type", value: email.tag }] }),
        signal: AbortSignal.timeout(8000),
      });
      sent = res.ok;
      if (!res.ok) error = `resend ${res.status}: ${(await res.text()).slice(0, 300)}`;
    } catch (e) {
      error = String(e).slice(0, 300);
    }
  }
  await createServiceClient()
    .from("integration_events")
    .insert({
      integration: "email",
      direction: "out",
      type: email.tag,
      status: sent ? "sent" : key && from ? "failed" : "not_configured",
      payload: { to: email.to, subject: email.subject, error },
    });
  if (error) console.error("sendEmail failed", error);
  return { sent, error };
}
