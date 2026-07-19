import { useAdEligibility } from "@/lib/ads/eligibility";
import type { AdPlacement } from "@/lib/ads/types";

/**
 * AdSlot — reusable, centrally-gated ad placeholder.
 *
 * Phase 1: renders ONLY a development test placeholder when eligible.
 * No Google AdSense script, no ad request, no external network call.
 * Later phases will swap the placeholder body for real ad markup here,
 * without touching call sites.
 */
export function AdSlot({ placement }: { placement: AdPlacement }) {
  const eligible = useAdEligibility(placement);
  if (!eligible) return null;

  return (
    <div
      dir="rtl"
      role="complementary"
      aria-label={`מיקום בדיקת פרסומת ${placement}`}
      className="w-full my-4"
    >
      <div className="mx-auto max-w-3xl">
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground text-xs text-center px-4 py-6 min-h-[90px] flex items-center justify-center">
          <span className="font-mono select-none pointer-events-none">
            מיקום בדיקת פרסומת: {placement}
          </span>
        </div>
      </div>
    </div>
  );
}
