import type { Metadata } from "next";
import { HomeSections } from "@/components/store/home-sections";
import { getPageSections, getStoreSettings } from "@/features/cms/queries";
import { siteUrl } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getStoreSettings();
  return { title: { absolute: seo.title }, description: seo.description, alternates: { canonical: "/" } };
}

export default async function HomePage() {
  const [sections, { business }] = await Promise.all([getPageSections("home"), getStoreSettings()]);
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: business.name,
    url: siteUrl(),
    email: business.email || undefined,
    telephone: business.phone || undefined,
    address: business.address || undefined,
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} />
      <HomeSections sections={sections} />
    </>
  );
}
