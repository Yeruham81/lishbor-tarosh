import { useEffect, useRef } from "react";
import { isValidPublisherId, isValidSlotId, loadAdSense } from "@/lib/ads/loader";
import type { AdPosition, AdScreen } from "@/lib/ads/types";

/**
 * Reusable AdSense unit. Renders an <ins class="adsbygoogle"> element and
 * initializes it exactly once per mount by pushing to window.adsbygoogle.
 *
 * The parent (AdSlot) enforces route, admin, entitlement and layout checks
 * BEFORE mounting this component — do not duplicate those checks here.
 *
 * Cycle handling: when the parent changes `cycleKey`, the AdSlot changes the
 * element key so React unmounts the previous unit and mounts a fresh one.
 * This module never refreshes an existing unit and never uses timers.
 */
export function AdSenseUnit({
  screen,
  position,
  publisherId,
  slotId,
}: {
  screen: AdScreen;
  position: AdPosition;
  publisherId: string;
  slotId: string;
}) {
  const initedRef = useRef(false);

  // Reserve stable space to reduce layout shift.
  const containerStyle: React.CSSProperties =
    position === "bottom" ? { display: "block", minHeight: 90 } : { display: "block", width: "100%", minHeight: 600 };

  const format = position === "bottom" ? "auto" : "vertical";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isValidPublisherId(publisherId) || !isValidSlotId(slotId)) return;
    if (initedRef.current) return;

    let cancelled = false;
    (async () => {
      await loadAdSense(publisherId);
      if (cancelled) return;
      try {
        (window as any).adsbygoogle = (window as any).adsbygoogle || [];
        (window as any).adsbygoogle.push({});
        initedRef.current = true;
      } catch {
        /* Fail safely — ad-blocker, empty response, etc. */
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally no dependency on cycleKey — remount (via key) triggers a
    // fresh mount which resets initedRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publisherId, slotId]);

  return (
    <ins
      className="adsbygoogle"
      style={containerStyle}
      data-ad-client={publisherId}
      data-ad-slot={slotId}
      data-ad-format={format}
      data-full-width-responsive={position === "bottom" ? "true" : "false"}
      data-lishbor-screen={screen}
      data-lishbor-position={position}
      aria-hidden="true"
    />
  );
}
