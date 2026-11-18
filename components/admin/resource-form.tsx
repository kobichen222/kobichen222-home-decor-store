"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { ClientResource } from "@/features/admin/resources";
import { deleteResource, saveResource } from "@/features/admin/resource-actions";
import { useFormAction } from "@/lib/use-form-action";
import { cn, formatDate } from "@/lib/utils";
import { DateTimeField, ImageField, ProductPicker } from "./fields";
import type { Option } from "./resource-types";
import { Card } from "./ui";

type Row = Record<string, unknown>;

export function ResourceForm({
  resource,
  row,
  options,
  relationIds,
}: {
  resource: ClientResource;
  row: Row | null;
  options: Record<string, Option[]>;
  relationIds: string[];
}) {
  const action = React.useMemo(() => saveResource.bind(null, resource.key, (row?.id as string) ?? null), [resource.key, row?.id]);
  const { state, pending, onSubmit } = useFormAction(action);
  const e = state?.errors ?? {};
  const value = (name: string, fallback?: unknown) => (row ? row[name] : fallback);
  const protectedRow = !!(resource.protectColumn && row?.[resource.protectColumn]);

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit}>
        <Card className="space-y-5 p-5 sm:p-6">
          {state?.message && (
            <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger" role="alert">
              {state.message}
            </p>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            {resource.fields.map((f) => {
              const id = `f-${f.name}`;
              const v = value(f.name, f.default);
              const locked = !!(f.lockWhen && row?.[f.lockWhen]);
              const span = f.wide || f.kind === "richtext" || f.kind === "products" ? "sm:col-span-2" : "";
              if (f.kind === "bool") {
                return (
                  <label key={f.name} className={cn("flex items-start gap-2.5 self-end pb-2.5 text-sm font-semibold", span)}>
                    <input type="checkbox" name={f.name} defaultChecked={!!v} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
                    <span>
                      {f.label}
                      {f.hint && <span className="block text-xs font-normal text-ink-soft">{f.hint}</span>}
                    </span>
                  </label>
                );
              }
              if (f.kind === "readonly") {
                if (!row) return null;
                const raw = row[f.name];
                const text = typeof raw === "string" && /^\d{4}-\d\d-\d\dT/.test(raw) ? formatDate(raw, true) : raw == null || raw === "" ? "—" : String(raw);
                return (
                  <div key={f.name} className={span}>
                    <p className="text-sm font-semibold">{f.label}</p>
                    <p className="mt-1 whitespace-pre-wrap rounded-lg bg-sand/60 px-3.5 py-2.5 text-sm">{text}</p>
                  </div>
                );
              }
              return (
                <Field key={f.name} label={f.label} htmlFor={id} required={f.required} error={e[f.name]} hint={locked ? "שדה מערכת: לא ניתן לשינוי" : f.hint} className={span}>
                  {f.kind === "textarea" || f.kind === "richtext" ? (
                    <Textarea id={id} name={f.name} defaultValue={(v as string) ?? ""} rows={f.kind === "richtext" ? 16 : 3} maxLength={f.max} aria-invalid={!!e[f.name]} />
                  ) : f.kind === "select" ? (
                    <Select id={id} name={f.name} defaultValue={(v as string) ?? ""} aria-invalid={!!e[f.name]}>
                      {(!f.required || f.emptyLabel) && <option value="">{f.emptyLabel ?? "—"}</option>}
                      {(f.options ?? options[f.name] ?? []).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : f.kind === "datetime" ? (
                    <DateTimeField id={id} name={f.name} defaultValue={v as string | null} />
                  ) : f.kind === "image" ? (
                    <ImageField id={id} name={f.name} defaultValue={v as string | null} />
                  ) : f.kind === "products" ? (
                    <ProductPicker name={f.name} products={options[f.name] ?? []} selected={relationIds} />
                  ) : f.kind === "tags" ? (
                    <Input id={id} name={f.name} defaultValue={Array.isArray(v) ? v.join(", ") : ""} />
                  ) : (
                    <Input
                      id={id}
                      name={f.name}
                      type={f.kind === "number" || f.kind === "money" ? "number" : f.kind === "email" ? "email" : "text"}
                      step={f.kind === "money" ? "0.01" : f.kind === "number" ? "1" : undefined}
                      min={f.kind === "number" || f.kind === "money" ? 0 : undefined}
                      dir={["slug", "code", "email", "number", "money"].includes(f.kind) ? "ltr" : undefined}
                      defaultValue={v == null ? "" : String(v)}
                      maxLength={f.max}
                      readOnly={locked}
                      aria-invalid={!!e[f.name]}
                    />
                  )}
                </Field>
              );
            })}
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "שומר…" : row ? "שמירת שינויים" : `יצירת ${resource.newLabel.split(" ").slice(0, -1).join(" ")}`}
          </Button>
        </Card>
      </form>
      {row && resource.canDelete && !protectedRow && (
        <form
          action={deleteResource}
          onSubmit={(ev) => {
            if (!confirm(`למחוק את ה${resource.singular}? לא ניתן לבטל פעולה זו.`)) ev.preventDefault();
          }}
        >
          <input type="hidden" name="resource" value={resource.key} />
          <input type="hidden" name="id" value={row.id as string} />
          <Button type="submit" variant="ghost" size="sm" className="text-danger hover:bg-danger/10">
            מחיקת ה{resource.singular}
          </Button>
        </form>
      )}
    </div>
  );
}
