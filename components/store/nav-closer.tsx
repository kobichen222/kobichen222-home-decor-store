"use client";

import { usePathname } from "next/navigation";
import * as React from "react";

/**
 * Hover/focus panels stay open after a click, because the pointer and the
 * focus are still on them while the next page renders. After every
 * navigation this closes them until the pointer leaves the menu.
 */
function Closer() {
  const pathname = usePathname();
  React.useEffect(() => {
    const nav = document.getElementById("main-nav");
    if (!nav) return;
    if (nav.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
    nav.dataset.closed = "1";
    const reopen = () => delete nav.dataset.closed;
    nav.addEventListener("pointerleave", reopen, { once: true });
    const t = setTimeout(() => {
      if (!nav.matches(":hover")) reopen();
    }, 50);
    return () => {
      clearTimeout(t);
      nav.removeEventListener("pointerleave", reopen);
    };
  }, [pathname]);
  return null;
}

export function NavCloser() {
  // usePathname needs a Suspense boundary under cacheComponents.
  return (
    <React.Suspense fallback={null}>
      <Closer />
    </React.Suspense>
  );
}
