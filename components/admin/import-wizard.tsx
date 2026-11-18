"use client";
import { FileUp } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { importProducts } from "@/features/admin/import-actions";
import { IMPORT_FIELDS, type ImportField, type ImportRow, type RowResult } from "@/features/admin/import-fields";
import { parseCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { Badge, Card, TableWrap } from "./ui";

// Header names recognised automatically (Hebrew and English).
const GUESS: Record<ImportField, RegExp> = {
  sku: /^(sku|מק"?ט|מק״ט|קוד)/i,
  name: /^(name|שם)/i,
  price: /^(price|מחיר)$/i,
  sale_price: /(sale|מבצע)/i,
  stock: /(stock|qty|quantity|מלאי|כמות)/i,
  category: /(category|קטגוריה)/i,
  status: /(status|סטטוס)/i,
  short_description: /(short|קצר)/i,
  description: /^(description|תיאור)$/i,
  slug: /(slug|url|כתובת)/i,
};

type Step = "upload" | "map" | "preview" | "done";

export function ImportWizard() {
  const [step, setStep] = React.useState<Step>("upload");
  const [fileName, setFileName] = React.useState("");
  const [header, setHeader] = React.useState<string[]>([]);
  const [data, setData] = React.useState<string[][]>([]);
  const [mapping, setMapping] = React.useState<Record<ImportField, number>>({} as Record<ImportField, number>);
  const [results, setResults] = React.useState<RowResult[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function load(file: File | undefined) {
    if (!file) return;
    setError(null);
    let rows: string[][];
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        rows = (await readSheet(file)).map((r) => r.map((c) => (c == null ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c))));
      } else if (/\.csv$/i.test(file.name)) {
        rows = parseCsv(await file.text());
      } else {
        return setError("יש להעלות קובץ CSV או Excel (.xlsx)");
      }
    } catch {
      return setError("לא הצלחנו לקרוא את הקובץ");
    }
    if (rows.length < 2) return setError("הקובץ ריק או שאין בו שורות מעבר לכותרת");
    if (rows.length > 2001) return setError("עד 2,000 שורות בקובץ אחד");
    const head = rows[0].map((h) => h.trim());
    const guess = {} as Record<ImportField, number>;
    for (const [field] of IMPORT_FIELDS) {
      const idx = head.findIndex((h) => GUESS[field].test(h));
      if (idx >= 0 && !Object.values(guess).includes(idx)) guess[field] = idx;
    }
    setFileName(file.name);
    setHeader(head);
    setData(rows.slice(1));
    setMapping(guess);
    setStep("map");
  }

  const toRows = (): ImportRow[] =>
    data.map((r) => {
      const o: ImportRow = {};
      for (const [field] of IMPORT_FIELDS) if (mapping[field] !== undefined && mapping[field] >= 0) o[field] = (r[mapping[field]] ?? "").trim();
      return o;
    });

  async function run(dry: boolean) {
    setBusy(true);
    setError(null);
    const res = await importProducts(toRows(), dry);
    setBusy(false);
    if (res.message) return setError(res.message);
    setResults(res.results);
    setStep(dry ? "preview" : "done");
  }

  const count = (a: RowResult["action"]) => results.filter((r) => r.action === a).length;

  return (
    <Card className="p-5 sm:p-6">
      <ol className="mb-5 flex flex-wrap gap-2 text-xs font-semibold">
        {(["upload", "map", "preview", "done"] as Step[]).map((s, i) => (
          <li key={s} className={cn("rounded-full px-3 py-1", s === step ? "bg-ink text-cream" : "bg-sand text-ink-soft")}>
            {i + 1}. {{ upload: "העלאה", map: "מיפוי עמודות", preview: "בדיקה ותצוגה מקדימה", done: "תוצאות" }[s]}
          </li>
        ))}
      </ol>
      {error && <p role="alert" className="mb-4 text-sm font-semibold text-danger">{error}</p>}

      {step === "upload" && (
        <div className="space-y-3">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line px-6 py-12 text-center hover:border-brand">
            <FileUp className="size-8 text-gold" />
            <span className="font-semibold">בחירת קובץ CSV או Excel</span>
            <span className="text-sm text-ink-soft">שורה ראשונה = כותרות. מוצרים קיימים מזוהים לפי מק״ט ומתעדכנים רק בעמודות שממופות.</span>
            <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => load(e.target.files?.[0])} />
          </label>
          { }
          <a href="/admin/export/products" download className="text-sm font-semibold text-brand underline">הורדת קובץ המוצרים הנוכחי כתבנית</a>
        </div>
      )}

      {step === "map" && (
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">{fileName} · {data.length} שורות. בחרו לכל שדה את העמודה המתאימה בקובץ, או השאירו ״לא לייבא״.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {IMPORT_FIELDS.map(([field, label]) => (
              <label key={field} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
                <span className="font-semibold">{label}</span>
                <Select
                  className="h-9 w-48"
                  value={mapping[field] ?? -1}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: Number(e.target.value) }))}
                  aria-label={`עמודה עבור ${label}`}
                >
                  <option value={-1}>לא לייבא</option>
                  {header.map((h, i) => <option key={i} value={i}>{h || `עמודה ${i + 1}`}</option>)}
                </Select>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => run(true)} disabled={busy || mapping.sku === undefined || mapping.sku < 0}>{busy ? "בודק…" : "בדיקה ותצוגה מקדימה"}</Button>
            <Button variant="ghost" onClick={() => setStep("upload")}>קובץ אחר</Button>
          </div>
        </div>
      )}

      {(step === "preview" || step === "done") && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">{step === "done" ? "נוצרו" : "ייווצרו"}: {count("create")}</Badge>
            <Badge tone="info">{step === "done" ? "עודכנו" : "יעודכנו"}: {count("update")}</Badge>
            <Badge tone="danger">שגיאות: {count("error")}</Badge>
          </div>
          {step === "preview" && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => run(false)} disabled={busy || count("create") + count("update") === 0}>
                {busy ? "מייבא…" : `אישור וייבוא ${count("create") + count("update")} שורות`}
              </Button>
              <Button variant="ghost" onClick={() => setStep("map")}>חזרה למיפוי</Button>
              {count("error") > 0 && <span className="self-center text-sm text-ink-soft">שורות עם שגיאה לא ייובאו.</span>}
            </div>
          )}
          {step === "done" && <Button variant="outline" onClick={() => { setStep("upload"); setResults([]); }}>ייבוא קובץ נוסף</Button>}
          <TableWrap>
            <thead><tr><th>שורה</th><th>מק״ט</th><th>פעולה</th><th>הערה</th></tr></thead>
            <tbody>
              {results.slice(0, 500).map((r) => (
                <tr key={r.row}>
                  <td className="tabular-nums">{r.row}</td>
                  <td dir="ltr" className="text-end">{r.sku || "—"}</td>
                  <td><Badge tone={r.action === "error" ? "danger" : r.action === "create" ? "success" : "info"}>{{ create: "חדש", update: "עדכון", skip: "דילוג", error: "שגיאה" }[r.action]}</Badge></td>
                  <td className="text-xs text-ink-soft">{r.message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      )}
    </Card>
  );
}
