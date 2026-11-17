import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

export function AdminHeader({ title, description, back, children }: { title: string; description?: string; back?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        {back && (
          <Link href={back.href} className="mb-1 block text-sm font-semibold text-ink-soft hover:text-brand">
            → {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold lg:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-line bg-white", className)} {...props} />;
}

// On small screens tables scroll horizontally inside their card.
export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-start [&_th]:text-xs [&_th]:font-bold [&_th]:text-ink-soft [&_tbody_tr]:border-t [&_tbody_tr]:border-line">
        {children}
      </table>
    </Card>
  );
}

const TONES = {
  neutral: "bg-sand text-ink-soft",
  success: "bg-success/15 text-success",
  warning: "bg-gold/25 text-brand-dark",
  danger: "bg-danger/10 text-danger",
  info: "bg-ink text-cream",
} as const;

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold", TONES[tone])}>{children}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <Card className="px-6 py-16 text-center text-ink-soft">{children}</Card>;
}
