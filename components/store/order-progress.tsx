import { Check, PackageCheck, PackageOpen, Receipt, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "התקבלה", icon: Receipt, statuses: ["paid", "processing"] },
  { label: "בהכנה", icon: PackageOpen, statuses: ["preparing", "ready_to_ship"] },
  { label: "נשלחה", icon: Truck, statuses: ["shipped"] },
  { label: "נמסרה", icon: PackageCheck, statuses: ["delivered"] },
];

/** Where a paid order is on its way to the customer. */
export function OrderProgress({ status, pickup }: { status: string; pickup?: boolean }) {
  const current = STEPS.findIndex((s) => s.statuses.includes(status));
  if (current < 0) return null;
  const steps = pickup ? STEPS.map((s, i) => (i === 2 ? { ...s, label: "מוכנה לאיסוף" } : i === 3 ? { ...s, label: "נאספה" } : s)) : STEPS;
  return (
    <ol className="grid grid-cols-4" aria-label="מצב ההזמנה">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = done ? Check : s.icon;
        return (
          <li key={s.label} className="relative flex flex-col items-center text-center" aria-current={active ? "step" : undefined}>
            {i > 0 && (
              <span aria-hidden="true" className={cn("absolute end-1/2 top-5 h-0.5 w-full -translate-y-1/2", i <= current ? "bg-success" : "bg-line")} />
            )}
            <span
              className={cn(
                "relative z-10 grid size-10 place-items-center rounded-full border-2",
                done ? "border-success bg-success text-cream" : active ? "border-success bg-cream text-success" : "border-line bg-cream text-ink-soft",
              )}
            >
              <Icon className="size-[1.1rem]" strokeWidth={2} />
            </span>
            <span className={cn("mt-2 text-xs font-semibold sm:text-sm", !done && !active && "text-ink-soft")}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
