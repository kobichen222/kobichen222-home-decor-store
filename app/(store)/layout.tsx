import { Suspense } from "react";
import { CartDrawer } from "@/components/store/cart-drawer";
import { CartHydrator, CartProvider } from "@/components/store/cart-context";
import { Footer } from "@/components/store/footer";
import { Header } from "@/components/store/header";
import { ScrollToTop } from "@/components/store/scroll-to-top";
import { WhatsAppButton } from "@/components/store/whatsapp-button";
import { WishlistProvider } from "@/components/store/wishlist";
import type { Metadata } from "next";
import { Analytics } from "@/components/store/analytics";
import { getCart } from "@/features/cart/server";
import { getStoreSettings } from "@/features/cms/queries";

// The cart is the only per-visitor part of the storefront chrome. It is
// read from the cookie inside its own Suspense boundary, so the rest of
// every page stays statically prerendered and cacheable.
async function CartLoader() {
  return <CartHydrator cart={await getCart()} />;
}

export async function generateMetadata(): Promise<Metadata> {
  const { analytics } = await getStoreSettings();
  return analytics.gsc_verification ? { verification: { google: analytics.gsc_verification } } : {};
}

async function Tracking() {
  const { analytics } = await getStoreSettings();
  return <Analytics ids={analytics} />;
}

export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <CartProvider>
      <WishlistProvider>
      <Suspense fallback={null}>
        <ScrollToTop />
      </Suspense>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-cream"
      >
        דילוג לתוכן הראשי
      </a>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsAppButton />
      <CartDrawer />
      <Tracking />
      <Suspense fallback={null}>
        <CartLoader />
      </Suspense>
      </WishlistProvider>
    </CartProvider>
  );
}
