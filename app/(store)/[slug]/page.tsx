import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/store/page-header";
import { ContactForm } from "@/components/store/contact-form";
import { RichText } from "@/components/store/rich-text";
import { getPage, getStoreSettings } from "@/features/cms/queries";

// CMS pages (about, shipping, returns, terms…). "contact" is always
// available and shows the business details from the store settings.
export async function generateStaticParams() {
  return ["about", "contact", "shipping", "returns", "terms", "privacy", "accessibility"].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "contact") return { title: "יצירת קשר", alternates: { canonical: "/contact" } };
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: page.seo_title ?? page.title,
    description: page.seo_description ?? undefined,
    alternates: { canonical: `/${page.slug}` },
    robots: page.noindex ? { index: false } : undefined,
  };
}

async function Contact() {
  const { business } = await getStoreSettings();
  const rows = [
    [Phone, "טלפון", business.phone, `tel:${business.phone}`],
    [Mail, "דוא״ל", business.email, `mailto:${business.email}`],
    [MapPin, "כתובת", business.address, null],
    [Clock, "שעות פעילות", business.hours, null],
  ] as const;
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {rows
        .filter(([, , value]) => value)
        .map(([Icon, label, value, href]) => (
          <li key={label} className="rounded-2xl border border-line bg-white p-6">
            <Icon className="size-6 text-gold" strokeWidth={1.5} />
            <p className="mt-3 text-sm text-ink-soft">{label}</p>
            {href ? (
              <a href={href} className="text-lg font-semibold hover:text-brand">
                {value}
              </a>
            ) : (
              <p className="text-lg font-semibold">{value}</p>
            )}
          </li>
        ))}
    </ul>
  );
}

async function Content({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const page = slug === "home" ? null : await getPage(slug);
  if (!page && slug !== "contact") notFound();
  const title = page?.title ?? "יצירת קשר";
  return (
    <>
      <PageHeader title={title} crumbs={[{ name: title, href: `/${slug}` }]} />
      <div className="container-page max-w-3xl space-y-8 py-10">
        {page?.body ? (
          <RichText text={page.body} />
        ) : (
          slug !== "contact" && <p className="text-lg text-ink-soft">תוכן העמוד יעודכן בקרוב.</p>
        )}
        {slug === "contact" && (
          <>
            <Contact />
            <section className="rounded-2xl border border-line bg-white p-6">
              <h2 className="mb-4 text-xl font-bold">השאירו פרטים ונחזור אליכם</h2>
              <ContactForm />
            </section>
          </>
        )}
      </div>
    </>
  );
}

export default function ContentPage(props: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<div className="container-page py-10"><div className="h-40 animate-pulse rounded-2xl bg-sand" /></div>}>
      <Content {...props} />
    </Suspense>
  );
}
