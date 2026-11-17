import { z } from "zod";

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "כתובת URL: אותיות לטיניות קטנות, ספרות ומקפים בלבד")
  .max(120);
const money = z.coerce.number().min(0).max(1_000_000);
const optionalMoney = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), money.nullable());
const optionalNumber = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), z.coerce.number().min(0).max(100_000).nullable());
const optionalInt = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), z.coerce.number().int().min(0).max(365).nullable());
const optionalText = (max: number) =>
  z.preprocess((v) => (v === undefined || (typeof v === "string" && v.trim() === "") ? null : v), z.string().trim().max(max).nullable());
const optionalDate = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), z.coerce.date().nullable());

export const variantSchema = z.object({
  id: z.uuid().nullable(),
  sku: z.string().trim().min(1, "חסר מק״ט לווריאציה").max(60),
  name: optionalText(120),
  options: z.record(z.string().max(40), z.string().max(60)),
  price: optionalMoney,
  sale_price: optionalMoney,
  on_hand: z.coerce.number().int().min(0).max(1_000_000),
  low_stock_threshold: z.coerce.number().int().min(0).max(10_000),
  allow_backorder: z.boolean(),
  is_default: z.boolean(),
  is_active: z.boolean(),
});
export type VariantInput = z.infer<typeof variantSchema>;

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "נא להזין שם מוצר").max(160),
    slug,
    sku: z.string().trim().min(1, "נא להזין מק״ט").max(60),
    short_description: optionalText(300),
    description: optionalText(10_000),
    brand_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
    status: z.enum(["draft", "active", "archived"]),
    is_featured: z.boolean(),
    price: money,
    sale_price: optionalMoney,
    cost_price: optionalMoney,
    sale_starts_at: optionalDate,
    sale_ends_at: optionalDate,
    specs: z.array(z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(200) })).max(40),
    width_cm: optionalNumber,
    height_cm: optionalNumber,
    depth_cm: optionalNumber,
    weight_kg: optionalNumber,
    installation_instructions: optionalText(3000),
    care_instructions: optionalText(3000),
    delivery_days_min: optionalInt,
    delivery_days_max: optionalInt,
    shipping_weight_kg: optionalNumber,
    handling_days: optionalInt,
    seo_title: optionalText(70),
    seo_description: optionalText(170),
    noindex: z.boolean(),
    category_ids: z.array(z.uuid()).max(30),
    primary_category_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
    attribute_value_ids: z.array(z.uuid()).max(100),
    variants: z.array(variantSchema).min(1, "נדרשת לפחות וריאציה אחת").max(100),
  })
  .superRefine((v, ctx) => {
    if (v.sale_price !== null && v.sale_price >= v.price) {
      ctx.addIssue({ code: "custom", path: ["sale_price"], message: "מחיר המבצע חייב להיות נמוך מהמחיר הרגיל" });
    }
    if (v.sale_starts_at && v.sale_ends_at && v.sale_ends_at <= v.sale_starts_at) {
      ctx.addIssue({ code: "custom", path: ["sale_ends_at"], message: "סיום המבצע חייב להיות אחרי תחילתו" });
    }
    if (new Set(v.variants.map((x) => x.sku)).size !== v.variants.length) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "מק״ט של וריאציה מופיע יותר מפעם אחת" });
    }
    for (const x of v.variants) {
      if (x.price !== null && x.sale_price !== null && x.sale_price >= x.price) {
        ctx.addIssue({ code: "custom", path: ["variants"], message: `וריאציה ${x.sku}: מחיר המבצע חייב להיות נמוך מהמחיר` });
      }
    }
  });
export type ProductInput = z.infer<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "נא להזין שם").max(80),
  slug,
  parent_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
  description: optionalText(600),
  image_url: optionalText(500),
  sort_order: z.coerce.number().int().min(0).max(100_000),
  is_active: z.boolean(),
  show_on_home: z.boolean(),
  seo_title: optionalText(70),
  seo_description: optionalText(170),
});

/** "צבע: שחור, מידה: 60×90" → { צבע: "שחור", מידה: "60×90" } */
export function parseOptions(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split(/[,\n]/)) {
    const i = part.indexOf(":");
    if (i < 1) continue;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (key && value) out[key] = value;
  }
  return out;
}

export function formatOptions(options: Record<string, string>): string {
  return Object.entries(options)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}
