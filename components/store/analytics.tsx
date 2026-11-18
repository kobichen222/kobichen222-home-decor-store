"use client";
import Link from "next/link";
import Script from "next/script";
import * as React from "react";

type Ids = { ga4_id: string; meta_pixel_id: string };
const KEY = "cookie-consent";

// Measurement tags load only after the visitor agrees (privacy law: no
// tracking cookies without consent). The choice is remembered.
export function Analytics({ ids }: { ids: Ids }) {
  const ga = /^G-[A-Z0-9]{4,20}$/.test(ids.ga4_id) ? ids.ga4_id : null;
  const pixel = /^\d{6,20}$/.test(ids.meta_pixel_id) ? ids.meta_pixel_id : null;
  const [consent, setConsent] = React.useState<"granted" | "denied" | null | undefined>(undefined);
  React.useEffect(() => {
    let v: string | null = null;
    try { v = localStorage.getItem(KEY); } catch {}
    setConsent(v === "granted" || v === "denied" ? v : null); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);
  if (!ga && !pixel) return null;
  const choose = (v: "granted" | "denied") => {
    try { localStorage.setItem(KEY, v); } catch {}
    setConsent(v);
  };
  return (
    <>
      {consent === "granted" && ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}');`}</Script>
        </>
      )}
      {consent === "granted" && pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}</Script>
      )}
      {consent === null && (
        <div role="dialog" aria-label="הסכמה לעוגיות" className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-line bg-white p-4 shadow-soft sm:inset-x-6">
          <p className="text-sm">
            אנו משתמשים בעוגיות למדידה ולשיפור חוויית הקנייה. אפשר לאשר או לדחות; האתר יעבוד בכל מקרה.{" "}
            <Link href="/privacy" className="font-semibold underline">מדיניות הפרטיות</Link>
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => choose("granted")} className="h-9 rounded-full bg-ink px-5 text-sm font-semibold text-cream">אישור</button>
            <button type="button" onClick={() => choose("denied")} className="h-9 rounded-full border border-line px-5 text-sm font-semibold">דחייה</button>
          </div>
        </div>
      )}
    </>
  );
}
