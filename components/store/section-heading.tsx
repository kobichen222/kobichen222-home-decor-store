import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { safeInternalPath } from "@/lib/utils";

/** Section title row: eyebrow + title on the start side, link and optional controls on the end. */
export function SectionHeading({
  title,
  eyebrow,
  href,
  linkLabel = "לכל המוצרים",
  children,
}: {
  title: string | null;
  eyebrow?: string;
  href?: string;
  linkLabel?: string;
  children?: React.ReactNode;
}) {
  if (!title) return null;
  return (
    <div className="mb-7 flex items-end justify-between gap-4 lg:mb-9">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-semibold tracking-[0.22em] text-gold-ink">{eyebrow}</p>}
        <h2 className="text-[1.65rem] font-bold tracking-tight lg:text-[2.1rem]">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-5">
        {href && (
          <Link href={safeInternalPath(href, "/shop")} className="group flex items-center gap-1.5 text-sm font-semibold text-brand">
            {linkLabel}
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}
