"use client";
import { Printer } from "lucide-react";

export function PrintButton({ label = "הדפסה" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-sm font-semibold hover:bg-sand print:hidden">
      <Printer className="size-4" />
      {label}
    </button>
  );
}
