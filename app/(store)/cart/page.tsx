import type { Metadata } from "next";
import { CartPageView } from "@/components/store/cart-page-view";
import { PageHeader } from "@/components/store/page-header";

export const metadata: Metadata = { title: "סל הקניות", robots: { index: false } };

export default function CartPage() {
  return (
    <>
      <PageHeader title="סל הקניות" crumbs={[{ name: "סל הקניות", href: "/cart" }]} />
      <div className="container-page py-10">
        <CartPageView />
      </div>
    </>
  );
}
