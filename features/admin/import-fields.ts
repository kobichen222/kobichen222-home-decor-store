// Shared by the import wizard (client) and the import action (server).
export const IMPORT_FIELDS = [
  ["sku", "מק״ט (חובה)"],
  ["name", "שם מוצר"],
  ["price", "מחיר"],
  ["sale_price", "מחיר מבצע"],
  ["stock", "כמות במלאי"],
  ["category", "קטגוריה (שם או כתובת)"],
  ["status", "סטטוס (פעיל/טיוטה)"],
  ["short_description", "תיאור קצר"],
  ["description", "תיאור מלא"],
  ["slug", "כתובת URL"],
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number][0];
export type ImportRow = Partial<Record<ImportField, string>>;
export type RowResult = { row: number; sku: string; action: "create" | "update" | "skip" | "error"; message?: string };

