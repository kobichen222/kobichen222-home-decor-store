"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";

/**
 * Horizontal, swipeable row with scroll-snap. Touch users swipe; on larger
 * screens arrow buttons page through it. Works in RTL, where scrollLeft is
 * 0 at the start and negative towards the end.
 */
export function Carousel({
  title,
  eyebrow,
  href,
  linkLabel,
  label,
  children,
  className,
}: {
  title: string | null;
  eyebrow?: string;
  href?: string;
  linkLabel?: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLUListElement>(null);
  const [edge, setEdge] = React.useState({ start: true, end: false });

  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const pos = Math.abs(el.scrollLeft);
    setEdge({ start: pos < 4, end: pos + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  React.useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update]);

  function page(direction: 1 | -1) {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    // direction 1 = towards the end of the list.
    el.scrollBy({ left: direction * (rtl ? -1 : 1) * el.clientWidth * 0.85, behavior: "smooth" });
  }

  const controls = (
    <div className={cn("hidden gap-2 md:flex", edge.start && edge.end && "md:hidden")}>
      <button type="button" onClick={() => page(-1)} disabled={edge.start} aria-label="הקודם" className="grid size-10 place-items-center rounded-full border border-line bg-cream transition hover:border-ink disabled:opacity-35 disabled:hover:border-line">
        <ChevronRight className="size-5" />
      </button>
      <button type="button" onClick={() => page(1)} disabled={edge.end} aria-label="הבא" className="grid size-10 place-items-center rounded-full border border-line bg-cream transition hover:border-ink disabled:opacity-35 disabled:hover:border-line">
        <ChevronLeft className="size-5" />
      </button>
    </div>
  );

  return (
    <div className={className}>
      <SectionHeading title={title} eyebrow={eyebrow} href={href} linkLabel={linkLabel}>
        {controls}
      </SectionHeading>
      <ul
        ref={ref}
        onScroll={update}
        aria-label={label}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:gap-6 lg:px-0"
      >
        {children}
      </ul>
    </div>
  );
}
