import "server-only";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

export type ServerErrorReport = {
  message: string;
  digest?: string;
  stack?: string;
  path: string;
  method: string;
  routePath?: string;
  routeType?: string;
};

// One alert e-mail per distinct error per hour, per server instance.
const alerted = new Map<string, number>();

/**
 * Records a server error in the database (shown in the admin under
 * "יומן תקלות") and e-mails the store address about new ones. Never throws:
 * monitoring must not turn one failure into two.
 */
export async function reportServerError(report: ServerErrorReport) {
  try {
    const db = createServiceClient();
    await db
      .from("integration_events")
      .insert({ integration: "app", direction: "out", type: "server_error", status: "error", payload: report });

    const key = `${report.routePath ?? report.path}|${report.message.slice(0, 120)}`;
    const last = alerted.get(key) ?? 0;
    if (Date.now() - last < 60 * 60 * 1000) return;
    alerted.set(key, Date.now());
    // Read directly: this runs outside a request's cache scope.
    const { data: setting } = await db.from("store_settings").select("value").eq("key", "business").maybeSingle();
    const business = (setting?.value ?? {}) as { email?: string };
    if (!business.email) return;
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    await sendEmail({
      to: business.email,
      tag: "server_error",
      subject: `תקלה באתר: ${report.message.slice(0, 80)}`,
      text: `${report.method} ${report.path}\n${report.message}\n${report.digest ?? ""}\n${siteUrl()}/admin/errors`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif"><h2 style="margin:0 0 8px">תקלה באתר</h2><p><b>${esc(report.method)} ${esc(report.path)}</b></p><pre style="white-space:pre-wrap;background:#f2efea;padding:12px;border-radius:8px" dir="ltr">${esc(report.message)}${report.digest ? `\ndigest: ${esc(report.digest)}` : ""}</pre><p><a href="${siteUrl()}/admin/errors">ליומן התקלות בניהול</a></p></div>`,
    });
  } catch (e) {
    console.error("reportServerError failed", e);
  }
}
