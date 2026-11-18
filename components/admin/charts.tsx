import { formatPrice } from "@/lib/utils";

// Single-series charts in the brand colour: no legend (the title names the
// series), a value on hover/focus for every bar, and a table next to it.

export function DailyBars({ data, label }: { data: { day: string; revenue: number; orders: number }[]; label: string }) {
  const max = Math.max(...data.map((d) => Number(d.revenue)), 1);
  const fmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric" });
  const step = Math.ceil(data.length / 8);
  return (
    <figure>
      <div role="img" aria-label={label} className="flex h-48 items-end gap-[2px] border-b border-line pt-6" dir="ltr">
        {data.map((d) => {
          const h = (Number(d.revenue) / max) * 100;
          return (
            <div key={d.day} tabIndex={0} className="group relative flex h-full flex-1 items-end outline-none">
              <div className="w-full rounded-t-[4px] bg-brand/85 transition-colors group-hover:bg-brand group-focus:bg-brand" style={{ height: `${Math.max(h, Number(d.revenue) > 0 ? 2 : 0)}%` }} />
              <div className="pointer-events-none absolute bottom-full start-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-cream shadow-soft group-hover:block group-focus:block" dir="rtl">
                <div className="font-semibold">{fmt.format(new Date(d.day))}</div>
                <div>{formatPrice(d.revenue)} · {d.orders} הזמנות</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px] text-[0.68rem] text-ink-soft" dir="ltr">
        {data.map((d, i) => (
          <span key={d.day} className="flex-1 text-center">{i % step === 0 ? fmt.format(new Date(d.day)) : ""}</span>
        ))}
      </div>
    </figure>
  );
}

export function HBars({ rows, valueLabel = "הכנסות" }: { rows: { name: string; value: number; sub?: string }[]; valueLabel?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  if (!rows.length) return <p className="py-6 text-center text-sm text-ink-soft">אין נתונים לתקופה</p>;
  return (
    <table className="w-full text-sm">
      <thead className="sr-only"><tr><th>שם</th><th>{valueLabel}</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.name}>
            <td className="w-2/5 py-1.5 pe-3 align-middle">
              <span className="line-clamp-1">{r.name}</span>
              {r.sub && <span className="block text-xs text-ink-soft">{r.sub}</span>}
            </td>
            <td className="py-1.5 align-middle">
              <div className="flex items-center gap-2">
                <div className="h-3.5 rounded-e-[4px] bg-brand/85" style={{ width: `${Math.max((r.value / max) * 100, 1)}%` }} />
                <span className="shrink-0 tabular-nums text-ink-soft">{formatPrice(r.value)}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
