"use client";
import { usePathname } from "next/navigation";
import * as React from "react";

// Every link to a new page opens it at the very top. Next.js on its own only
// scrolls the new segment into view, which can leave the page slightly
// scrolled under the sticky header. Back/forward keep the position the
// browser restores, and in-page #anchors are left alone.
export function ScrollToTop() {
  const pathname = usePathname();
  const fromHistory = React.useRef(false);
  const first = React.useRef(true);

  React.useEffect(() => {
    const onPop = () => {
      fromHistory.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  React.useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (fromHistory.current) {
      fromHistory.current = false;
      return;
    }
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    // Next.js runs its own scroll handling after commit; settle after it.
    const id = requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
