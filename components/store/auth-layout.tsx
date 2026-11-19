import { Heart, MapPin, Package, Sparkles } from "lucide-react";

const PERKS = [
  { icon: Package, title: "מעקב הזמנות", text: "כל ההזמנות והסטטוס שלהן במקום אחד." },
  { icon: MapPin, title: "קופה מהירה", text: "הפרטים והכתובת ממולאים אוטומטית." },
  { icon: Heart, title: "רשימת מועדפים", text: "שומרים מוצרים שאהבתם וחוזרים אליהם." },
  { icon: Sparkles, title: "הטבות לרשומים", text: "עדכונים על קולקציות חדשות ומבצעים." },
];

/** Sign-in / sign-up frame: the form card beside a short "why an account" panel. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-line bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="p-6 sm:p-10">
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          <p className="mb-7 mt-1.5 text-sm text-ink-soft">{subtitle}</p>
          {children}
        </div>
        <aside className="hidden flex-col justify-center gap-7 bg-sand p-10 lg:flex" aria-label="למה כדאי חשבון">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-gold">החשבון שלכם</p>
            <p className="mt-2 font-display text-2xl font-bold leading-snug">כל מה שצריך כדי לעצב בנוחות</p>
          </div>
          <ul className="space-y-5">
            {PERKS.map(({ icon: Icon, title: t, text }) => (
              <li key={t} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-cream text-brand">
                  <Icon className="size-5" strokeWidth={1.6} />
                </span>
                <span>
                  <strong className="block">{t}</strong>
                  <span className="text-sm text-ink-soft">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-ink-soft">אפשר גם לקנות בלי הרשמה, כאורחים.</p>
        </aside>
      </div>
    </div>
  );
}
