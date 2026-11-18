// Shared (client + server) description of a generic admin resource.
export type FieldKind =
  | "text"
  | "textarea"
  | "richtext"
  | "email"
  | "slug"
  | "code"
  | "number"
  | "money"
  | "bool"
  | "select"
  | "datetime"
  | "image"
  | "tags"
  | "products"
  | "readonly";

export type Option = { value: string; label: string };

export type FieldDef = {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  hint?: string;
  max?: number;
  wide?: boolean;
  options?: Option[];
  /** Options loaded from the database when the form renders. */
  optionsFrom?: "categories" | "products" | "blog_categories";
  /** Empty choice label for optional selects. */
  emptyLabel?: string;
  default?: string | number | boolean;
  /** Locked once the row exists (e.g. system page slugs). */
  lockWhen?: string;
};

export type ColumnDef = {
  name: string;
  label: string;
  kind?: "text" | "money" | "date" | "bool" | "badge" | "image" | "ltr";
  labels?: Record<string, string>;
  tones?: Record<string, "neutral" | "success" | "warning" | "danger" | "info">;
};

export const RICHTEXT_HINT = "שורה ריקה = פסקה חדשה · ## כותרת · - פריט ברשימה · **הדגשה** · [טקסט](https://קישור)";
