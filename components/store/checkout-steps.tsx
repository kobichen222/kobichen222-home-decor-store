import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["סל קניות", "פרטים ומשלוח", "תשלום"];

/** Where the shopper is in the purchase: cart → details → payment. */
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mb-8 flex items-center gap-2 text-sm sm:gap-3" aria-label="שלבי ההזמנה">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3" aria-current={active ? "step" : undefined}>
            {i > 0 && <span aria-hidden="true" className={cn("h-px w-6 sm:w-12", done || active ? "bg-ink" : "bg-line")} />}
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                done ? "bg-success text-cream" : active ? "bg-ink text-cream" : "border border-line text-ink-soft",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
            </span>
            <span className={cn("font-semibold", !active && "text-ink-soft", !active && "max-sm:sr-only")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
