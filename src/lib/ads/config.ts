import { useMemo } from "react";
import { usePublicSettings } from "@/hooks/use-public-settings";
import type { AdConfig } from "./types";

function asBool(v: any, fallback = false): boolean {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return fallback;
}
function asStr(v: any): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Typed, memoized ad configuration derived from the cached public-settings
 * query. Reuses the shared usePublicSettings query — no extra request per
 * AdSlot. Missing/invalid values fall back to safe defaults.
 */
export function useAdConfig(): AdConfig {
  const q = usePublicSettings();
  const s: any = q.data ?? {};

  return useMemo<AdConfig>(
    () => ({
      enabled: asBool(s.ads_enabled, false),
      testMode: asBool(s.ads_test_mode, false),
      h5Enabled: asBool(s.h5_ads_enabled, false),
      publisherId: asStr(s.adsense_publisher_id),
      placements: {
        postSolveBottom: {
          enabled: asBool(s.ads_post_solve_enabled, false),
          slotId: asStr(s.adsense_post_solve_slot_id),
        },
        gameBottom: {
          enabled: asBool(s.ads_game_enabled, false),
          slotId: asStr(s.adsense_game_slot_id),
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(s)],
  );
}
