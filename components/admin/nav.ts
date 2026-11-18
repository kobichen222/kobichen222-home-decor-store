import type { Permission } from "@/lib/auth/admin";

export type NavItem = { label: string; href: string; permissions?: Permission[] };
export type NavGroup = { title: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  { title: "סקירה כללית", items: [{ label: "לוח בקרה", href: "/admin" }] },
  {
    title: "ניהול מכירות",
    items: [
      { label: "הזמנות", href: "/admin/orders", permissions: ["orders.view"] },
      { label: "לקוחות", href: "/admin/customers", permissions: ["customers.view"] },
      { label: "חשבונות עסקיים", href: "/admin/business-accounts", permissions: ["customers.manage"] },
      { label: "הצעות מחיר", href: "/admin/quotes", permissions: ["orders.manage"] },
      { label: "החזרות", href: "/admin/returns", permissions: ["orders.view"] },
    ],
  },
  {
    title: "ניהול קטלוג",
    items: [
      { label: "מוצרים", href: "/admin/products", permissions: ["catalog.manage"] },
      { label: "קטגוריות", href: "/admin/categories", permissions: ["catalog.manage"] },
      { label: "קולקציות", href: "/admin/collections", permissions: ["catalog.manage"] },
      { label: "מותגים", href: "/admin/brands", permissions: ["catalog.manage"] },
      { label: "מלאי", href: "/admin/inventory", permissions: ["inventory.manage"] },
      { label: "מדיה", href: "/admin/media", permissions: ["catalog.manage", "content.manage"] },
    ],
  },
  {
    title: "שיווק",
    items: [
      { label: "קופונים", href: "/admin/coupons", permissions: ["marketing.manage"] },
      { label: "מבצעים", href: "/admin/promotions", permissions: ["marketing.manage"] },
      { label: "סלים נטושים", href: "/admin/abandoned-carts", permissions: ["marketing.manage"] },
      { label: "לידים", href: "/admin/leads", permissions: ["marketing.manage"] },
    ],
  },
  {
    title: "ניהול אתר",
    items: [
      { label: "עמוד הבית", href: "/admin/home", permissions: ["content.manage"] },
      { label: "עמודים", href: "/admin/pages", permissions: ["content.manage"] },
      { label: "באנרים", href: "/admin/banners", permissions: ["content.manage"] },
      { label: "בלוג", href: "/admin/blog", permissions: ["content.manage"] },
      { label: "קטגוריות בלוג", href: "/admin/blog-categories", permissions: ["content.manage"] },
      { label: "חוות דעת", href: "/admin/reviews", permissions: ["content.manage"] },
      { label: "שאלות ותשובות", href: "/admin/faqs", permissions: ["content.manage"] },
      { label: "הפניות 301", href: "/admin/redirects", permissions: ["content.manage"] },
    ],
  },
  {
    title: "נתונים",
    items: [
      { label: "דוחות מכירה", href: "/admin/reports", permissions: ["reports.view", "finance.view"] },
      { label: "דוחות מוצרים", href: "/admin/reports/products", permissions: ["reports.view", "catalog.manage"] },
      { label: "ייבוא וייצוא", href: "/admin/import-export", permissions: ["catalog.manage", "orders.view", "customers.view", "inventory.manage"] },
    ],
  },
  {
    title: "הגדרות",
    items: [
      { label: "פרטי החנות", href: "/admin/settings", permissions: ["settings.manage"] },
      { label: "משלוחים", href: "/admin/shipping", permissions: ["shipping.manage"] },
      { label: "משתמשים והרשאות", href: "/admin/users", permissions: ["users.manage"] },
      { label: "יומן פעילות", href: "/admin/audit-log", permissions: ["settings.manage", "users.manage"] },
      { label: "אבטחת החשבון (2FA)", href: "/admin/security" },
    ],
  },
];
