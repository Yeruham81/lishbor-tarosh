import { useEffect, useState, type ReactNode } from "react";
import { AdSlot } from "./AdSlot";
import type { AdScreen, RandomDesktopAdLayout } from "@/lib/ads/types";

const DESKTOP_LAYOUTS: readonly RandomDesktopAdLayout[] = ["both-sides", "left-and-bottom", "right-and-bottom"];

type DesktopLayoutSelection = {
  screen: AdScreen;
  cycleKey: string;
  layout: RandomDesktopAdLayout;
};

function chooseRandomDesktopLayout(): RandomDesktopAdLayout {
  const index = Math.floor(Math.random() * DESKTOP_LAYOUTS.length);
  return DESKTOP_LAYOUTS[index] ?? "both-sides";
}

/**
 * SSR-safe detector for sufficiently wide desktop screens.
 *
 * null  → viewport width is not known yet
 * true  → wide desktop
 * false → mobile, tablet, or narrow desktop
 */
function useIsWideViewport(): boolean | null {
  const [isWide, setIsWide] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      setIsWide(false);
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1280px)");

    const updateViewport = () => {
      setIsWide(mediaQuery.matches);
    };

    updateViewport();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateViewport);
    } else {
      mediaQuery.addListener(updateViewport);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", updateViewport);
      } else {
        mediaQuery.removeListener(updateViewport);
      }
    };
  }, []);

  return isWide;
}

/**
 * Page-level advertising layout.
 *
 * Wide desktop:
 * - left + right
 * - left + bottom
 * - right + bottom
 *
 * Mobile, tablet, and narrow desktop:
 * - bottom only
 *
 * A new desktop layout is selected once per screen/ad cycle. Ordinary
 * rerenders do not change the selected layout.
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
  const isWide = useIsWideViewport();

  const [selection, setSelection] = useState<DesktopLayoutSelection | null>(null);

  useEffect(() => {
    setSelection({
      screen,
      cycleKey,
      layout: chooseRandomDesktopLayout(),
    });
  }, [screen, cycleKey]);

  /*
   * Do not reuse the previous cycle's layout while the effect is selecting
   * the layout for the new cycle. This prevents an extra ad-unit lifecycle.
   */
  const desktopLayout = selection?.screen === screen && selection.cycleKey === cycleKey ? selection.layout : null;

  const showLeft =
    isWide === true &&
    desktopLayout !== null &&
    (desktopLayout === "both-sides" || desktopLayout === "left-and-bottom");

  const showRight =
    isWide === true &&
    desktopLayout !== null &&
    (desktopLayout === "both-sides" || desktopLayout === "right-and-bottom");

  const showBottom =
    isWide === false ||
    (isWide === true &&
      desktopLayout !== null &&
      (desktopLayout === "left-and-bottom" || desktopLayout === "right-and-bottom"));

  return (
    <div className="w-full">
      <div className="relative mx-auto w-full max-w-[1600px] px-0 xl:px-4">
        {showLeft && (
          <aside className="absolute top-6 start-4 w-[180px]">
            <AdSlot screen={screen} position="left" cycleKey={cycleKey} />
          </aside>
        )}

        {showRight && (
          <aside className="absolute top-6 end-4 w-[180px]">
            <AdSlot screen={screen} position="right" cycleKey={cycleKey} />
          </aside>
        )}

        <div className="min-w-0">{children}</div>
      </div>

      {showBottom && (
        <div className="my-6 w-full px-4">
          <AdSlot screen={screen} position="bottom" cycleKey={cycleKey} />
        </div>
      )}
    </div>
  );
}
