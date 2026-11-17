import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ils = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrice(amount: number | null | undefined): string {
  return ils.format(Number(amount ?? 0));
}

export function formatDate(value: string | Date, withTime = false): string {
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
    timeZone: "Asia/Jerusalem",
  }).format(new Date(value));
}

/** Demo illustrations are SVG; real uploads are raster and get optimised. */
export function isSvg(url: string | null | undefined): boolean {
  return !!url && url.split("?")[0].endsWith(".svg");
}

/** Only same-site relative paths are accepted as redirect targets. */
export function safeInternalPath(path: string | null | undefined, fallback = "/"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  return path;
}
