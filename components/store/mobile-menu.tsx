"use client";
import { Briefcase, ChevronDown, Heart, Mail, Menu, MessageCircle, Phone, User } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { StoreImage } from "@/components/shared/store-image";
import { Drawer } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import type { NavNode } from "./desktop-nav";

type Contact = { phone: string; whatsapp: string; email: string; hours: string };

const QUICK = [
  { href: "/account", label: "החשבון שלי", icon: User },
  { href: "/account/wishlist", label: "מועדפים", icon: Heart },
  { href: "/business", label: "לעסקים", icon: Briefcase },
  { href: "/contact", label: "יצירת קשר", icon: Mail },
];

function Thumb({ src }: { src: string | null }) {
  return (
    <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-sand">
      <StoreImage src={src} alt="" fill sizes="44px" className="object-cover" />
    </span>
  );
}

export function MobileMenu({ categories, contact }: { categories: NavNode[]; contact: Contact }) {
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const close = () => setOpen(false);
  const phone = contact.phone.replace(/[^\d+]/g, "");
  const whatsapp = contact.whatsapp.replace(/\D/g, "");
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-11 place-items-center rounded-full hover:bg-sand lg:hidden"
        aria-label="פתיחת התפריט"
        aria-expanded={open}
      >
        <Menu className="size-6" strokeWidth={1.6} />
      </button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="תפריט"
        side="start"
        footer={
          (phone || whatsapp) && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {phone && (
                  <a href={`tel:${phone}`} className="flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-white text-sm font-semibold">
                    <Phone className="size-4" strokeWidth={1.7} /> חייגו אלינו
                  </a>
                )}
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 items-center justify-center gap-2 rounded-full bg-[#25D366] text-sm font-semibold text-white"
                  >
                    <MessageCircle className="size-4" strokeWidth={1.7} /> וואטסאפ
                  </a>
                )}
              </div>
              {contact.hours && <p className="text-center text-xs text-ink-soft">{contact.hours}</p>}
            </div>
          )
        }
      >
        <div className="px-5 pb-6 pt-4">
          <ul className="grid grid-cols-4 gap-2">
            {QUICK.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link href={href} onClick={close} className="flex flex-col items-center gap-1.5 rounded-xl bg-sand px-1 py-3 text-center text-[0.72rem] font-semibold leading-tight">
                  <Icon className="size-5 text-brand" strokeWidth={1.6} />
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          <nav aria-label="קטגוריות" className="mt-5">
            <ul className="divide-y divide-line">
              <li>
                <Link href="/shop" onClick={close} className="flex items-center justify-between py-3.5 font-display text-lg font-semibold">
                  כל המוצרים
                </Link>
              </li>
              {categories.map((c) => {
                const isOpen = expanded === c.slug;
                const panelId = `mm-${c.slug}`;
                return (
                  <li key={c.slug}>
                    <div className="flex items-center gap-3 py-2.5">
                      <Link href={`/category/${c.slug}`} onClick={close} className="flex min-w-0 flex-1 items-center gap-3">
                        <Thumb src={c.image_url} />
                        <span className="truncate font-semibold">{c.name}</span>
                      </Link>
                      {c.children.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : c.slug)}
                          aria-expanded={isOpen}
                          aria-controls={panelId}
                          aria-label={`${isOpen ? "סגירת" : "פתיחת"} תת־קטגוריות של ${c.name}`}
                          className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-sand"
                        >
                          <ChevronDown className={cn("size-5 transition-transform duration-300", isOpen && "rotate-180")} />
                        </button>
                      )}
                    </div>
                    {c.children.length > 0 && (
                      <div id={panelId} className={cn("grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out-soft)]", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                        <ul className="overflow-hidden" inert={!isOpen}>
                          {c.children.map((s) => (
                            <li key={s.slug}>
                              <Link href={`/category/${s.slug}`} onClick={close} className="block py-2.5 ps-14 text-[0.95rem] text-ink-soft hover:text-ink">
                                {s.name}
                              </Link>
                            </li>
                          ))}
                          <li className="pb-3">
                            <Link href={`/category/${c.slug}`} onClick={close} className="block py-2 ps-14 text-sm font-semibold text-brand">
                              לכל {c.name}
                            </Link>
                          </li>
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold">
            {[
              ["/shop?sale=1", "מבצעים"],
              ["/collections", "קולקציות"],
              ["/blog", "השראה ובלוג"],
              ["/faq", "שאלות נפוצות"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} onClick={close} className={cn("block rounded-full border border-line bg-white px-4 py-2.5 text-center", href.includes("sale") && "border-brand/40 text-brand")}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Drawer>
    </>
  );
}
