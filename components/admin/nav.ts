import type { Permission } from "@/lib/auth/admin";

export type NavItem = { label: string; href?: string; permissions?: Permission[] };
export type NavGroup = { title: string; items: NavItem[] };

// Full information architecture of the admin. Items without an href are
// planned for later development stages and render as "בקרוב".
export const ADMIN_NAV: NavGroup[] = [
  { title: "סקירה כללית", items: [{ label: "לוח בקרה", href: "/admin" }] },
  {
    title: "ניהול מכירות",
    items: [
      { label: "הזמנות", href: "/admin/orders", permissions: ["orders.view"] },
      { label: "לקוחות" },
      { label: "הצעות מחיר" },
      { label: "החזרות" },
    ],
  },
  {
    title: "ניהול קטלוג",
    items: [
      { label: "מוצרים", href: "/admin/products", permissions: ["catalog.manage"] },
      { label: "קטגוריות", href: "/admin/categories", permissions: ["catalog.manage"] },
      { label: "מלאי", href: "/admin/inventory", permissions: ["inventory.manage"] },
      { label: "קולקציות" },
      { label: "מותגים" },
      { label: "מדיה" },
    ],
  },
  { title: "שיווק", items: [{ label: "קופונים" }, { label: "מבצעים" }, { label: "סלים נטושים" }, { label: "לידים" }] },
  { title: "ניהול אתר", items: [{ label: "עמוד הבית" }, { label: "עמודים" }, { label: "באנרים" }, { label: "בלוג" }] },
  { title: "נתונים", items: [{ label: "דוחות מכירה" }, { label: "דוחות מוצרים" }] },
  { title: "הגדרות", items: [{ label: "פרטי החנות" }, { label: "משלוחים" }, { label: "משתמשים והרשאות" }, { label: "יומן פעילות" }] },
];
