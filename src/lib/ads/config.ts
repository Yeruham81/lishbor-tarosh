import { useMemo } from "react";
import { usePublicSettings } from "@/hooks/use-public-settings";
import type { AdConfig, AdScreen, ScreenAdConfig } from "./types";
import { ALL_SCREENS, screenSettingKey } from "./screens";

function asBool(value: unknown, fallback = false): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
}

function asStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readScreen(settings: Record<string, unknown>, screen: AdScreen): ScreenAdConfig {
  return {
    enabled: asBool(settings[screenSettingKey("ads", screen, "enabled")], false),
    left: {
      slotId: asStr(settings[screenSettingKey("adsense", screen, "left_slot_id")]),
    },
    right: {
      slotId: asStr(settings[screenSettingKey("adsense", screen, "right_slot_id")]),
    },
    bottom: {
      slotId: asStr(settings[screenSettingKey("adsense", screen, "bottom_slot_id")]),
    },
  };
}

/**
 * Typed, memoized ad configuration derived from the cached public-settings
 * query. Reuses the shared usePublicSettings query, with no additional
 * request per screen or AdSlot.
 */
export function useAdConfig(): AdConfig {
  const query = usePublicSettings();
  const settings = (query.data ?? {}) as Record<string, unknown>;

  return useMemo<AdConfig>(() => {
    const screens = {} as Record<AdScreen, ScreenAdConfig>;

    for (const screen of ALL_SCREENS) {
      screens[screen] = readScreen(settings, screen);
    }

    return {
      enabled: asBool(settings.ads_enabled, false),
      staticEnabled: asBool(settings.ads_static_enabled, false),
      testMode: asBool(settings.ads_test_mode, false),
      liveEnabled: asBool(settings.adsense_live_enabled, false),
      transitionAdsEnabled: asBool(settings.h5_ads_enabled, false),
      publisherId: asStr(settings.adsense_publisher_id),
      screens,
    };
  }, [settings]);
}
