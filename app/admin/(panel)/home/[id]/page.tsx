import { notFound } from "next/navigation";
import { Notice } from "@/components/admin/notice";
import { SectionForm } from "@/components/admin/section-form";
import { SECTION_LABELS } from "@/components/admin/section-kinds";
import { AdminHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { deleteSection } from "@/features/admin/backoffice-actions";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata = { title: "עריכת מקטע" };

export default async function SectionPage({ params, searchParams }: PageProps<"/admin/home/[id]">) {
  await requireAdmin("content.manage");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createSessionClient();
  const { data: section } = await db.from("page_sections").select("id, kind, title, data, is_active, hide_on_mobile, starts_at, ends_at").eq("id", id).maybeSingle();
  if (!section) notFound();
  return (
    <>
      <AdminHeader title={SECTION_LABELS[section.kind] ?? section.kind} back={{ href: "/admin/home", label: "עמוד הבית" }} />
      {sp.saved && <Notice>המקטע נשמר.</Notice>}
      <div className="max-w-4xl space-y-4">
        <SectionForm key={String(sp.saved ?? "")} section={{ ...section, data: (section.data ?? {}) as Record<string, unknown> }} />
        <form action={deleteSection}>
          <input type="hidden" name="id" value={section.id} />
          <Button type="submit" variant="ghost" size="sm" className="text-danger hover:bg-danger/10">מחיקת המקטע</Button>
        </form>
      </div>
    </>
  );
}
