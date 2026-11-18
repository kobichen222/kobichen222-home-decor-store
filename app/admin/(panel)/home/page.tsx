import { ArrowDown, ArrowUp, Eye, EyeOff, Smartphone } from "lucide-react";
import Link from "next/link";
import { SECTION_LABELS } from "@/components/admin/section-kinds";
import { AdminHeader, Badge, Card } from "@/components/admin/ui";
import { Button, buttonClass } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { addSection, moveSection, toggleSection } from "@/features/admin/backoffice-actions";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "עמוד הבית" };

export default async function HomeSectionsPage() {
  await requireAdmin("content.manage");
  const db = await createSessionClient();
  const { data: page } = await db.from("pages").select("id").eq("slug", "home").single();
  const { data: sections } = await db
    .from("page_sections")
    .select("id, kind, title, data, is_active, hide_on_mobile, starts_at, ends_at")
    .eq("page_id", page!.id)
    .order("sort_order");
  const list = sections ?? [];
  const now = new Date().toISOString();

  return (
    <>
      <AdminHeader title="עמוד הבית" description="המקטעים מוצגים לפי הסדר כאן. שינוי נראה באתר תוך כדקה.">
        <Link href="/" target="_blank" className={buttonClass("outline", "md")}>צפייה באתר</Link>
      </AdminHeader>
      <ol className="space-y-2.5">
        {list.map((s, i) => {
          const scheduled = (s.starts_at && s.starts_at > now) || (s.ends_at && s.ends_at <= now);
          const heading = s.kind === "hero" ? String((s.data as Record<string, unknown>)?.title ?? "") : s.title;
          return (
            <li key={s.id}>
              <Card className="flex flex-wrap items-center gap-3 p-3.5">
                <div className="flex flex-col">
                  <form action={moveSection}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="dir" value="up" />
                    <button type="submit" disabled={i === 0} className="rounded p-1 hover:bg-sand disabled:opacity-25" aria-label="הזזה למעלה"><ArrowUp className="size-4" /></button>
                  </form>
                  <form action={moveSection}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="dir" value="down" />
                    <button type="submit" disabled={i === list.length - 1} className="rounded p-1 hover:bg-sand disabled:opacity-25" aria-label="הזזה למטה"><ArrowDown className="size-4" /></button>
                  </form>
                </div>
                <Link href={`/admin/home/${s.id}`} className="min-w-0 flex-1 hover:text-brand">
                  <p className="text-xs font-semibold text-ink-soft">{SECTION_LABELS[s.kind] ?? s.kind}</p>
                  <p className="truncate font-semibold">{heading || "ללא כותרת"}</p>
                </Link>
                <div className="flex flex-wrap items-center gap-1.5">
                  {s.hide_on_mobile && <Badge><Smartphone className="inline size-3" /> מוסתר במובייל</Badge>}
                  {scheduled && <Badge tone="warning">מתוזמן{s.starts_at && s.starts_at > now ? ` מ־${formatDate(s.starts_at)}` : ""}</Badge>}
                  <Badge tone={s.is_active ? "success" : "neutral"}>{s.is_active ? "מוצג" : "מוסתר"}</Badge>
                  <form action={toggleSection}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="active" value={String(!s.is_active)} />
                    <button type="submit" className="rounded-full p-2 hover:bg-sand" aria-label={s.is_active ? "הסתרה" : "הצגה"} title={s.is_active ? "הסתרה" : "הצגה"}>
                      {s.is_active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </form>
                  <Link href={`/admin/home/${s.id}`} className={buttonClass("outline", "sm")}>עריכה</Link>
                </div>
              </Card>
            </li>
          );
        })}
      </ol>
      <Card className="mt-5 p-4">
        <form action={addSection} className="flex flex-wrap items-center gap-2">
          <label htmlFor="kind" className="text-sm font-semibold">הוספת מקטע:</label>
          <Select id="kind" name="kind" className="w-60">
            {Object.entries(SECTION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <Button type="submit" variant="outline">הוספה</Button>
          <span className="text-xs text-ink-soft">מקטע חדש נוצר מוסתר, עד שתמלאו אותו.</span>
        </form>
      </Card>
    </>
  );
}
