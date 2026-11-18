import "server-only";
import type { ColumnDef, FieldDef } from "@/components/admin/resource-types";
import { RICHTEXT_HINT } from "@/components/admin/resource-types";
import type { Permission } from "@/lib/auth/admin";

// Every back-office screen that is "a table and a form" is described here
// and served by the generic list / edit pages and actions. Screens with
// their own logic (orders, customers, reports, …) have dedicated pages.
export type Resource = {
  key: string;
  title: string;
  singular: string;
  /** Label of the "create" button / page, e.g. "קופון חדש". */
  newLabel: string;
  description?: string;
  table: string;
  permission: Permission;
  /** Cache tag to expire after a change, so the storefront updates. */
  tag?: "catalog" | "content" | "settings";
  fields: FieldDef[];
  columns: ColumnDef[];
  order: { column: string; ascending: boolean }[];
  search?: string[];
  filter?: { column: string; label: string; options: { value: string; label: string }[] };
  canCreate?: boolean;
  canDelete?: boolean;
  /** A row with this boolean column set cannot be deleted. */
  protectColumn?: string;
  /** Many-to-many product list stored in a join table. */
  productRelation?: { field: string; table: string; fk: string };
  /** Public URL of a row, for the "view on site" link. */
  publicPath?: (row: Record<string, unknown>) => string | null;
  /** Extra links on the edit page. */
  rowLinks?: (row: Record<string, unknown>) => { href: string; label: string }[];
};

const STATUS_DRAFT = [
  { value: "draft", label: "טיוטה" },
  { value: "published", label: "מפורסם" },
];
const seo: FieldDef[] = [
  { name: "seo_title", label: "כותרת SEO", kind: "text", max: 70, hint: "עד 70 תווים" },
  { name: "seo_description", label: "תיאור Meta", kind: "textarea", max: 170, hint: "עד 170 תווים" },
];
const active = (label = "פעיל"): FieldDef => ({ name: "is_active", label, kind: "bool", default: true });

export const RESOURCES: Record<string, Resource> = {
  collections: {
    key: "collections",
    title: "קולקציות",
    singular: "קולקציה",
    newLabel: "קולקציה חדשה",
    description: "קולקציה מקבצת מוצרים מקטגוריות שונות, לפי סגנון, עונה או תקציב.",
    table: "collections",
    permission: "catalog.manage",
    tag: "catalog",
    fields: [
      { name: "name", label: "שם", kind: "text", required: true, max: 80 },
      { name: "slug", label: "כתובת URL", kind: "slug", required: true, hint: "לדוגמה: winter" },
      { name: "description", label: "תיאור", kind: "textarea", wide: true, max: 600 },
      { name: "image_url", label: "תמונה", kind: "image", wide: true },
      { name: "sort_order", label: "סדר הצגה", kind: "number", default: 0 },
      active("פעילה"),
      { name: "product_ids", label: "מוצרים בקולקציה", kind: "products", wide: true },
      ...seo,
    ],
    columns: [
      { name: "image_url", label: "", kind: "image" },
      { name: "name", label: "שם" },
      { name: "slug", label: "כתובת", kind: "ltr" },
      { name: "sort_order", label: "סדר" },
      { name: "is_active", label: "סטטוס", kind: "bool" },
    ],
    order: [{ column: "sort_order", ascending: true }],
    search: ["name", "slug"],
    canCreate: true,
    canDelete: true,
    productRelation: { field: "product_ids", table: "collection_products", fk: "collection_id" },
    publicPath: (r) => `/collections/${r.slug}`,
  },

  brands: {
    key: "brands",
    title: "מותגים",
    singular: "מותג",
    newLabel: "מותג חדש",
    table: "brands",
    permission: "catalog.manage",
    tag: "catalog",
    fields: [
      { name: "name", label: "שם", kind: "text", required: true, max: 80 },
      { name: "slug", label: "כתובת URL", kind: "slug", required: true },
      { name: "logo_url", label: "לוגו", kind: "image", wide: true },
      active(),
    ],
    columns: [
      { name: "logo_url", label: "", kind: "image" },
      { name: "name", label: "שם" },
      { name: "slug", label: "כתובת", kind: "ltr" },
      { name: "is_active", label: "סטטוס", kind: "bool" },
    ],
    order: [{ column: "name", ascending: true }],
    search: ["name"],
    canCreate: true,
    canDelete: true,
  },

  coupons: {
    key: "coupons",
    title: "קופונים",
    singular: "קופון",
    newLabel: "קופון חדש",
    description: "הלקוח מזין את הקוד בסל. כל ההגבלות נאכפות בשרת, כולל מימוש בו־זמני.",
    table: "coupons",
    permission: "marketing.manage",
    fields: [
      { name: "code", label: "קוד", kind: "code", required: true, hint: "אותיות לטיניות וספרות, 3–32 תווים" },
      { name: "description", label: "תיאור פנימי", kind: "text", max: 120 },
      {
        name: "kind",
        label: "סוג הנחה",
        kind: "select",
        required: true,
        options: [
          { value: "percent", label: "אחוז הנחה" },
          { value: "fixed", label: "סכום קבוע (₪)" },
          { value: "free_shipping", label: "משלוח חינם" },
        ],
      },
      { name: "value", label: "ערך", kind: "money", default: 0, hint: "אחוזים או ₪. במשלוח חינם: 0" },
      { name: "min_order", label: "מינימום הזמנה (₪)", kind: "money", default: 0 },
      { name: "usage_limit", label: "מגבלת שימושים כוללת", kind: "number", hint: "ריק = ללא הגבלה" },
      { name: "per_customer_limit", label: "מגבלה ללקוח", kind: "number", hint: "לפי כתובת דוא״ל. ריק = ללא הגבלה" },
      { name: "starts_at", label: "תחילת תוקף", kind: "datetime" },
      { name: "ends_at", label: "סוף תוקף", kind: "datetime" },
      { name: "is_stackable", label: "משתלב עם מבצעים אוטומטיים", kind: "bool", hint: "אחרת, ההנחה הגדולה מבין השתיים חלה" },
      active(),
      { name: "used_count", label: "מימושים עד כה", kind: "readonly" },
    ],
    columns: [
      { name: "code", label: "קוד", kind: "ltr" },
      { name: "description", label: "תיאור" },
      { name: "kind", label: "סוג", kind: "badge", labels: { percent: "אחוזים", fixed: "סכום", free_shipping: "משלוח חינם" } },
      { name: "value", label: "ערך" },
      { name: "used_count", label: "מומש" },
      { name: "ends_at", label: "בתוקף עד", kind: "date" },
      { name: "is_active", label: "סטטוס", kind: "bool" },
    ],
    order: [{ column: "created_at", ascending: false }],
    search: ["code", "description"],
    canCreate: true,
    canDelete: true,
  },

  promotions: {
    key: "promotions",
    title: "מבצעים",
    singular: "מבצע",
    newLabel: "מבצע חדש",
    description:
      "מבצע חל אוטומטית, בלי קוד. ההנחה הגבוהה מבין המבצעים הפעילים חלה; מבצע משלוח חינם חל בנוסף.",
    table: "promotions",
    permission: "marketing.manage",
    tag: "catalog",
    fields: [
      { name: "name", label: "שם המבצע", kind: "text", required: true, max: 80, hint: "מוצג ללקוח בסל" },
      { name: "description", label: "תיאור פנימי", kind: "text", max: 200 },
      {
        name: "kind",
        label: "סוג",
        kind: "select",
        required: true,
        options: [
          { value: "percent", label: "אחוז הנחה" },
          { value: "fixed", label: "סכום קבוע (₪)" },
          { value: "free_shipping", label: "משלוח חינם" },
        ],
      },
      { name: "value", label: "ערך", kind: "money", default: 0 },
      { name: "category_id", label: "רק על קטגוריה", kind: "select", optionsFrom: "categories", emptyLabel: "כל המוצרים", hint: "כולל תתי־הקטגוריות" },
      { name: "product_id", label: "רק על מוצר", kind: "select", optionsFrom: "products", emptyLabel: "כל המוצרים" },
      { name: "min_subtotal", label: "בקנייה מעל (₪)", kind: "money", default: 0 },
      { name: "starts_at", label: "התחלה", kind: "datetime" },
      { name: "ends_at", label: "סיום", kind: "datetime" },
      active("פעיל"),
    ],
    columns: [
      { name: "name", label: "שם" },
      { name: "kind", label: "סוג", kind: "badge", labels: { percent: "אחוזים", fixed: "סכום", free_shipping: "משלוח חינם" } },
      { name: "value", label: "ערך" },
      { name: "min_subtotal", label: "מינימום", kind: "money" },
      { name: "starts_at", label: "התחלה", kind: "date" },
      { name: "ends_at", label: "סיום", kind: "date" },
      { name: "is_active", label: "סטטוס", kind: "bool" },
    ],
    order: [{ column: "created_at", ascending: false }],
    search: ["name"],
    canCreate: true,
    canDelete: true,
  },

  leads: {
    key: "leads",
    title: "לידים ופניות",
    singular: "פנייה",
    newLabel: "פנייה חדשה",
    description: "פניות מטופס יצירת הקשר באתר.",
    table: "leads",
    permission: "marketing.manage",
    fields: [
      { name: "kind", label: "סוג", kind: "readonly" },
      { name: "created_at", label: "התקבלה", kind: "readonly" },
      { name: "full_name", label: "שם", kind: "readonly" },
      { name: "email", label: "דוא״ל", kind: "readonly" },
      { name: "phone", label: "טלפון", kind: "readonly" },
      { name: "message", label: "הודעה / פרטי הפרויקט", kind: "readonly", wide: true },
      {
        name: "status",
        label: "סטטוס טיפול",
        kind: "select",
        required: true,
        options: [
          { value: "new", label: "חדשה" },
          { value: "in_progress", label: "בטיפול" },
          { value: "closed", label: "סגורה" },
        ],
      },
    ],
    columns: [
      { name: "created_at", label: "תאריך", kind: "date" },
      { name: "full_name", label: "שם" },
      { name: "email", label: "דוא״ל", kind: "ltr" },
      { name: "phone", label: "טלפון", kind: "ltr" },
      { name: "kind", label: "סוג", kind: "badge", labels: { contact: "יצירת קשר", quote: "הצעת מחיר", business_project: "פרויקט עסקי", newsletter: "דיוור" }, tones: { business_project: "info" } },
      {
        name: "status",
        label: "סטטוס",
        kind: "badge",
        labels: { new: "חדשה", in_progress: "בטיפול", closed: "סגורה" },
        tones: { new: "info", in_progress: "warning", closed: "neutral" },
      },
    ],
    order: [{ column: "created_at", ascending: false }],
    search: ["full_name", "email", "phone", "message"],
    filter: {
      column: "status",
      label: "סטטוס",
      options: [
        { value: "new", label: "חדשות" },
        { value: "in_progress", label: "בטיפול" },
        { value: "closed", label: "סגורות" },
      ],
    },
    canCreate: false,
    canDelete: true,
    rowLinks: (r) => [
      { href: `/admin/quotes/new?lead=${r.id}`, label: "יצירת הצעת מחיר" },
      ...(r.email ? [{ href: `mailto:${r.email}`, label: "מענה בדוא״ל" }] : []),
    ],
  },

  pages: {
    key: "pages",
    title: "עמודי תוכן",
    singular: "עמוד",
    newLabel: "עמוד חדש",
    description: "אודות, משלוחים, תקנון, פרטיות ועמודים שיווקיים. עמוד הבית נערך במסך ״עמוד הבית״.",
    table: "pages",
    permission: "content.manage",
    tag: "content",
    fields: [
      { name: "title", label: "כותרת", kind: "text", required: true, max: 120 },
      { name: "slug", label: "כתובת URL", kind: "slug", required: true, lockWhen: "is_system", hint: "העמוד יוצג בכתובת /<כתובת>" },
      { name: "status", label: "סטטוס", kind: "select", required: true, options: STATUS_DRAFT, default: "draft" },
      { name: "body", label: "תוכן", kind: "richtext", wide: true, hint: RICHTEXT_HINT },
      ...seo,
      { name: "noindex", label: "להסתיר ממנועי חיפוש", kind: "bool" },
    ],
    columns: [
      { name: "title", label: "כותרת" },
      { name: "slug", label: "כתובת", kind: "ltr" },
      { name: "status", label: "סטטוס", kind: "badge", labels: { draft: "טיוטה", published: "מפורסם" }, tones: { draft: "neutral", published: "success" } },
      { name: "updated_at", label: "עודכן", kind: "date" },
    ],
    order: [{ column: "title", ascending: true }],
    search: ["title", "slug"],
    canCreate: true,
    canDelete: true,
    protectColumn: "is_system",
    publicPath: (r) => (r.slug === "home" ? "/" : `/${r.slug}`),
  },

  banners: {
    key: "banners",
    title: "באנרים והודעות",
    singular: "באנר",
    newLabel: "באנר חדש",
    description: "ההודעות המתחלפות ברצועה שמעל התפריט. אפשר לתזמן הופעה והסתרה.",
    table: "banners",
    permission: "content.manage",
    tag: "content",
    fields: [
      { name: "title", label: "טקסט ההודעה", kind: "text", required: true, max: 140, wide: true },
      { name: "link_url", label: "קישור", kind: "text", max: 300, hint: "לדוגמה: /shop?sale=1 (לא חובה)" },
      { name: "placement", label: "מיקום", kind: "select", required: true, options: [{ value: "announcement", label: "רצועת הודעות עליונה" }], default: "announcement" },
      { name: "sort_order", label: "סדר", kind: "number", default: 0 },
      { name: "starts_at", label: "הצגה מ־", kind: "datetime" },
      { name: "ends_at", label: "הצגה עד", kind: "datetime" },
      active("מוצג"),
    ],
    columns: [
      { name: "title", label: "הודעה" },
      { name: "sort_order", label: "סדר" },
      { name: "starts_at", label: "מ־", kind: "date" },
      { name: "ends_at", label: "עד", kind: "date" },
      { name: "is_active", label: "סטטוס", kind: "bool" },
    ],
    order: [{ column: "sort_order", ascending: true }],
    search: ["title"],
    canCreate: true,
    canDelete: true,
  },

  blog: {
    key: "blog",
    title: "בלוג",
    singular: "מאמר",
    newLabel: "מאמר חדש",
    description: "מאמרים ומדריכים. מאמר מתפרסם באתר כשהסטטוס ״מפורסם״ ותאריך הפרסום הגיע.",
    table: "blog_posts",
    permission: "content.manage",
    tag: "content",
    fields: [
      { name: "title", label: "כותרת", kind: "text", required: true, max: 160, wide: true },
      { name: "slug", label: "כתובת URL", kind: "slug", required: true, hint: "יוצג בכתובת /blog/<כתובת>" },
      { name: "category_id", label: "קטגוריה", kind: "select", optionsFrom: "blog_categories", emptyLabel: "ללא" },
      { name: "status", label: "סטטוס", kind: "select", required: true, options: STATUS_DRAFT, default: "draft" },
      { name: "published_at", label: "תאריך פרסום", kind: "datetime", hint: "ריק = עכשיו, בעת הפרסום. תאריך עתידי = פרסום מתוזמן" },
      { name: "cover_image_url", label: "תמונה ראשית", kind: "image", wide: true },
      { name: "excerpt", label: "תקציר", kind: "textarea", max: 300, wide: true },
      { name: "body", label: "תוכן המאמר", kind: "richtext", wide: true, hint: RICHTEXT_HINT },
      { name: "tags", label: "תגיות", kind: "tags", hint: "מופרדות בפסיקים" },
      ...seo,
    ],
    columns: [
      { name: "cover_image_url", label: "", kind: "image" },
      { name: "title", label: "כותרת" },
      { name: "status", label: "סטטוס", kind: "badge", labels: { draft: "טיוטה", published: "מפורסם" }, tones: { draft: "neutral", published: "success" } },
      { name: "published_at", label: "פורסם", kind: "date" },
      { name: "updated_at", label: "עודכן", kind: "date" },
    ],
    order: [{ column: "created_at", ascending: false }],
    search: ["title", "slug"],
    canCreate: true,
    canDelete: true,
    publicPath: (r) => (r.status === "published" ? `/blog/${r.slug}` : null),
  },

  "blog-categories": {
    key: "blog-categories",
    title: "קטגוריות בלוג",
    singular: "קטגוריית בלוג",
    newLabel: "קטגוריה חדשה",
    table: "blog_categories",
    permission: "content.manage",
    tag: "content",
    fields: [
      { name: "name", label: "שם", kind: "text", required: true, max: 60 },
      { name: "slug", label: "כתובת URL", kind: "slug", required: true },
    ],
    columns: [
      { name: "name", label: "שם" },
      { name: "slug", label: "כתובת", kind: "ltr" },
    ],
    order: [{ column: "name", ascending: true }],
    canCreate: true,
    canDelete: true,
  },

  shipping: {
    key: "shipping",
    title: "שיטות משלוח",
    singular: "שיטת משלוח",
    newLabel: "שיטת משלוח חדשה",
    description: "השיטות שהלקוח בוחר בקופה. המחיר מחושב בשרת; משלוח חינם חל מעל הסכום שהוגדר (אחרי הנחות).",
    table: "shipping_methods",
    permission: "shipping.manage",
    fields: [
      { name: "name", label: "שם", kind: "text", required: true, max: 60 },
      { name: "code", label: "קוד פנימי", kind: "slug", required: true },
      { name: "description", label: "תיאור ללקוח", kind: "text", max: 160, wide: true },
      {
        name: "kind",
        label: "סוג",
        kind: "select",
        required: true,
        options: [
          { value: "delivery", label: "משלוח עד הבית" },
          { value: "business", label: "משלוח לעסק" },
          { value: "pickup", label: "איסוף עצמי" },
        ],
      },
      { name: "price", label: "מחיר (₪)", kind: "money", required: true, default: 0 },
      { name: "free_above", label: "חינם בקנייה מעל (₪)", kind: "money", hint: "ריק = לעולם לא חינם" },
      { name: "delivery_days_min", label: "ימי אספקה מ־", kind: "number" },
      { name: "delivery_days_max", label: "ימי אספקה עד", kind: "number" },
      { name: "requires_address", label: "דורש כתובת למשלוח", kind: "bool", default: true },
      { name: "sort_order", label: "סדר", kind: "number", default: 0 },
      active("זמין בקופה"),
    ],
    columns: [
      { name: "name", label: "שם" },
      { name: "price", label: "מחיר", kind: "money" },
      { name: "free_above", label: "חינם מעל", kind: "money" },
      { name: "delivery_days_max", label: "עד ימים" },
      { name: "is_active", label: "סטטוס", kind: "bool" },
    ],
    order: [{ column: "sort_order", ascending: true }],
    canCreate: true,
    canDelete: true,
  },
};

// Added after the initial set: moderation, FAQs, redirects.
Object.assign(RESOURCES, {
  reviews: {
    key: "reviews",
    title: "חוות דעת",
    singular: "חוות דעת",
    newLabel: "חוות דעת חדשה",
    description: "חוות דעת של לקוחות שרכשו את המוצר. מתפרסמות באתר רק אחרי אישור.",
    table: "reviews",
    permission: "content.manage",
    tag: "catalog",
    fields: [
      { name: "author_name", label: "שם לתצוגה", kind: "text", required: true, max: 40 },
      { name: "rating", label: "דירוג (1–5)", kind: "number", required: true },
      { name: "title", label: "כותרת", kind: "text", max: 80 },
      { name: "body", label: "תוכן", kind: "textarea", wide: true, max: 2000 },
      { name: "email", label: "דוא״ל הכותב", kind: "readonly" },
      { name: "is_verified", label: "רכישה מאומתת", kind: "readonly" },
      {
        name: "status",
        label: "סטטוס",
        kind: "select",
        required: true,
        options: [
          { value: "pending", label: "ממתינה לאישור" },
          { value: "approved", label: "מאושרת ומפורסמת" },
          { value: "rejected", label: "נדחתה" },
        ],
      },
    ],
    columns: [
      { name: "created_at", label: "תאריך", kind: "date" },
      { name: "author_name", label: "כותב" },
      { name: "rating", label: "דירוג" },
      { name: "title", label: "כותרת" },
      { name: "status", label: "סטטוס", kind: "badge", labels: { pending: "ממתינה", approved: "מאושרת", rejected: "נדחתה" }, tones: { pending: "warning", approved: "success", rejected: "neutral" } },
    ],
    order: [{ column: "created_at", ascending: false }],
    search: ["author_name", "title", "body"],
    filter: { column: "status", label: "סטטוס", options: [{ value: "pending", label: "ממתינות" }, { value: "approved", label: "מאושרות" }, { value: "rejected", label: "נדחו" }] },
    canCreate: false,
    canDelete: true,
  },
  faqs: {
    key: "faqs",
    title: "שאלות ותשובות",
    singular: "שאלה",
    newLabel: "שאלה חדשה",
    description: "שאלה עם מוצר מוצגת בעמוד המוצר; בלי מוצר — בעמוד ״שאלות נפוצות״.",
    table: "faqs",
    permission: "content.manage",
    tag: "content",
    fields: [
      { name: "question", label: "שאלה", kind: "text", required: true, max: 200, wide: true },
      { name: "answer", label: "תשובה", kind: "textarea", required: true, max: 3000, wide: true },
      { name: "product_id", label: "מוצר", kind: "select", optionsFrom: "products", emptyLabel: "שאלה כללית (עמוד שאלות נפוצות)" },
      { name: "sort_order", label: "סדר", kind: "number", default: 0 },
      { name: "is_active", label: "מוצגת", kind: "bool", default: true },
    ],
    columns: [
      { name: "question", label: "שאלה" },
      { name: "sort_order", label: "סדר" },
      { name: "is_active", label: "סטטוס", kind: "bool" },
    ],
    order: [{ column: "sort_order", ascending: true }],
    search: ["question", "answer"],
    canCreate: true,
    canDelete: true,
  },
  redirects: {
    key: "redirects",
    title: "הפניות (301)",
    singular: "הפניה",
    newLabel: "הפניה חדשה",
    description: "כתובת ישנה שמפנה לחדשה. נוצרת אוטומטית כשמשנים כתובת URL של מוצר, קטגוריה, קולקציה, מאמר או עמוד.",
    table: "redirects",
    permission: "content.manage",
    fields: [
      { name: "from_path", label: "מכתובת", kind: "text", required: true, max: 300, hint: "לדוגמה: /product/old-name" },
      { name: "to_path", label: "לכתובת", kind: "text", required: true, max: 300, hint: "לדוגמה: /product/new-name" },
      { name: "status_code", label: "סוג", kind: "select", required: true, options: [{ value: "301", label: "301 – קבועה" }, { value: "302", label: "302 – זמנית" }], default: "301" },
    ],
    columns: [
      { name: "from_path", label: "מכתובת", kind: "ltr" },
      { name: "to_path", label: "לכתובת", kind: "ltr" },
      { name: "status_code", label: "סוג" },
    ],
    order: [{ column: "created_at", ascending: false }],
    search: ["from_path", "to_path"],
    canCreate: true,
    canDelete: true,
  },
  "business-accounts": {
    key: "business-accounts",
    title: "חשבונות עסקיים",
    singular: "חשבון עסקי",
    newLabel: "חשבון עסקי חדש",
    description: "לקוח רשום מבקש חשבון עסקי מהאזור האישי. לאחר אישור, אחוז ההנחה חל אוטומטית בסל ובקופה.",
    table: "business_accounts",
    permission: "customers.manage",
    fields: [
      { name: "company_name", label: "שם החברה", kind: "text", required: true, max: 120 },
      { name: "company_number", label: "ח.פ. / עוסק מורשה", kind: "text", max: 20 },
      {
        name: "status",
        label: "סטטוס",
        kind: "select",
        required: true,
        options: [
          { value: "pending", label: "ממתין לאישור" },
          { value: "approved", label: "מאושר" },
          { value: "rejected", label: "נדחה" },
        ],
      },
      { name: "discount_percent", label: "הנחה קבועה (%)", kind: "money", default: 0, hint: "חלה על המוצרים בכל הזמנה, אחרי מבצעים אוטומטיים" },
      { name: "notes", label: "הערות פנימיות", kind: "textarea", wide: true, max: 2000 },
      { name: "created_at", label: "הוגש", kind: "readonly" },
    ],
    columns: [
      { name: "company_name", label: "חברה" },
      { name: "company_number", label: "ח.פ.", kind: "ltr" },
      { name: "discount_percent", label: "הנחה %" },
      { name: "status", label: "סטטוס", kind: "badge", labels: { pending: "ממתין", approved: "מאושר", rejected: "נדחה" }, tones: { pending: "warning", approved: "success", rejected: "neutral" } },
      { name: "created_at", label: "הוגש", kind: "date" },
    ],
    order: [{ column: "created_at", ascending: false }],
    search: ["company_name", "company_number"],
    filter: { column: "status", label: "סטטוס", options: [{ value: "pending", label: "ממתינים" }, { value: "approved", label: "מאושרים" }, { value: "rejected", label: "נדחו" }] },
    canCreate: false,
    canDelete: true,
  },
} satisfies Record<string, Resource>);

export function getResource(key: string): Resource | null {
  return Object.hasOwn(RESOURCES, key) ? RESOURCES[key] : null;
}

/** The client form only receives the serializable part. */
export function clientResource(r: Resource) {
  return {
    key: r.key,
    title: r.title,
    singular: r.singular,
    newLabel: r.newLabel,
    fields: r.fields,
    canDelete: !!r.canDelete,
    protectColumn: r.protectColumn ?? null,
  };
}
export type ClientResource = ReturnType<typeof clientResource>;
