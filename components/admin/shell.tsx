"use client";
import { LogOut, Menu, Store } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { Drawer } from "@/components/ui/drawer";
import { signOut } from "@/features/admin/auth-actions";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "./nav";

function Nav({ permissions, onNavigate }: { permissions: string[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="תפריט ניהול" className="space-y-6 px-3 py-5">
      {ADMIN_NAV.map((group) => (
        <div key={group.title}>
          <p className="mb-1.5 px-3 text-xs font-bold tracking-wide text-ink-soft">{group.title}</p>
          <ul>
            {group.items.map((item) => {
              const allowed = !item.permissions || item.permissions.some((p) => permissions.includes(p));
              if (!item.href || !allowed) {
                return (
                  <li key={item.label} className="flex items-center justify-between px-3 py-2 text-sm text-ink-soft/60">
                    {item.label}
                    {!item.href && <span className="rounded-full bg-sand px-2 py-0.5 text-[0.65rem]">בקרוב</span>}
                  </li>
                );
              }
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                      active ? "bg-ink text-cream" : "hover:bg-sand",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({ email, permissions, children }: { email: string; permissions: string[]; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex min-h-screen bg-sand/50">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 overflow-y-auto border-e border-line bg-white lg:block">
        <p className="border-b border-line px-6 py-5 font-display text-xl font-bold">
          בית ועיצוב<span className="text-gold">.</span>
        </p>
        <Nav permissions={permissions} />
      </aside>
      <Drawer open={open} onOpenChange={setOpen} title="תפריט ניהול" side="start">
        <Nav permissions={permissions} onNavigate={() => setOpen(false)} />
      </Drawer>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-4 lg:px-8">
          <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full hover:bg-sand lg:hidden" aria-label="פתיחת התפריט">
            <Menu className="size-5" />
          </button>
          <Link href="/" target="_blank" className="flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-brand">
            <Store className="size-4" />
            לצפייה בחנות
          </Link>
          <span className="ms-auto hidden text-sm text-ink-soft sm:block" dir="ltr">
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
