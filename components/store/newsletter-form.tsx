"use client";
import * as React from "react";
import { subscribeNewsletter } from "@/features/cms/actions";

export function NewsletterForm() {
  const [state, action, pending] = React.useActionState(subscribeNewsletter, null);
  if (state?.ok) {
    return (
      <p className="mt-7 font-semibold" role="status">
        תודה! נרשמתם בהצלחה.
      </p>
    );
  }
  return (
    <form action={action} className="mx-auto mt-7 max-w-md">
      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="כתובת הדוא״ל שלכם"
          aria-label="כתובת דוא״ל"
          dir="ltr"
          className="h-12 w-full rounded-full border border-white/25 bg-white/10 px-5 text-cream placeholder:text-cream/60 focus:border-cream focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-12 shrink-0 rounded-full bg-cream px-6 font-semibold text-ink transition-colors hover:bg-white disabled:opacity-60"
        >
          הרשמה
        </button>
      </div>
      <label className="mt-3 flex items-start justify-center gap-2 text-start text-xs text-cream/80">
        <input type="checkbox" name="consent" required className="mt-0.5 accent-[var(--color-gold)]" />
        אני מאשר/ת קבלת דיוור שיווקי. ניתן להסיר את עצמכם בכל עת.
      </label>
      {state?.error && (
        <p className="mt-2 text-sm font-semibold" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
