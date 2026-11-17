"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { deleteCategory, saveCategory } from "@/features/admin/catalog-actions";
import { useFormAction } from "@/lib/use-form-action";
import { Card } from "./ui";

type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  show_on_home: boolean;
  seo_title: string | null;
  seo_description: string | null;
};

export function CategoryForm({ category, parents }: { category: Category | null; parents: { id: string; name: string }[] }) {
  const { state, pending, onSubmit } = useFormAction(saveCategory);
  const e = state?.errors ?? {};
  return (
    <div className="max-w-3xl space-y-4">
      <form onSubmit={onSubmit}>
        {category && <input type="hidden" name="id" value={category.id} />}
        <Card className="space-y-5 p-5 sm:p-6">
          {state?.message && (
            <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger" role="alert">
              {state.message}
            </p>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="שם הקטגוריה" htmlFor="name" required error={e.name}>
              <Input id="name" name="name" defaultValue={category?.name} required />
            </Field>
            <Field label="כתובת URL (slug)" htmlFor="slug" required error={e.slug} hint="לדוגמה: wall-art">
              <Input id="slug" name="slug" defaultValue={category?.slug} dir="ltr" required />
            </Field>
            <Field label="קטגוריית אב" htmlFor="parent_id" error={e.parent_id}>
              <Select id="parent_id" name="parent_id" defaultValue={category?.parent_id ?? ""}>
                <option value="">ללא (קטגוריה ראשית)</option>
                {parents
                  .filter((p) => p.id !== category?.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="סדר הצגה" htmlFor="sort_order">
              <Input id="sort_order" name="sort_order" type="number" min="0" defaultValue={category?.sort_order ?? 0} dir="ltr" />
            </Field>
          </div>
          <Field label="תיאור" htmlFor="description">
            <Textarea id="description" name="description" defaultValue={category?.description ?? ""} rows={3} />
          </Field>
          <Field label="כתובת תמונה" htmlFor="image_url" hint="ספריית המדיה להעלאת תמונות קטגוריה תתווסף בשלב ניהול התוכן">
            <Input id="image_url" name="image_url" defaultValue={category?.image_url ?? ""} dir="ltr" />
          </Field>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_active" defaultChecked={category?.is_active ?? true} className="size-4 accent-[var(--color-brand)]" />
              פעילה
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="show_on_home" defaultChecked={category?.show_on_home ?? false} className="size-4 accent-[var(--color-brand)]" />
              להציג בעמוד הבית
            </label>
          </div>
          <div className="grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
            <Field label="כותרת SEO" htmlFor="seo_title">
              <Input id="seo_title" name="seo_title" defaultValue={category?.seo_title ?? ""} maxLength={70} />
            </Field>
            <Field label="תיאור Meta" htmlFor="seo_description">
              <Input id="seo_description" name="seo_description" defaultValue={category?.seo_description ?? ""} maxLength={170} />
            </Field>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "שומר…" : "שמירה"}
          </Button>
        </Card>
      </form>
      {category && (
        <form
          action={deleteCategory}
          onSubmit={(ev) => {
            if (!confirm(`למחוק את הקטגוריה ״${category.name}״? המוצרים עצמם לא יימחקו.`)) ev.preventDefault();
          }}
        >
          <input type="hidden" name="id" value={category.id} />
          <Button type="submit" variant="ghost" size="sm" className="text-danger hover:bg-danger/10">
            מחיקת הקטגוריה
          </Button>
        </form>
      )}
    </div>
  );
}
