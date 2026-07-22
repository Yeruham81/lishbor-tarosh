import { useAdEligibility } from "@/lib/ads/eligibility";
import { useAdConfig } from "@/lib/ads/config";
import { useAdServingMode } from "@/lib/ads/serving";
import { isValidPublisherId, isValidSlotId } from "@/lib/ads/loader";
import { AdSenseUnit } from "./AdSenseUnit";
import type { AdPosition, AdScreen } from "@/lib/ads/types";

/**
 * AdSlot — reusable, centrally-gated ad placement.
 *
 * PageAdLayout decides which positions are mounted according to the randomly
 * selected responsive layout. AdSlot handles screen eligibility, test-mode
 * placeholders, configuration validation, and the future live AdSense branch.
 *
 * When cycleKey changes, the placeholder or AdSense unit is replaced exactly
 * once for the new advertising cycle.
 */
export function AdSlot({
  screen,
  position,
  cycleKey = "static",
}: {
  screen: AdScreen;
  position: AdPosition;
  cycleKey?: string;
}) {
  const eligible = useAdEligibility(screen);
  const config = useAdConfig();
  const serving = useAdServingMode();

  if (!eligible) return null;

  const posCfg = config.screens[screen]?.[position];
  const slotId = posCfg?.slotId ?? "";

  // TEST MODE — internal placeholder (independent of adsense_live_enabled).
  if (config.testMode) {
    return (
      <div
        key={`ph-${screen}-${position}-${cycleKey}`}
        dir="rtl"
        role="complementary"
        aria-label={`מיקום בדיקת פרסומת ${screen}-${position}`}
        className="w-full"
      >
        <div
          className={
            position === "bottom"
              ? "mx-auto max-w-3xl rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground text-xs text-center px-4 py-6 min-h-[90px] flex items-center justify-center"
              : "rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground text-xs text-center px-2 py-4 min-h-[600px] flex items-center justify-center"
          }
        >
          <span className="font-mono select-none pointer-events-none">
            {screen}-{position}
          </span>
        </div>
      </div>
    );
  }

  // FUTURE LIVE MODE — every condition must be true. During Phase 3 the
  // serving mode is always "none", so this branch cannot be reached.
  const canLive =
    config.liveEnabled && isValidPublisherId(config.publisherId) && isValidSlotId(slotId) && serving !== "none";

  if (!canLive) return null;

  return (
    <AdSenseUnit
      key={`unit-${screen}-${position}-${cycleKey}`}
      screen={screen}
      position={position}
      publisherId={config.publisherId}
      slotId={slotId}
    />
  );
}
