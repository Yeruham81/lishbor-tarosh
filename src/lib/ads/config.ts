import { useMemo } from "react";
import { usePublicSettings } from "@/hooks/use-public-settings";
import type {
  AdConfig,
  AdScreen,
  DesktopAdLayoutMode,
  ScreenAdConfig,
} from "./types";
import { ALL_SCREENS, screenSettingKey } from "./screens";

function asBool(v: any, fallback = false): boolean {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return fallback;
}
function asStr(v: any): string {
  return typeof v === "string" ? v.trim() : "";
}
function asLayout(v: any): DesktopAdLayoutMode {
  const allowed: DesktopAdLayoutMode[] = [
    "off",
    "bottom-only",
    "left-and-bottom",
    "right-and-bottom",
    "both-sides",
  ];
  return allowed.includes(v) ? (v as DesktopAdLayoutMode) : "off";
}

function readScreen(s: any, screen: AdScreen): ScreenAdConfig {
  return {
    desktopLayout: asLayout(s[screenSettingKey("ads", screen, "desktop_layout")]),
    left: {
      enabled: asBool(s[screenSettingKey("ads", screen, "left_enabled")], false),
      slotId: asStr(s[screenSettingKey("adsense", screen, "left_slot_id")]),
    },
    right: {
      enabled: asBool(s[screenSettingKey("ads", screen, "right_enabled")], false),
      slotId: asStr(s[screenSettingKey("adsense", screen, "right_slot_id")]),
    },
    bottom: {
      enabled: asBool(s[screenSettingKey("ads", screen, "bottom_enabled")], false),
      slotId: asStr(s[screenSettingKey("adsense", screen, "bottom_slot_id")]),
    },
  };
}

/**
 * Typed, memoized ad configuration derived from the cached public-settings
 * query. Reuses the shared usePublicSettings query — no extra request per
 * AdSlot / per screen. Safe defaults apply for missing/invalid values.
 */
export function useAdConfig(): AdConfig {
  const q = usePublicSettings();
  const s: any = q.data ?? {};

  return useMemo<AdConfig>(() => {
    const screens = {} as Record<AdScreen, ScreenAdConfig>;
    for (const screen of ALL_SCREENS) screens[screen] = readScreen(s, screen);
    return {
      enabled: asBool(s.ads_enabled, false),
      staticEnabled: asBool(s.ads_static_enabled, false),
      testMode: asBool(s.ads_test_mode, false),
      liveEnabled: asBool(s.adsense_live_enabled, false),
      transitionAdsEnabled: asBool(s.h5_ads_enabled, false),
      publisherId: asStr(s.adsense_publisher_id),
      screens,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(s)]);
}
