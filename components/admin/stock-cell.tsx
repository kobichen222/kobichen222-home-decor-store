"use client";
import * as React from "react";
import { setStock } from "@/features/admin/catalog-actions";

export function StockCell({ variantId, onHand }: { variantId: string; onHand: number }) {
  const [state, action, pending] = React.useActionState(setStock, null);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="variant_id" value={variantId} />
      <input
        key={onHand}
        name="on_hand"
        type="number"
        min="0"
        step="1"
        defaultValue={onHand}
        aria-label="כמות במלאי"
        dir="ltr"
        className="h-9 w-20 rounded-lg border border-line bg-white px-2 text-center text-sm tabular-nums"
      />
      <button type="submit" disabled={pending} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:bg-sand disabled:opacity-50">
        {pending ? "…" : "עדכון"}
      </button>
      {state?.message && (
        <span role="status" className={`text-xs font-semibold ${state.ok ? "text-success" : "text-danger"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
