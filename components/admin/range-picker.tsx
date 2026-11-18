import Form from "next/form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { PRESETS } from "@/features/admin/report-range";
import { cn } from "@/lib/utils";

export function RangePicker({ path, range }: { path: string; range: { from: string; to: string; preset: string } }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {PRESETS.map(([v, l]) => (
        <Link key={v} href={`${path}?range=${v}`} className={cn("rounded-full px-3.5 py-1.5 text-sm font-semibold", range.preset === v ? "bg-ink text-cream" : "bg-white hover:bg-sand")}>
          {l}
        </Link>
      ))}
      <Form action={path} className="flex flex-wrap items-center gap-1.5">
        <Input type="date" name="from" defaultValue={range.from} aria-label="מתאריך" className="h-9 w-40" dir="ltr" />
        <span className="text-ink-soft">–</span>
        <Input type="date" name="to" defaultValue={range.to} aria-label="עד תאריך" className="h-9 w-40" dir="ltr" />
        <Button type="submit" variant="outline" size="sm">הצגה</Button>
      </Form>
    </div>
  );
}
