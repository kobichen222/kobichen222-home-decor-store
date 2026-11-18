"use client";
import { Copy, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { cn } from "@/lib/utils";
import { IMAGE_ACCEPT, uploadToLibrary } from "./fields";

export function MediaUploader() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  return (
    <div>
      <label className={cn("inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 font-semibold text-cream hover:bg-black", busy && "pointer-events-none opacity-60")}>
        <Upload className="size-4" />
        {busy ? "מעלה…" : "העלאת תמונות"}
        <input
          type="file"
          multiple
          accept={IMAGE_ACCEPT}
          className="sr-only"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            if (!files.length) return;
            setBusy(true);
            const errs: string[] = [];
            for (const f of files) {
              const r = await uploadToLibrary(f);
              if (r.error) errs.push(r.error);
            }
            setErrors(errs);
            setBusy(false);
            e.target.value = "";
            router.refresh();
          }}
        />
      </label>
      {errors.map((m) => <p key={m} className="mt-2 text-sm font-semibold text-danger">{m}</p>)}
    </div>
  );
}

export function CopyUrl({ url }: { url: string }) {
  const [done, setDone] = React.useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold hover:bg-sand"
    >
      <Copy className="size-3.5" />
      {done ? "הועתק" : "העתקת כתובת"}
    </button>
  );
}
