import { Star } from "lucide-react";
import type { Faq, Review } from "@/features/catalog/reviews";
import { formatDate } from "@/lib/utils";
import { ReviewForm } from "./review-form";

export function Stars({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex" role="img" aria-label={`דירוג ${value} מתוך 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= Math.round(value) ? "fill-gold text-gold" : "text-line"}`} aria-hidden="true" />
      ))}
    </span>
  );
}

export function ProductReviews({ productId, reviews, average, count, faqs }: { productId: string; reviews: Review[]; average: number | null; count: number; faqs: Faq[] }) {
  return (
    <div className="mt-20 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
      <section id="reviews" aria-labelledby="reviews-title">
        <div className="mb-6 flex flex-wrap items-end gap-4">
          <h2 id="reviews-title" className="text-2xl font-bold">חוות דעת</h2>
          {average !== null && (
            <p className="flex items-center gap-2 text-sm text-ink-soft">
              <Stars value={average} /> <span className="font-semibold text-ink">{average}</span> · {count} חוות דעת
            </p>
          )}
        </div>
        {reviews.length ? (
          <ul className="space-y-5">
            {reviews.map((r) => (
              <li key={r.id} className="border-b border-line pb-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Stars value={r.rating} />
                  {r.title && <p className="font-semibold">{r.title}</p>}
                </div>
                {r.body && <p className="mt-2 leading-relaxed text-ink-soft">{r.body}</p>}
                <p className="mt-2 text-xs text-ink-soft">
                  {r.author_name} · {formatDate(r.created_at)}
                  {r.is_verified && <span className="ms-2 font-semibold text-success">✓ רכישה מאומתת</span>}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-soft">עדיין אין חוות דעת על המוצר.</p>
        )}
        <details className="mt-6 rounded-2xl border border-line bg-white p-5">
          <summary className="font-semibold">כתיבת חוות דעת</summary>
          <div className="mt-4">
            <ReviewForm productId={productId} />
          </div>
        </details>
      </section>
      {faqs.length > 0 && (
        <section aria-labelledby="faq-title">
          <h2 id="faq-title" className="mb-6 text-2xl font-bold">שאלות ותשובות</h2>
          <div className="divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.id} className="group py-4">
                <summary className="flex list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
                  {f.question}
                  <span className="text-xl font-normal text-ink-soft transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-2 leading-relaxed text-ink-soft">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
