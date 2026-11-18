"use client";
import { LogOut, Menu, Store } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Drawer } from "@/components/ui/drawer";
import { signOut } from "@/features/admin/auth-actions";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "./nav";
import { NotificationsBell } from "./notifications-bell";

// No route-level skeleton in the admin: a fallback would be held on screen
// for a minimum time, which is slower than the server's answer. Instead the
// clicked item reacts at once and a thin bar runs until the page arrives.
function PendingHint() {
  const { pending } = useLinkStatus();
  return (
    <>
      <span aria-hidden className={cn("fixed inset-x-0 top-0 z-[70] h-0.5 origin-right bg-brand transition-opacity", pending ? "animate-[admin-progress_1.2s_ease-out_forwards] opacity-100" : "opacity-0")} />
      <span aria-hidden className={cn("ms-auto size-1.5 rounded-full bg-current transition-opacity", pending ? "animate-pulse opacity-100" : "opacity-0")} />
    </>
  );
}

function Nav({ permissions, onNavigate }: { permissions: string[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const all = ADMIN_NAV.flatMap((g) => g.items.map((i) => i.href));
  // The most specific menu entry that matches the current page is active.
  const activeHref = all
    .filter((h) => (h === "/admin" ? pathname === "/admin" : pathname === h || pathname.startsWith(h + "/")))
    .sort((x, y) => y.length - x.length)[0];
  return (
    <nav aria-label="תפריט ניהול" className="space-y-6 px-3 py-5">
      {ADMIN_NAV.map((group) => {
        const items = group.items.filter((item) => !item.permissions || item.permissions.some((p) => permissions.includes(p)));
        if (!items.length) return null;
        return (
          <div key={group.title}>
            <p className="mb-1.5 px-3 text-xs font-bold tracking-wide text-ink-soft">{group.title}</p>
            <ul>
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={item.href === activeHref ? "page" : undefined}
                    className={cn(
                      "flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                      item.href === activeHref ? "bg-ink text-cream" : "hover:bg-sand",
                    )}
                  >
                    {item.label}
                    <PendingHint />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function AdminShell({ email, permissions, children }: { email: string; permissions: string[]; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex min-h-screen bg-sand/50">
      <aside className="sticky top-0 hidden h-screen print:hidden w-60 shrink-0 overflow-y-auto border-e border-line bg-white lg:block">
        <p className="border-b border-line px-6 py-5 font-display text-xl font-bold">
          בית ועיצוב<span className="text-gold">.</span>
        </p>
        <Nav permissions={permissions} />
      </aside>
      <Drawer open={open} onOpenChange={setOpen} title="תפריט ניהול" side="start">
        <Nav permissions={permissions} onNavigate={() => setOpen(false)} />
      </Drawer>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 print:hidden items-center gap-3 border-b border-line bg-white px-4 lg:px-8">
          <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full hover:bg-sand lg:hidden" aria-label="פתיחת התפריט">
            <Menu className="size-5" />
          </button>
          <Link href="/" target="_blank" className="flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-brand">
            <Store className="size-4" />
            לצפייה בחנות
          </Link>
          <div className="ms-auto">
            <NotificationsBell />
          </div>
          <span className="hidden text-sm text-ink-soft sm:block" dir="ltr">
            {email}
          </span>
          <form action={signOut}>
            <button type="submit" className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold hover:bg-sand">
              <LogOut className="size-4" />
              יציאה
            </button>
          </form>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
