export const PRESETS = [
  ["7", "7 ימים"],
  ["14", "14 ימים"],
  ["30", "30 ימים"],
  ["90", "90 ימים"],
  ["month", "החודש"],
  ["year", "השנה"],
] as const;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const todayIL = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));

/** Untrusted ?range / ?from / ?to → a validated inclusive date range. */
export function parseRange(sp: Record<string, string | string[] | undefined>) {
  const today = todayIL();
  const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d\d-\d\d$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null);
  const from = date(sp.from);
  const to = date(sp.to);
  if (from && to && from <= to) return { from, to, preset: "custom" as const };
  const preset = PRESETS.find(([v]) => v === sp.range)?.[0] ?? "30";
  const start = new Date(today);
  if (preset === "month") start.setDate(1);
  else if (preset === "year") start.setMonth(0, 1);
  else start.setDate(start.getDate() - (Number(preset) - 1));
  return { from: iso(start), to: iso(today), preset };
}
