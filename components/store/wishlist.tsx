"use client";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { getWishlistIds, toggleWishlist } from "@/features/account/actions";
import { cn } from "@/lib/utils";

type Ctx = { ids: Set<string>; toggle: (id: string) => Promise<void> };
const WishlistContext = React.createContext<Ctx | null>(null);

// Loads the signed-in shopper's wishlist once per visit. Visitors without
// a session cookie never trigger a request.
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = React.useState<Set<string>>(new Set());
  const router = useRouter();
  React.useEffect(() => {
    if (!document.cookie.includes("-auth-token")) return;
    getWishlistIds().then((list) => list && setIds(new Set(list)));
  }, []);
  const toggle = React.useCallback(
    async (id: string) => {
      const res = await toggleWishlist(id);
      if (!res.signedIn) {
        router.push(`/account/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      setIds((s) => {
        const n = new Set(s);
        if (res.saved) n.add(id);
        else n.delete(id);
        return n;
      });
    },
    [router],
  );
  return <WishlistContext.Provider value={{ ids, toggle }}>{children}</WishlistContext.Provider>;
}

export function WishlistButton({ productId, name, variant = "icon" }: { productId: string; name: string; variant?: "icon" | "full" }) {
  const ctx = React.useContext(WishlistContext);
  const [busy, setBusy] = React.useState(false);
  if (!ctx) return null;
  const saved = ctx.ids.has(productId);
  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    await ctx.toggle(productId);
    setBusy(false);
  };
  if (variant === "full") {
    return (
      <button type="button" onClick={onClick} disabled={busy} aria-pressed={saved} className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full border border-ink/25 font-semibold transition-colors hover:border-ink disabled:opacity-60">
        <Heart className={cn("size-5", saved && "fill-brand text-brand")} />
        {saved ? "שמור במועדפים" : "הוספה למועדפים"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? `הסרת ${name} מהמועדפים` : `הוספת ${name} למועדפים`}
      className="relative z-10 grid size-9 place-items-center rounded-full bg-white/90 shadow-sm transition-transform hover:scale-110 disabled:opacity-60"
    >
      <Heart className={cn("size-[1.1rem]", saved ? "fill-brand text-brand" : "text-ink")} strokeWidth={1.8} />
    </button>
  );
}
