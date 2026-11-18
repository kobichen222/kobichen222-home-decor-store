"use client";
import { ImagePlus, Search, X } from "lucide-react";
import * as React from "react";
import { StoreImage } from "@/components/shared/store-image";
import { Input } from "@/components/ui/field";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
export const IMAGE_ACCEPT = Object.keys(TYPES).join(",");
const MAX_BYTES = 5 * 1024 * 1024;

/** Uploads one image to the media library and returns its public URL. */
export async function uploadToLibrary(file: File): Promise<{ url?: string; path?: string; error?: string }> {
  const ext = TYPES[file.type];
  if (!ext) return { error: `${file.name}: סוג קובץ לא נתמך (JPG, PNG, WebP, AVIF)` };
  if (file.size > MAX_BYTES) return { error: `${file.name}: הקובץ גדול מ־5MB` };
  const path = `library/${crypto.randomUUID()}.${ext}`;
  const { error } = await createBrowserSupabase()
    .storage.from("media")
    .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
  if (error) return { error: `${file.name}: ההעלאה נכשלה (${error.message})` };
  return { url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path}`, path };
}

export function ImageField({ name, id, defaultValue }: { name: string; id: string; defaultValue?: string | null }) {
  const [value, setValue] = React.useState(defaultValue ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  return (
    <div className="flex gap-3">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-line bg-sand">
        {value ? <StoreImage src={value} alt="" fill sizes="80px" className="object-cover" /> : null}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <Input id={id} name={name} value={value} onChange={(e) => setValue(e.target.value)} dir="ltr" placeholder="https://… או /path" />
        <div className="flex flex-wrap items-center gap-2">
          <label className={cn("inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-sm font-semibold hover:bg-sand", busy && "pointer-events-none opacity-60")}>
            <ImagePlus className="size-4" />
            {busy ? "מעלה…" : "העלאת תמונה"}
            <input
              type="file"
              accept={IMAGE_ACCEPT}
              className="sr-only"
              disabled={busy}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                setError(null);
                const res = await uploadToLibrary(file);
                setBusy(false);
                if (res.url) setValue(res.url);
                else setError(res.error ?? "ההעלאה נכשלה");
                e.target.value = "";
              }}
            />
          </label>
          {value && (
            <button type="button" onClick={() => setValue("")} className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold text-ink-soft hover:bg-sand">
              <X className="size-4" />
              הסרה
            </button>
          )}
        </div>
        {error && <p className="text-xs font-semibold text-danger">{error}</p>}
      </div>
    </div>
  );
}

/**
 * The visible input is local (Israel) time; the submitted value is an ISO
 * timestamp with offset, so the server never has to guess the time zone.
 */
export function DateTimeField({ name, id, defaultValue }: { name: string; id: string; defaultValue?: string | null }) {
  const toLocal = (iso: string | null | undefined) => {
    if (!iso) return "";
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };
  const [local, setLocal] = React.useState(toLocal(defaultValue));
  const iso = local ? new Date(local).toISOString() : "";
  return (
    <>
      <Input id={id} type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} dir="ltr" />
      <input type="hidden" name={name} value={iso} />
    </>
  );
}

export function ProductPicker({
  name,
  products,
  selected,
}: {
  name: string;
  products: { value: string; label: string }[];
  selected: string[];
}) {
  const [chosen, setChosen] = React.useState<string[]>(selected);
  const [q, setQ] = React.useState("");
  const visible = products.filter((p) => !q || p.label.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  return (
    <div className="rounded-xl border border-line">
      {chosen.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      <div className="flex flex-wrap gap-1.5 border-b border-line p-3">
        {chosen.length === 0 && <span className="text-sm text-ink-soft">לא נבחרו מוצרים</span>}
        {chosen.map((id) => (
          <button key={id} type="button" onClick={() => toggle(id)} className="inline-flex items-center gap-1 rounded-full bg-sand px-3 py-1 text-sm font-semibold hover:bg-line">
            {products.find((p) => p.value === id)?.label ?? id}
            <X className="size-3.5" aria-label="הסרה" />
          </button>
        ))}
      </div>
      <div className="relative border-b border-line">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="חיפוש מוצר להוספה" aria-label="חיפוש מוצר" className="h-10 w-full bg-transparent ps-9 pe-3 text-sm focus:outline-none" />
      </div>
      <ul className="max-h-56 overflow-y-auto p-1.5">
        {visible.map((p) => (
          <li key={p.value}>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-sand">
              <input type="checkbox" checked={chosen.includes(p.value)} onChange={() => toggle(p.value)} className="size-4 accent-[var(--color-brand)]" />
              {p.label}
            </label>
          </li>
        ))}
        {visible.length === 0 && <li className="px-2.5 py-3 text-sm text-ink-soft">לא נמצאו מוצרים</li>}
      </ul>
    </div>
  );
}
