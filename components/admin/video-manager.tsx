"use client";
import { ArrowDown, ArrowUp, Film, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { addProductVideo, updateProductVideo } from "@/features/admin/catalog-actions";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Card } from "./ui";

type VideoRow = { id: string; kind: "file" | "youtube"; url: string; title: string | null };
const TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const MAX_MB = 50;

export function VideoManager({ productId, videos }: { productId: string; videos: VideoRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [youtube, setYoutube] = React.useState("");

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    const ext = TYPES[file.type];
    if (!ext) return setError("סוג קובץ לא נתמך. יש להעלות MP4, WebM או MOV");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`הקובץ גדול מ־${MAX_MB}MB. אפשר לכווץ אותו או להעלות ל־YouTube ולהדביק קישור`);
    setBusy(`מעלה ${file.name}…`);
    const path = `products/${productId}/${crypto.randomUUID()}.${ext}`;
    const { error: upError } = await createBrowserSupabase()
      .storage.from("product-videos")
      .upload(path, file, { contentType: file.type, cacheControl: "31536000" });
    if (upError) {
      setBusy(null);
      return setError(`ההעלאה נכשלה: ${upError.message}`);
    }
    const res = await addProductVideo(productId, { storagePath: path, title: file.name.replace(/\.[^.]+$/, "") });
    setBusy(null);
    if (!res?.ok) setError(res?.message ?? "שמירת הסרטון נכשלה");
    router.refresh();
  }

  async function addYoutube() {
    setError(null);
    setBusy("מוסיף…");
    const res = await addProductVideo(productId, { youtube });
    setBusy(null);
    if (!res?.ok) return setError(res?.message ?? "הוספת הסרטון נכשלה");
    setYoutube("");
    router.refresh();
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">סרטונים</h2>
          <p className="text-sm text-ink-soft">מוצגים בגלריית המוצר אחרי התמונות. קובץ עד {MAX_MB}MB (MP4 מומלץ) או קישור YouTube.</p>
        </div>
        <label className={cn("inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-cream hover:bg-black", busy && "pointer-events-none opacity-60")}>
          <Upload className="size-4" />
          העלאת סרטון
          <input type="file" accept={Object.keys(TYPES).join(",")} className="sr-only" disabled={!!busy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" aria-label="קישור YouTube" dir="ltr" className="max-w-md" />
        <Button type="button" variant="outline" disabled={!youtube.trim() || !!busy} onClick={addYoutube}>הוספת קישור YouTube</Button>
      </div>
      {busy && <p className="mt-3 text-sm font-semibold text-ink-soft" role="status">{busy}</p>}
      {error && <p className="mt-3 text-sm font-semibold text-danger" role="alert">{error}</p>}
      {videos.length > 0 && (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v, i) => (
            <li key={v.id} className="rounded-xl border border-line p-2.5">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-ink">
                {v.kind === "file" ? (
                  <video src={v.url} controls preload="metadata" playsInline className="size-full object-contain" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`https://i.ytimg.com/vi/${v.url}/hqdefault.jpg`} alt="" className="size-full object-cover" />
                )}
                <span className="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-bold">
                  <Film className="size-3" />
                  {v.kind === "file" ? "קובץ" : "YouTube"}
                </span>
              </div>
              <form action={updateProductVideo} className="mt-2.5 space-y-2">
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="product_id" value={productId} />
                <div className="flex gap-1.5">
                  <Input name="title" defaultValue={v.title ?? ""} placeholder="כותרת (נגישות)" aria-label="כותרת הסרטון" className="h-9 text-sm" />
                  <button type="submit" name="intent" value="title" className="shrink-0 rounded-lg border border-line px-2.5 text-xs font-semibold hover:bg-sand">שמירה</button>
                </div>
                <div className="flex justify-between">
                  <div className="flex">
                    <button type="submit" name="intent" value="up" disabled={i === 0} className="rounded-full p-2 hover:bg-sand disabled:opacity-30" aria-label="הזזה קדימה"><ArrowUp className="size-4" /></button>
                    <button type="submit" name="intent" value="down" disabled={i === videos.length - 1} className="rounded-full p-2 hover:bg-sand disabled:opacity-30" aria-label="הזזה אחורה"><ArrowDown className="size-4" /></button>
                  </div>
                  <button
                    type="submit"
                    name="intent"
                    value="delete"
                    onClick={(e) => { if (!confirm("למחוק את הסרטון?")) e.preventDefault(); }}
                    className="rounded-full p-2 text-danger hover:bg-danger/10"
                    aria-label="מחיקת הסרטון"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </form>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
