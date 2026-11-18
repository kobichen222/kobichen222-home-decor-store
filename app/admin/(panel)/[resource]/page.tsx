import type { SupabaseClient } from "@supabase/supabase-js";
import Form from "next/form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/components/admin/notice";
import { AdminHeader, Badge, Empty, TableWrap } from "@/components/admin/ui";
import { StoreImage } from "@/components/shared/store-image";
import { Button, buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { getResource } from "@/features/admin/resources";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";

const PER_PAGE = 30;

export async function generateMetadata({ params }: PageProps<"/admin/[resource]">) {
  return { title: getResource((await params).resource)?.title ?? "ניהול" };
}

export default async function ResourceListPage({ params, searchParams }: PageProps<"/admin/[resource]">) {
  const [{ resource: key }, sp] = await Promise.all([params, searchParams]);
  const resource = getResource(key);
  if (!resource) notFound();
  await requireAdmin(resource.permission);

  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const filterValue = resource.filter && typeof sp.f === "string" && resource.filter.options.some((o) => o.value === sp.f) ? sp.f : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const db = (await createSessionClient()) as unknown as SupabaseClient;
  let query = db.from(resource.table).select("*", { count: "exact" });
  for (const o of resource.order) query = query.order(o.column, { ascending: o.ascending });
  if (q && resource.search?.length) {
    const safe = q.replace(/[%_\\,()*]/g, "");
    query = query.or(resource.search.map((c) => `${c}.ilike.%${safe}%`).join(","));
  }
  if (filterValue && resource.filter) query = query.eq(resource.filter.column, filterValue);
  const { data: rows, count, error } = await query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (error) throw new Error(error.message);
  const pages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <>
      <AdminHeader title={resource.title} description={resource.description ?? `${count ?? 0} רשומות`}>
        {resource.canCreate && (
          <Link href={`/admin/${resource.key}/new`} className={buttonClass("primary", "md")}>
            + {resource.newLabel}
          </Link>
        )}
      </AdminHeader>
      {sp.deleted && <Notice>נמחק בהצלחה.</Notice>}
      {(resource.search?.length || resource.filter) && (
        <Form action={`/admin/${resource.key}`} className="mb-4 flex flex-wrap gap-2">
          {resource.search?.length ? <Input name="q" defaultValue={q} placeholder="חיפוש" aria-label="חיפוש" className="max-w-xs" /> : null}
          {resource.filter && (
            <Select name="f" defaultValue={filterValue} aria-label={resource.filter.label} className="w-44">
              <option value="">{resource.filter.label}: הכול</option>
              {resource.filter.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
          <Button type="submit" variant="outline">
            סינון
          </Button>
        </Form>
      )}
      {!rows?.length ? (
        <Empty>{q || filterValue ? "לא נמצאו תוצאות" : "עדיין אין רשומות"}</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              {resource.columns.map((c) => (
                <th key={c.name}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows as Record<string, unknown>[]).map((row) => (
              <tr key={row.id as string} className="relative hover:bg-sand/40">
                {resource.columns.map((c, i) => {
                  const v = row[c.name];
                  let content: React.ReactNode;
                  if (c.kind === "image") {
                    content = (
                      <span className="relative block h-11 w-11 overflow-hidden rounded-md bg-sand">
                        <StoreImage src={v as string | null} alt="" fill sizes="44px" className="object-cover" />
                      </span>
                    );
                  } else if (c.kind === "bool") content = <Badge tone={v ? "success" : "neutral"}>{v ? "פעיל" : "כבוי"}</Badge>;
                  else if (c.kind === "badge") content = v ? <Badge tone={c.tones?.[String(v)] ?? "neutral"}>{c.labels?.[String(v)] ?? String(v)}</Badge> : "—";
                  else if (c.kind === "money") content = v == null ? "—" : formatPrice(Number(v));
                  else if (c.kind === "date") content = v ? formatDate(String(v)) : "—";
                  else content = v == null || v === "" ? "—" : String(v);
                  const first = i === resource.columns.findIndex((col) => col.kind !== "image");
                  return (
                    <td key={c.name} dir={c.kind === "ltr" ? "ltr" : undefined} className={c.kind === "ltr" ? "text-end text-ink-soft" : first ? "font-semibold" : undefined}>
                      {first ? (
                        <Link href={`/admin/${resource.key}/${row.id}`} className="hover:text-brand after:absolute after:inset-0">
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {pages > 1 && (
        <nav className="mt-4 flex justify-center gap-1" aria-label="עמודים">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={{ pathname: `/admin/${resource.key}`, query: { ...(q && { q }), ...(filterValue && { f: filterValue }), ...(n > 1 && { page: n }) } }}
              className={`grid size-9 place-items-center rounded-full text-sm font-semibold ${n === page ? "bg-ink text-cream" : "hover:bg-white"}`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
