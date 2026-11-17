"use client";
import { ArrowDown, ArrowUp, Star, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { StoreImage } from "@/components/shared/store-image";
import { Input } from "@/components/ui/field";
import { addProductImage, updateProductImage } from "@/features/admin/catalog-actions";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Card } from "./ui";

type ImageRow = { id: string; url: string; alt: string | null; is_primary: boolean };
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const MAX_BYTES = 5 * 1024 * 1024;

// Files go straight from the browser to Supabase Storage under the admin's
// own session (storage policies decide), then the row is created by a
// Server Action that re-validates the path.
export function ImageManager({ productId, productName, images }: { productId: string; productName: string; images: ImageRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    const supabase = createBrowserSupabase();
    for (const file of Array.from(files)) {
      const ext = TYPES[file.type];
      if (!ext) {
        setError(`${file.name}: סוג קובץ לא נתמך (JPG, PNG, WebP, AVIF)`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name}: הקובץ גדול מ־5MB`);
        continue;
      }
      const path = `products/${productId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("media").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (uploadError) {
        setError(`${file.name}: ההעלאה נכשלה (${uploadError.message})`);
        continue;
      }
      const res = await addProductImage(productId, path, productName);
      if (!res?.ok) setError(res?.message ?? "שמירת התמונה נכשלה");
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">תמונות</h2>
          <p className="text-sm text-ink-soft">התמונה הראשית מוצגת בכרטיס המוצר. טקסט חלופי חשוב לנגישות ול־SEO.</p>
        </div>
        <label className={cn("inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-cream hover:bg-black", busy && "pointer-events-none opacity-60")}>
          <Upload className="size-4" />
          {busy ? "מעלה…" : "העלאת תמונות"}
          <input type="file" accept={Object.keys(TYPES).join(",")} multiple className="sr-only" onChange={(e) => upload(e.target.files)} disabled={busy} />
        </label>
      </div>
      {error && (
        <p className="mt-3 text-sm font-semibold text-danger" role="alert">
          {error}
        </p>
      )}
      {images.length === 0 ? (
        <p className="mt-5 rounded-xl bg-sand px-4 py-10 text-center text-sm text-ink-soft">עדיין אין תמונות למוצר</p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((img, i) => (
            <li key={img.id} className="rounded-xl border border-line p-2.5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-sand">
                <StoreImage src={img.url} alt={img.alt ?? ""} fill sizes="240px" className="object-cover" />
                {img.is_primary && <span className="absolute start-2 top-2 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-cream">ראשית</span>}
              </div>
              <form action={updateProductImage} className="mt-2.5 space-y-2">
                <input type="hidden" name="id" value={img.id} />
                <input type="hidden" name="product_id" value={productId} />
                <div className="flex gap-1.5">
                  <Input name="alt" defaultValue={img.alt ?? ""} placeholder="טקסט חלופי" aria-label="טקסט חלופי" className="h-9 text-sm" />
                  <button type="submit" name="intent" value="alt" className="shrink-0 rounded-lg border border-line px-2.5 text-xs font-semibold hover:bg-sand">
                    שמירה
                  </button>
                </div>
                <div className="flex justify-between">
                  <div className="flex">
                    <button type="submit" name="intent" value="up" disabled={i === 0} className="rounded-full p-2 hover:bg-sand disabled:opacity-30" aria-label="הזזה קדימה">
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="submit" name="intent" value="down" disabled={i === images.length - 1} className="rounded-full p-2 hover:bg-sand disabled:opacity-30" aria-label="הזזה אחורה">
                      <ArrowDown className="size-4" />
                    </button>
                    {!img.is_primary && (
                      <button type="submit" name="intent" value="primary" className="rounded-full p-2 hover:bg-sand" aria-label="קביעה כתמונה ראשית" title="קביעה כראשית">
                        <Star className="size-4" />
                      </button>
                    )}
                  </div>
                  <button type="submit" name="intent" value="delete" className="rounded-full p-2 text-danger hover:bg-danger/10" aria-label="מחיקת התמונה">
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
