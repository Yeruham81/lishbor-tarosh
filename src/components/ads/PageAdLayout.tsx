import type { ReactNode } from "react";
import { AdSlot } from "./AdSlot";
import type { AdScreen } from "@/lib/ads/types";

/**
 * PageAdLayout — the single reusable page-level ad frame.
 *
 * Wraps the entire route content and exposes three manual placement holes:
 *   left  – vertical unit, wide desktop only
 *   right – vertical unit, wide desktop only
 *   bottom – horizontal unit, below the page content
 *
 * Side units are absolutely positioned in the outer gutters so they never
 * overlap or shrink the central content column. They are hidden on mobile,
 * tablets, and narrow desktop windows (< 1280px). The AdSlot component owns
 * eligibility and layout-mode gating, so PageAdLayout always renders all
 * three slots; each slot decides individually whether to draw anything.
 *
 * The `cycleKey` prop is forwarded to every slot so that a single external
 * event (e.g. a new /play clue loaded) replaces all active placements
 * together, without touching component identity for the rest of the page.
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
  return (
    <div className="w-full">
      {/* Outer bounding box provides the gutters where side ads live. */}
      <div className="relative mx-auto w-full max-w-[1600px] px-0 xl:px-4">
        {/* Side units — absolutely positioned in the gutter; wide screens only. */}
        <aside
          className="hidden xl:block absolute top-6 start-4 w-[180px]"
          aria-hidden="true"
        >
          <AdSlot screen={screen} position="left" cycleKey={cycleKey} />
        </aside>
        <aside
          className="hidden xl:block absolute top-6 end-4 w-[180px]"
          aria-hidden="true"
        >
          <AdSlot screen={screen} position="right" cycleKey={cycleKey} />
        </aside>

        {/* Central content — untouched, keeps its own container/max-width. */}
        <div className="min-w-0">{children}</div>
      </div>

      {/* Bottom unit — below the full content, never inside forms/cards. */}
      <div className="w-full px-4 my-6">
        <AdSlot screen={screen} position="bottom" cycleKey={cycleKey} />
      </div>
    </div>
  );
}
