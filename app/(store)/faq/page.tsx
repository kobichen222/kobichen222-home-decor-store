import type { Metadata } from "next";
import { JsonLd, PageHeader } from "@/components/store/page-header";
import { getGeneralFaqs } from "@/features/catalog/reviews";
import { MessageCircleQuestion } from "lucide-react";
import { EmptyState } from "@/components/store/empty-state";

export const metadata: Metadata = { title: "שאלות נפוצות", alternates: { canonical: "/faq" } };

export default async function FaqPage() {
  const faqs = await getGeneralFaqs();
  return (
    <>
      <PageHeader title="שאלות נפוצות" crumbs={[{ name: "שאלות נפוצות", href: "/faq" }]} />
      {faqs.length > 0 && (
        <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })) }} />
      )}
      <div className="container-page max-w-3xl py-10">
        {faqs.length ? (
          <div className="divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.id} className="group py-5">
                <summary className="flex list-none items-center justify-between text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {f.question}
                  <span className="text-2xl font-normal text-ink-soft transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-soft">{f.answer}</p>
              </details>
            ))}
          </div>
        ) : (
          <EmptyState icon={MessageCircleQuestion} title="יש לכם שאלה?" text="השאלות הנפוצות יתווספו בקרוב. עד אז נשמח לענות אישית." actions={[{ href: "/contact", label: "יצירת קשר" }]} />
        )}
      </div>
    </>
  );
}
