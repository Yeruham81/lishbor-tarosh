import { useEffect, useState, type ReactNode } from "react";
import { AdSlot } from "./AdSlot";
import type { AdScreen } from "@/lib/ads/types";

// From 1280px upward, reserve two 160px side rails for ads.
// At exactly 1280px the grid uses 8px outer padding + 12px track gaps,
// leaving a 920px center track. A max-w-4xl (896px) game therefore keeps
// its full width with an additional ~12px breathing room on each side.
const SIDE_AD_MIN_VIEWPORT_PX = 1280;

/**
 * SSR-safe detector for viewports that can support two side ad rails.
 *
 * null  → viewport not known yet; mount no ad position to avoid flicker
 * true  → desktop: left + right side ads
 * false → mobile/tablet/narrow desktop: bottom ad only
 */
function useHasSideAdRoom(): boolean | null {
  const [hasRoom, setHasRoom] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      setHasRoom(false);
      return;
    }

    const mediaQuery = window.matchMedia(`(min-width: ${SIDE_AD_MIN_VIEWPORT_PX}px)`);
    const update = () => setHasRoom(mediaQuery.matches);

    update();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", update);
    } else {
      mediaQuery.addListener(update);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", update);
      } else {
        mediaQuery.removeListener(update);
      }
    };
  }, []);

  return hasRoom;
}

/**
 * Page-level advertising layout.
 *
 * Desktop >= 1280px:
 * - two dedicated 160px side rails
 * - no bottom ad
 * - center content keeps its natural/max width without overlap
 *
 * Below 1280px:
 * - no side ads
 * - bottom ad only
 *
 * `dir="ltr"` is applied only to the grid so physical left/right slot IDs
 * cannot be reversed by the app's RTL document direction. Each child restores
 * RTL for Hebrew UI content.
 */
export function PageAdLayout({
  screen,
  cycleKey = "static",
  children,
}: {
  screen: AdScreen;
  cycleKey?: string;
  children: ReactNode;
}) {
  const hasSideAdRoom = useHasSideAdRoom();

  if (hasSideAdRoom === true) {
    return (
      <div className="w-full">
        <div
          dir="ltr"
          className="mx-auto grid w-full max-w-[1600px] grid-cols-[160px_minmax(0,1fr)_160px] gap-3 px-2 items-start"
        >
          <aside dir="rtl" className="pt-6" aria-label="פרסומת צד שמאל">
            <AdSlot screen={screen} position="left" cycleKey={cycleKey} />
          </aside>

          <div dir="rtl" className="min-w-0">
            {children}
          </div>

          <aside dir="rtl" className="pt-6" aria-label="פרסומת צד ימין">
            <AdSlot screen={screen} position="right" cycleKey={cycleKey} />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="min-w-0">{children}</div>

      {hasSideAdRoom === false && (
        <div className="my-6 w-full px-4">
          <AdSlot screen={screen} position="bottom" cycleKey={cycleKey} />
        </div>
      )}
    </div>
  );
}
