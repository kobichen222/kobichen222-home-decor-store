import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Friendly "nothing here yet" panel with an icon and a way forward. */
export function EmptyState({
  icon: Icon,
  title,
  text,
  actions = [],
  className,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  actions?: { href: string; label: string; primary?: boolean }[];
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl bg-sand px-6 py-14 text-center sm:py-20", className)}>
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-cream text-gold">
        <Icon className="size-8" strokeWidth={1.3} />
      </span>
      <p className="mt-5 font-display text-xl font-bold sm:text-2xl">{title}</p>
      {text && <p className="mx-auto mt-2 max-w-md text-ink-soft">{text}</p>}
      {actions.length > 0 && (
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {actions.map((a, i) => (
            <Link key={a.href} href={a.href} className={buttonClass(a.primary ?? i === 0 ? "primary" : "outline", "md")}>
              {a.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
