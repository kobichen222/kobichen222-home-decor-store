import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/admin/notice";
import { ResourceForm } from "@/components/admin/resource-form";
import type { Option } from "@/components/admin/resource-types";
import { AdminHeader } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { loadOptions } from "@/features/admin/options";
import { clientResource, getResource } from "@/features/admin/resources";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;
const ERRORS: Record<string, string> = {
  protected: "זהו רכיב מערכת ולא ניתן למחוק אותו.",
  in_use: "לא ניתן למחוק: הרשומה בשימוש במקום אחר.",
  failed: "המחיקה נכשלה.",
};

export async function generateMetadata({ params }: PageProps<"/admin/[resource]/[id]">) {
  return { title: getResource((await params).resource)?.singular ?? "ניהול" };
}

export default async function ResourceEditPage({ params, searchParams }: PageProps<"/admin/[resource]/[id]">) {
  const [{ resource: key, id }, sp] = await Promise.all([params, searchParams]);
  const resource = getResource(key);
  if (!resource) notFound();
  await requireAdmin(resource.permission);
  const isNew = id === "new";
  if (isNew ? !resource.canCreate : !UUID.test(id)) notFound();

  const db = (await createSessionClient()) as unknown as SupabaseClient;
  let row: Record<string, unknown> | null = null;
  if (!isNew) {
    const { data } = await db.from(resource.table).select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    row = data;
  }

  // All option lists and the relation load in parallel.
  const optionFields = resource.fields.filter((f) => f.optionsFrom || f.kind === "products");
  const rel = resource.productRelation;
  const [optionLists, relationRows] = await Promise.all([
    Promise.all(optionFields.map((f) => loadOptions(db, f.optionsFrom ?? "products"))),
    rel && row ? db.from(rel.table).select("product_id").eq(rel.fk, id).order("sort_order") : Promise.resolve({ data: [] }),
  ]);
  const options: Record<string, Option[]> = Object.fromEntries(optionFields.map((f, i) => [f.name, optionLists[i]]));
  const relationIds = ((relationRows.data ?? []) as { product_id: string }[]).map((r) => r.product_id);
  const publicPath = row && resource.publicPath ? resource.publicPath(row) : null;
  const title = isNew ? resource.newLabel : String(row?.name ?? row?.title ?? row?.code ?? row?.full_name ?? resource.singular);

  return (
    <>
      <AdminHeader title={title} back={{ href: `/admin/${resource.key}`, label: resource.title }}>
        {row &&
          resource.rowLinks?.(row).map((l) => (
            <Link key={l.href} href={l.href} className={buttonClass("outline", "sm")}>
              {l.label}
            </Link>
          ))}
        {publicPath && (
          <Link href={publicPath} target="_blank" className={buttonClass("outline", "sm")}>
            צפייה באתר
          </Link>
        )}
      </AdminHeader>
      {sp.saved && <Notice>נשמר בהצלחה.</Notice>}
      {typeof sp.error === "string" && ERRORS[sp.error] && <Notice tone="danger">{ERRORS[sp.error]}</Notice>}
      {resource.key === "leads" && row && <LeadPhotos data={row.data} />}
      <div className="max-w-4xl">
        <ResourceForm key={String(sp.saved ?? "")} resource={clientResource(resource)} row={row} options={options} relationIds={relationIds} />
      </div>
    </>
  );
}

async function LeadPhotos({ data }: { data: unknown }) {
  const paths = ((data as { photos?: string[] } | null)?.photos ?? []).filter((p) => /^leads\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(p));
  if (!paths.length) return null;
  // Private bucket: short-lived signed links, created after the admin check.
  const { createServiceClient } = await import("@/lib/supabase/service");
  const { data: signed } = await createServiceClient().storage.from("private").createSignedUrls(paths, 600);
  return (
    <div className="mb-4 max-w-4xl">
      <p className="mb-2 text-sm font-semibold">תמונות שצורפו</p>
      <div className="flex flex-wrap gap-3">
        {(signed ?? []).map((s) =>
          s.signedUrl ? (
            <a key={s.path} href={s.signedUrl} target="_blank" rel="noopener noreferrer" className="block size-32 overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
              <img src={s.signedUrl} alt="תמונת החלל" className="size-full object-cover" />
            </a>
          ) : null,
        )}
      </div>
    </div>
  );
}
