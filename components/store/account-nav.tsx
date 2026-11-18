import Link from "next/link";
import { logout } from "@/features/account/actions";
import { cn } from "@/lib/utils";

const ITEMS = [
  ["/account", "ההזמנות שלי"],
  ["/account/wishlist", "מועדפים"],
  ["/account/addresses", "כתובות"],
  ["/account/profile", "פרטים אישיים"],
] as const;

export function AccountShell({ active, title, children }: { active: string; title: string; children: React.ReactNode }) {
  return (
    <div className="container-page py-8 lg:py-12">
      <h1 className="mb-6 text-3xl font-bold">{title}</h1>
      <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="האזור האישי" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {ITEMS.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={active === href ? "page" : undefined}
              className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold lg:rounded-lg", active === href ? "bg-ink text-cream" : "bg-white hover:bg-sand")}
            >
              {label}
            </Link>
          ))}
          <form action={logout} className="shrink-0">
            <button type="submit" className="rounded-full px-4 py-2 text-sm font-semibold text-ink-soft hover:bg-sand lg:w-full lg:rounded-lg lg:text-start">יציאה</button>
          </form>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
