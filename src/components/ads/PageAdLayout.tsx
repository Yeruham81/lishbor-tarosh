import { useEffect, useState, type ReactNode } from "react";
import { AdSlot } from "./AdSlot";
import type { AdScreen } from "@/lib/ads/types";

// From 1280px upward, reserve two 160px side rails for ads.
// At exactly 1280px:
// 1280 - 32px outer padding - 320px side rails - 32px gaps = 896px,
// which preserves a full max-w-4xl gameplay/content area.
const SIDE_AD_MIN_VIEWPORT_PX = 1280;

/**
 * SSR-safe desktop detector.
 *
 * null  → viewport not known yet; render no ad placement to avoid flicker
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
 * - 16px separation between each ad rail and the center content column
 * - no bottom ad
 * - the center column still has exactly 896px available at 1280px,
 *   preserving max-w-4xl gameplay without overlap
 *
 * Below 1280px:
 * - no side ads
 * - bottom ad only
 *
 * Ads remain mounted for the duration of the supplied cycleKey.
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
        <div className="mx-auto grid w-full max-w-[1600px] grid-cols-[160px_minmax(0,1fr)_160px] gap-4 px-4 items-start">
          <aside className="col-start-1 row-start-1 pt-6" aria-label="פרסומת צד שמאל">
            <AdSlot screen={screen} position="left" cycleKey={cycleKey} />
          </aside>

          <div className="col-start-2 row-start-1 min-w-0">{children}</div>

          <aside className="col-start-3 row-start-1 pt-6" aria-label="פרסומת צד ימין">
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
