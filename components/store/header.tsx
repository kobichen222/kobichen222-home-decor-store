import { Heart, Phone, User } from "lucide-react";
import Link from "next/link";
import { getCategories } from "@/features/catalog/queries";
import { getAnnouncements, getStoreSettings } from "@/features/cms/queries";
import { AnnouncementBar } from "./announcement-bar";
import { CartButton } from "./cart-drawer";
import { DesktopNav, type NavNode } from "./desktop-nav";
import { HeaderShell } from "./header-shell";
import { MobileMenu } from "./mobile-menu";
import { MobileSearch } from "./mobile-search";
import { SearchBox } from "./search-box";

export async function Header() {
  const [settings, categories, announcements] = await Promise.all([getStoreSettings(), getCategories(), getAnnouncements()]);
  const tree: NavNode[] = categories
    .filter((c) => !c.parent_id)
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      image_url: c.image_url,
      children: categories.filter((s) => s.parent_id === c.id).map((s) => ({ name: s.name, slug: s.slug, image_url: s.image_url })),
    }));
  const { phone, whatsapp, email, hours } = settings.business;

  return (
    <HeaderShell>
      <AnnouncementBar messages={announcements} />
      <div className="container-page flex h-16 items-center gap-2 lg:h-[4.5rem] lg:gap-8">
        <MobileMenu categories={tree} contact={{ phone: phone ?? "", whatsapp: whatsapp ?? "", email: email ?? "", hours: hours ?? "" }} />
        <Link href="/" className="font-display text-[1.45rem] font-bold tracking-tight lg:text-[1.65rem]" aria-label={`${settings.business.name}, לעמוד הבית`}>
          {settings.business.name}
          <span className="text-gold">.</span>
        </Link>

        <SearchBox className="mx-auto hidden w-full max-w-md lg:block" />

        <div className="ms-auto flex items-center lg:ms-0">
          <MobileSearch />
          <Link href="/business" className="hidden h-11 items-center rounded-full px-3 text-sm font-semibold hover:bg-sand xl:flex">
            לעסקים
          </Link>
          <Link href="/contact" className="hidden h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold hover:bg-sand lg:flex">
            <Phone className="size-4" strokeWidth={1.6} />
            יצירת קשר
          </Link>
          <Link href="/account/wishlist" className="hidden size-11 place-items-center rounded-full hover:bg-sand sm:grid" aria-label="המועדפים שלי">
            <Heart className="size-[1.3rem]" strokeWidth={1.6} />
          </Link>
          <Link href="/account" className="grid size-11 place-items-center rounded-full hover:bg-sand" aria-label="האזור האישי">
            <User className="size-[1.35rem]" strokeWidth={1.6} />
          </Link>
          <CartButton />
        </div>
      </div>

      <DesktopNav tree={tree} />
    </HeaderShell>
  );
}
