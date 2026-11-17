import type { Metadata, Viewport } from "next";
import "./globals.css";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "בית ועיצוב · עיצוב הבית, המשרד והעסק", template: "%s · בית ועיצוב" },
  description: "מוצרים נבחרים לעיצוב הבית, המשרד והעסק. משלוחים לכל הארץ.",
  openGraph: { type: "website", locale: "he_IL", siteName: "בית ועיצוב" },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#faf9f6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="he" dir="rtl" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
