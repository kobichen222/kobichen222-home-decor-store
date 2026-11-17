import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-7xl font-bold text-gold">404</p>
      <h1 className="mt-4 text-3xl font-bold">העמוד לא נמצא</h1>
      <p className="mt-2 text-ink-soft">ייתכן שהקישור שגוי או שהעמוד הוסר.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/" className={buttonClass("primary", "md")}>
          לדף הבית
        </Link>
        <Link href="/shop" className={buttonClass("outline", "md")}>
          לכל המוצרים
        </Link>
      </div>
    </div>
  );
}
