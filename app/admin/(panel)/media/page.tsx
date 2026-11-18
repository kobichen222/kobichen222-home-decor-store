import { Trash2 } from "lucide-react";
import { CopyUrl, MediaUploader } from "@/components/admin/media-uploader";
import { Notice } from "@/components/admin/notice";
import { AdminHeader, Card, Empty } from "@/components/admin/ui";
import { StoreImage } from "@/components/shared/store-image";
import { deleteMedia } from "@/features/admin/backoffice-actions";
import { requireAdmin } from "@/lib/auth/admin";
import { publicEnv } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "ספריית מדיה" };

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  await requireAdmin("catalog.manage", "content.manage");
  const sp = await searchParams;
  const db = await createSessionClient();
  const { data: files, error } = await db.storage.from("media").list("library", { limit: 500, sortBy: { column: "created_at", order: "desc" } });
  const base = `${publicEnv().supabaseUrl}/storage/v1/object/public/media/library/`;
  const images = (files ?? []).filter((f) => f.id && f.name !== ".emptyFolderPlaceholder");

  return (
    <>
      <AdminHeader title="ספריית מדיה" description="תמונות לבאנרים, קטגוריות, קולקציות ובלוג. תמונות מוצר מנוהלות ישירות בעמוד המוצר. עד 5MB לקובץ.">
        <MediaUploader />
      </AdminHeader>
      {sp.deleted && <Notice>התמונה נמחקה.</Notice>}
      {sp.error === "in_use" && <Notice tone="danger">התמונה בשימוש באתר ולכן לא נמחקה. הסירו אותה קודם מהמקום שבו היא מוצגת.</Notice>}
      {sp.error === "failed" && <Notice tone="danger">המחיקה נכשלה.</Notice>}
      {error && <Notice tone="danger">טעינת הספרייה נכשלה: {error.message}</Notice>}
      {!images.length ? (
        <Empty>הספרייה ריקה. העלו תמונות כדי להשתמש בהן בכל מקום באתר.</Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {images.map((f) => {
            const url = base + f.name;
            return (
              <li key={f.id}>
                <Card className="overflow-hidden">
                  <div className="relative aspect-square bg-sand">
                    <StoreImage src={url} alt="" fill sizes="240px" className="object-cover" />
                  </div>
                  <div className="space-y-1 p-2.5">
                    <p className="text-xs text-ink-soft">
                      {f.created_at ? formatDate(f.created_at) : ""} · {Math.round(Number(f.metadata?.size ?? 0) / 1024)}KB
                    </p>
                    <div className="flex items-center justify-between">
                      <CopyUrl url={url} />
                      <form action={deleteMedia}>
                        <input type="hidden" name="path" value={`library/${f.name}`} />
                        <button type="submit" className="rounded-full p-1.5 text-danger hover:bg-danger/10" aria-label="מחיקת התמונה">
                          <Trash2 className="size-4" />
                        </button>
                      </form>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
