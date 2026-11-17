import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^0(5\d|7\d|[23489])\d{7}$/, "מספר הטלפון אינו תקין"));

export const checkoutSchema = z
  .object({
    name: text(80).min(2, "נא להזין שם מלא"),
    phone,
    email: z.email("כתובת הדוא״ל אינה תקינה").max(254),
    customer_type: z.enum(["private", "business"]),
    company_name: text(120).optional(),
    company_number: z
      .string()
      .trim()
      .regex(/^\d{8,9}$/, "ח.פ. / עוסק מורשה: 8–9 ספרות")
      .optional()
      .or(z.literal("")),
    shipping_method_id: z.uuid("נא לבחור שיטת אספקה"),
    requires_address: z.boolean(),
    city: text(60).optional(),
    street: text(80).optional(),
    house_number: text(10).optional(),
    apartment: text(10).optional(),
    zip: z
      .string()
      .trim()
      .regex(/^\d{5,7}$/, "מיקוד: 5–7 ספרות")
      .optional()
      .or(z.literal("")),
    address_notes: text(200).optional(),
    note: text(500).optional(),
    terms: z.literal(true, "יש לאשר את התקנון ומדיניות הפרטיות"),
  })
  .superRefine((v, ctx) => {
    if (v.customer_type === "business" && !v.company_name) {
      ctx.addIssue({ code: "custom", path: ["company_name"], message: "נא להזין שם חברה" });
    }
    if (v.requires_address) {
      if (!v.city || v.city.length < 2) ctx.addIssue({ code: "custom", path: ["city"], message: "נא להזין עיר" });
      if (!v.street || v.street.length < 2) ctx.addIssue({ code: "custom", path: ["street"], message: "נא להזין רחוב" });
      if (!v.house_number) ctx.addIssue({ code: "custom", path: ["house_number"], message: "נא להזין מספר בית" });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type CheckoutErrors = Partial<Record<keyof CheckoutInput, string>>;

export function fieldErrors(error: z.ZodError): CheckoutErrors {
  const out: CheckoutErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof CheckoutInput;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
