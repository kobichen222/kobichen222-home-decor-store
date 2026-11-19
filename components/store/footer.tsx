import { ChevronDown, Clock, Lock, Mail, MapPin, Phone, RotateCcw, ShieldCheck, Truck } from "lucide-react";
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

const TRUST = [
  { icon: Truck, title: "משלוחים לכל הארץ", text: "אספקה מהירה עד הבית או העסק" },
  { icon: RotateCcw, title: "14 יום להחזרה", text: "החזרה פשוטה וללא התחייבות" },
  { icon: ShieldCheck, title: "שנה אחריות", text: "על כל מוצר שנמכר באתר" },
  { icon: Lock, title: "תשלום מאובטח", text: "פרטי הכרטיס לא נשמרים אצלנו" },
];

function Group({ title, label, children }: { title: string; label: string; children: React.ReactNode }) {
  // On phones each group folds into a row; from sm up they are plain columns.
  return (
    <nav aria-label={label}>
      <details className="group border-b border-white/10 sm:hidden">
        <summary className="flex list-none items-center justify-between py-4 text-sm font-bold text-cream [&::-webkit-details-marker]:hidden">
          {title}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="pb-5">{children}</div>
      </details>
      <div className="hidden sm:block">
        <h2 className="mb-4 text-sm font-bold tracking-wide text-cream">{title}</h2>
        {children}
      </div>
    </nav>
  );
}

export async function Footer() {
  const [{ business }, categories] = await Promise.all([getStoreSettings(), getCategories()]);
  const top = categories.filter((c) => !c.parent_id).slice(0, 8);
  return (
    <footer className="mt-24 bg-ink text-cream/80">
      <div className="border-b border-white/10">
        <ul className="container-page grid grid-cols-2 gap-x-4 gap-y-6 py-8 lg:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-6 shrink-0 text-gold" strokeWidth={1.4} />
              <span>
                <strong className="block text-sm text-cream">{title}</strong>
                <span className="text-xs text-cream/60">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="container-page grid gap-x-10 py-10 sm:grid-cols-2 sm:gap-y-10 sm:py-14 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div className="pb-6 sm:pb-0">
          <p className="font-display text-2xl font-bold text-cream">
            {business.name}
            <span className="text-gold">.</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">{business.tagline || "עיצוב הבית, המשרד והעסק"}</p>
          {(business.social?.instagram || business.social?.facebook) && (
            <div className="mt-5 flex gap-2">
              {business.social?.instagram && (
                <a href={business.social.instagram} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold hover:border-gold hover:text-gold">
                  Instagram
                </a>
              )}
              {business.social?.facebook && (
                <a href={business.social.facebook} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-semibold hover:border-gold hover:text-gold">
                  Facebook
                </a>
              )}
            </div>
          )}
        </div>
        <Group title="קטגוריות" label="קטגוריות בתחתית העמוד">
          <ul className="space-y-2.5 text-sm">
            {top.map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`} className="hover:text-gold">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </Group>
        <Group title="מידע ושירות" label="מידע ושירות">
          <ul className="space-y-2.5 text-sm">
            {INFO_LINKS.map(([label, href]) => (
              <li key={href}>
                <Link href={href} className="hover:text-gold">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </Group>
        <div className="pt-6 sm:pt-0">
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
        <div className="container-page flex flex-col items-center gap-4 py-6 lg:flex-row lg:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-cream/60">
            <Lock className="size-3.5" /> תשלום מאובטח בהצפנה
          </p>
        <p className="text-center text-xs text-cream/60">
          © {business.name}. כל הזכויות שמורות. המחירים באתר כוללים מע״מ.{" "}
          <Link href="/admin" prefetch={false} className="underline underline-offset-2 hover:text-gold">
            כניסה לניהול
          </Link>
        </p>
        </div>
      </div>
    </footer>
  );
}
