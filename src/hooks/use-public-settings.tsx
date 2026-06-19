import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicSettings } from "@/lib/admin.functions";

/**
 * Read public, non-sensitive app settings. Cached for 60s; the admin panel
 * invalidates on save through ["admin", "settings"], but this lives under
 * ["public", "settings"] so other users see updates within one minute.
 */
export function usePublicSettings() {
  const fn = useServerFn(getPublicSettings);
  return useQuery({
    queryKey: ["public", "settings"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}

function asBool(v: any, fallback = true) {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return fallback;
}

export function useFeatureFlags() {
  const q = usePublicSettings();
  const s: any = q.data ?? {};
  return {
    loading: q.isLoading,
    allowSkip: asBool(s.allow_skip, true),
    allowHints: asBool(s.allow_hints, true),
    allowPlayerSubmissions: asBool(s.allow_player_submissions, true),
    allowNewRegistrations: asBool(s.allow_new_registrations, true),
    leaderboardVisible: asBool(s.leaderboard_visible, true),
    globalAnnouncement: typeof s.global_announcement_banner === "string" ? s.global_announcement_banner : "",
    popupAnnouncement: typeof s.popup_announcement_text === "string" ? s.popup_announcement_text : "",
    disableAdsButtonVisible: asBool(s.disable_ads_button_visible, true),
    maintenanceMode: asBool(s.maintenance_mode, false),
    maintenanceMessage:
      typeof s.maintenance_message === "string" ? s.maintenance_message : "המשחק בתחזוקה. נחזור בקרוב.",
  };
}
