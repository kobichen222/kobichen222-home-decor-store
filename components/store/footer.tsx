import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { getCategories } from "@/features/catalog/queries";
import { getStoreSettings } from "@/features/cms/queries";

const INFO_LINKS = [
  ["אודות", "/about"],
  ["בלוג והשראה", "/blog"],
  ["לעסקים", "/business"],
  ["יצירת קשר", "/contact"],
  ["שאלות נפוצות", "/faq"],
  ["משלוחים", "/shipping"],
  ["החזרות וביטולים", "/returns"],
  ["תקנון", "/terms"],
  ["מדיניות פרטיות", "/privacy"],
  ["הצהרת נגישות", "/accessibility"],
] as const;

export async function Footer() {
  const [{ business }, categories] = await Promise.all([getStoreSettings(), getCategories()]);
  const top = categories.filter((c) => !c.parent_id).slice(0, 8);
  return (
    <footer className="mt-24 bg-ink text-cream/80">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <p className="font-display text-2xl font-bold text-cream">
            {business.name}
            <span className="text-gold">.</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">{business.tagline}</p>
        </div>
        <nav aria-label="קטגוריות בתחתית העמוד">
          <h2 className="mb-4 text-sm font-bold tracking-wide text-cream">קטגוריות</h2>
          <ul className="space-y-2.5 text-sm">
            {top.map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`} className="hover:text-gold">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="מידע ושירות">
          <h2 className="mb-4 text-sm font-bold tracking-wide text-cream">מידע ושירות</h2>
          <ul className="space-y-2.5 text-sm">
            {INFO_LINKS.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="hover:text-gold">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="mb-4 text-sm font-bold tracking-wide text-cream">יצירת קשר</h2>
          <ul className="space-y-3 text-sm">
            {business.phone && (
              <li className="flex items-center gap-2.5">
                <Phone className="size-4 text-gold" />
                <a href={`tel:${business.phone}`} className="hover:text-gold" dir="ltr">
                  {business.phone}
                </a>
              </li>
            )}
            {business.email && (
              <li className="flex items-center gap-2.5">
                <Mail className="size-4 text-gold" />
                <a href={`mailto:${business.email}`} className="hover:text-gold">
                  {business.email}
                </a>
              </li>
            )}
            {business.address && (
              <li className="flex items-center gap-2.5">
                <MapPin className="size-4 text-gold" />
                {business.address}
              </li>
            )}
            {business.hours && (
              <li className="flex items-center gap-2.5">
                <Clock className="size-4 text-gold" />
                {business.hours}
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="container-page py-5 text-center text-xs text-cream/60">
          © {business.name}. כל הזכויות שמורות. המחירים באתר כוללים מע״מ.{" "}
          <Link href="/admin" prefetch={false} className="underline underline-offset-2 hover:text-gold">
            כניסה לניהול
          </Link>
        </p>
      </div>
    </footer>
  );
}
