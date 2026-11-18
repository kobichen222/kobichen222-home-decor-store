"use client";
import { Star } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { submitReview } from "@/features/catalog/review-actions";

export function ReviewForm({ productId }: { productId: string }) {
  const [state, action, pending] = React.useActionState(submitReview, null);
  const [rating, setRating] = React.useState(0);
  if (state?.ok) return <p role="status" className="font-semibold text-success">{state.message}</p>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <fieldset>
        <legend className="mb-1.5 text-sm font-semibold">דירוג</legend>
        <div className="flex gap-1" dir="ltr">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => setRating(i)} aria-label={`${i} כוכבים`} aria-pressed={rating === i} className="rounded p-0.5">
              <Star className={`size-7 ${i <= rating ? "fill-gold text-gold" : "text-line"}`} />
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="שם לתצוגה" htmlFor="author_name"><Input id="author_name" name="author_name" maxLength={40} required /></Field>
      <Field label="כותרת" htmlFor="title"><Input id="title" name="title" maxLength={80} /></Field>
      <Field label="חוות הדעת" htmlFor="body"><Textarea id="body" name="body" rows={4} maxLength={2000} required /></Field>
      {state?.message && <p role="alert" className="text-sm font-semibold text-danger">{state.message}</p>}
      <Button type="submit" disabled={pending}>שליחה</Button>
      <p className="text-xs text-ink-soft">חוות דעת אפשר לכתוב על מוצר שרכשתם כשאתם מחוברים לחשבון. היא תפורסם לאחר אישור.</p>
    </form>
  );
}
