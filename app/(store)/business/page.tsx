import { Building2, Gem, Percent, Truck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BusinessProjectForm } from "@/components/store/business-forms";
import { PageHeader } from "@/components/store/page-header";

export const metadata: Metadata = {
  title: "עיצוב לעסקים",
  description: "עיצוב משרדים, חנויות, מסעדות וקליניקות: הצעת מחיר לפרויקט, מחירים לעסקים והזמנות בכמויות.",
  alternates: { canonical: "/business" },
};

const PERKS = [
  [Building2, "ליווי פרויקט", "בחירת פריטים לחלל שלכם, מהקונספט ועד ההתקנה."],
  [Percent, "מחירים לעסקים", "חשבון עסקי מאושר מקבל הנחה קבועה על כל ההזמנות באתר."],
  [Truck, "הזמנות בכמויות", "אספקה מתואמת לבית העסק, גם להזמנות גדולות."],
  [Gem, "חשבונית מס", "חשבונית על שם החברה, עם ח.פ."],
] as const;

export default function BusinessPage() {
  return (
    <>
      <PageHeader title="עיצוב לעסקים" description="משרדים, חנויות, מסעדות, קליניקות וחדרי ישיבות. ספרו לנו על הפרויקט ונחזור עם הצעה." crumbs={[{ name: "לעסקים", href: "/business" }]} />
      <div className="container-page py-10">
        <ul className="mb-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map(([Icon, title, text]) => (
            <li key={title} className="border-t border-line pt-5">
              <Icon className="size-7 text-gold" strokeWidth={1.4} />
              <h2 className="mt-3 text-lg font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-ink-soft">{text}</p>
            </li>
          ))}
        </ul>
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
            <h2 className="mb-5 text-2xl font-bold">פרטי הפרויקט</h2>
            <BusinessProjectForm />
          </section>
          <aside className="h-fit rounded-2xl bg-sand p-6">
            <h2 className="text-lg font-bold">רוכשים באופן קבוע?</h2>
            <p className="mt-2 text-sm text-ink-soft">פתחו חשבון באתר והגישו בקשה לחשבון עסקי מהאזור האישי. לאחר אישור, ההנחה העסקית תחול אוטומטית בכל הזמנה.</p>
            <Link href="/account/profile" className="mt-4 inline-block font-semibold text-brand underline">לאזור האישי</Link>
          </aside>
        </div>
      </div>
    </>
  );
}
