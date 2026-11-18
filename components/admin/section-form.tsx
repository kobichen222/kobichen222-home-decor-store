"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveSection } from "@/features/admin/backoffice-actions";
import { useFormAction } from "@/lib/use-form-action";
import { DateTimeField, ImageField } from "./fields";
import { Card } from "./ui";

type Section = {
  id: string; kind: string; title: string | null; data: Record<string, unknown>;
  is_active: boolean; hide_on_mobile: boolean; starts_at: string | null; ends_at: string | null;
};
type Link = { label?: string; href?: string };

export function SectionForm({ section }: { section: Section }) {
  const action = React.useMemo(() => saveSection.bind(null, section.id), [section.id]);
  const { state, pending, onSubmit } = useFormAction(action);
  const d = section.data ?? {};
  const s = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  const l = (k: string) => (d[k] as Link | undefined) ?? {};

  return (
    <form onSubmit={onSubmit}>
      <Card className="space-y-5 p-5 sm:p-6">
        {state?.message && <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-semibold text-danger" role="alert">{state.message}</p>}
        <div className="grid gap-5 sm:grid-cols-2">
          {section.kind !== "hero" && (
            <Field label="כותרת המקטע" htmlFor="title" className="sm:col-span-2" hint="ריק = ללא כותרת">
              <Input id="title" name="title" defaultValue={section.title ?? ""} maxLength={120} />
            </Field>
          )}

          {section.kind === "hero" && (
            <>
              <Field label="שורה עליונה קטנה" htmlFor="eyebrow"><Input id="eyebrow" name="eyebrow" defaultValue={s("eyebrow")} /></Field>
              <Field label="כותרת ראשית" htmlFor="hero_title" required><Input id="hero_title" name="hero_title" defaultValue={s("title")} /></Field>
              <Field label="תיאור" htmlFor="subtitle" className="sm:col-span-2"><Textarea id="subtitle" name="subtitle" rows={2} defaultValue={s("subtitle")} /></Field>
            </>
          )}

          {["hero", "banner", "text_image"].includes(section.kind) && (
            <>
              <Field label="תמונה" htmlFor="image_url" className="sm:col-span-2" hint="מומלץ: 1600×1000 לפחות">
                <ImageField id="image_url" name="image_url" defaultValue={s("image_url")} />
              </Field>
              <Field label="תיאור התמונה (נגישות)" htmlFor="image_alt" className="sm:col-span-2"><Input id="image_alt" name="image_alt" defaultValue={s("image_alt")} /></Field>
            </>
          )}

          {section.kind === "hero" && (
            <>
              <Field label="כפתור ראשי: טקסט" htmlFor="primary_label"><Input id="primary_label" name="primary_label" defaultValue={l("primary").label} /></Field>
              <Field label="כפתור ראשי: קישור" htmlFor="primary_href"><Input id="primary_href" name="primary_href" dir="ltr" defaultValue={l("primary").href} /></Field>
              <Field label="כפתור משני: טקסט" htmlFor="secondary_label"><Input id="secondary_label" name="secondary_label" defaultValue={l("secondary").label} /></Field>
              <Field label="כפתור משני: קישור" htmlFor="secondary_href"><Input id="secondary_href" name="secondary_href" dir="ltr" defaultValue={l("secondary").href} /></Field>
            </>
          )}

          {["banner", "text_image", "newsletter"].includes(section.kind) && (
            <Field label="טקסט" htmlFor="text" className="sm:col-span-2"><Textarea id="text" name="text" rows={4} defaultValue={s("text")} /></Field>
          )}
          {["banner", "text_image"].includes(section.kind) && (
            <>
              <Field label="כפתור: טקסט" htmlFor="link_label"><Input id="link_label" name="link_label" defaultValue={l("link").label} /></Field>
              <Field label="כפתור: קישור" htmlFor="link_href"><Input id="link_href" name="link_href" dir="ltr" defaultValue={l("link").href} /></Field>
            </>
          )}
          {section.kind === "text_image" && (
            <Field label="צד התמונה" htmlFor="image_side">
              <Select id="image_side" name="image_side" defaultValue={s("image_side") || "start"}>
                <option value="start">ימין</option>
                <option value="end">שמאל</option>
              </Select>
            </Field>
          )}

          {section.kind === "product_grid" && (
            <>
              <Field label="אילו מוצרים" htmlFor="source">
                <Select id="source" name="source" defaultValue={s("source") || "bestsellers"}>
                  <option value="bestsellers">הנמכרים ביותר</option>
                  <option value="newest">החדשים ביותר</option>
                  <option value="sale">מוצרים במבצע</option>
                  <option value="featured">מומלצים</option>
                </Select>
              </Field>
              <Field label="כמות מוצרים" htmlFor="limit"><Input id="limit" name="limit" type="number" min="1" max="12" dir="ltr" defaultValue={String(d.limit ?? 8)} /></Field>
              <Field label="קישור ״לכל המוצרים״" htmlFor="href" className="sm:col-span-2"><Input id="href" name="href" dir="ltr" defaultValue={s("href")} placeholder="/shop?sort=bestsellers" /></Field>
            </>
          )}

          {section.kind === "rooms" && (
            <Field label="חללים" htmlFor="items" className="sm:col-span-2" hint="שורה לכל חלל: שם | קישור">
              <Textarea id="items" name="items" rows={7} dir="auto" defaultValue={((d.items as Link[]) ?? []).map((i) => `${i.label} | ${i.href}`).join("\n")} />
            </Field>
          )}
          {section.kind === "benefits" && (
            <Field label="יתרונות" htmlFor="items" className="sm:col-span-2" hint="שורה לכל יתרון: סמל | כותרת | טקסט. סמלים: truck, shield, gem, headset">
              <Textarea
                id="items"
                name="items"
                rows={6}
                defaultValue={((d.items as { icon: string; title: string; text: string }[]) ?? []).map((i) => `${i.icon} | ${i.title} | ${i.text}`).join("\n")}
              />
            </Field>
          )}
          {["categories", "collections"].includes(section.kind) && (
            <p className="text-sm text-ink-soft sm:col-span-2">
              {section.kind === "categories" ? "מוצגות הקטגוריות שסומנו ״להציג בעמוד הבית״ במסך הקטגוריות." : "מוצגות 4 הקולקציות הראשונות לפי סדר ההצגה."}
            </p>
          )}

          <Field label="הצגה מ־" htmlFor="starts_at" hint="ריק = מיד"><DateTimeField id="starts_at" name="starts_at" defaultValue={section.starts_at} /></Field>
          <Field label="הצגה עד" htmlFor="ends_at" hint="ריק = ללא הגבלה"><DateTimeField id="ends_at" name="ends_at" defaultValue={section.ends_at} /></Field>
          <label className="flex items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" name="is_active" defaultChecked={section.is_active} className="size-4 accent-[var(--color-brand)]" />
            מוצג באתר
          </label>
          <label className="flex items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" name="hide_on_mobile" defaultChecked={section.hide_on_mobile} className="size-4 accent-[var(--color-brand)]" />
            להסתיר במובייל
          </label>
        </div>
        <Button type="submit" disabled={pending}>{pending ? "שומר…" : "שמירה"}</Button>
      </Card>
    </form>
  );
}
