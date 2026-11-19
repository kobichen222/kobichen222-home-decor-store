import { AdminHeader, Badge, Card, Empty } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "יומן תקלות" };

type Report = { message?: string; digest?: string; stack?: string; path?: string; method?: string; routePath?: string; routeType?: string };
const ROUTE_TYPE: Record<string, string> = { render: "הצגת עמוד", route: "API", action: "פעולת טופס", proxy: "ניתוב" };

// The page renders per request (admin), so "now" is the request time.
function dayAgo() {
  return Date.now() - 24 * 60 * 60 * 1000;
}

export default async function ErrorsPage() {
  await requireAdmin("settings.manage");
  const db = await createSessionClient();
  const { data } = await db
    .from("integration_events")
    .select("id, created_at, payload")
    .eq("integration", "app")
    .eq("type", "server_error")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []).map((r) => ({ ...r, p: (r.payload ?? {}) as Report }));
  const since = dayAgo();
  const lastDay = rows.filter((r) => new Date(r.created_at).getTime() > since).length;

  return (
    <>
      <AdminHeader
        title="יומן תקלות"
        description="שגיאות שרת שקרו באתר החי (100 האחרונות). על כל תקלה חדשה נשלחת התראה לדוא״ל החנות, פעם בשעה לכל היותר."
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <Badge tone={lastDay ? "danger" : "success"}>{lastDay ? `${lastDay} תקלות ב־24 השעות האחרונות` : "אין תקלות ב־24 השעות האחרונות"}</Badge>
      </div>
      {!rows.length ? (
        <Empty>לא נרשמו תקלות. 🎉</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="p-4">
                <details>
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 [&::-webkit-details-marker]:hidden">
                    <span className="text-xs text-ink-soft tabular-nums">{formatDate(r.created_at, true)}</span>
                    {r.p.routeType && <Badge tone="neutral">{ROUTE_TYPE[r.p.routeType] ?? r.p.routeType}</Badge>}
                    <span className="text-sm font-semibold" dir="ltr">
                      {r.p.method} {r.p.path}
                    </span>
                    <span className="w-full truncate text-sm text-danger" dir="ltr">
                      {r.p.message}
                    </span>
                  </summary>
                  <div className="mt-3 space-y-2 text-xs text-ink-soft" dir="ltr">
                    {r.p.routePath && <p>route: {r.p.routePath}</p>}
                    {r.p.digest && <p>digest: {r.p.digest}</p>}
                    {r.p.stack && <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-sand p-3">{r.p.stack}</pre>}
                  </div>
                </details>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
