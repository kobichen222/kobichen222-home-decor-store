"use client";

import * as React from "react";

/**
 * Sticky header that slides away while the shopper scrolls down the page
 * and comes back as soon as they scroll up, so content gets the screen
 * without the menu ever being far away. Stays put near the top of the page,
 * while a menu inside it has focus, and for reduced-motion users it simply
 * stays visible.
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLElement>(null);
  const [hidden, setHidden] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let last = window.scrollY;
    let frame = 0;
    const check = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - last;
      setScrolled(y > 8);
      const focused = ref.current?.contains(document.activeElement) && document.activeElement !== document.body;
      if (reduce.matches || y < 200 || focused) setHidden(false);
      else if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
      if (Math.abs(delta) > 6 || y < 200) last = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <header
      ref={ref}
      data-hidden={hidden || undefined}
      onFocusCapture={() => setHidden(false)}
      className={[
        "sticky top-0 z-40 border-b bg-cream/95 backdrop-blur transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out-soft)] supports-[backdrop-filter]:bg-cream/85",
        hidden ? "-translate-y-full" : "translate-y-0",
        scrolled ? "border-line shadow-[0_8px_30px_-22px_rgb(0_0_0/0.35)]" : "border-line/60",
      ].join(" ")}
    >
      {children}
    </header>
  );
}
