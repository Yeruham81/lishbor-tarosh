import type { AdScreen } from "./types";

/** All approved screens, in a fixed order (used for iteration/UI). */
export const ALL_SCREENS: AdScreen[] = [
  "play",
  "home",
  "levels",
  "profile",
  "leaderboard",
  "submit-puzzle",
  "contact",
];

/** Screen → route path. Only these routes may render ads. */
export const SCREEN_ROUTES: Record<AdScreen, string> = {
  play: "/play",
  home: "/",
  levels: "/levels",
  profile: "/profile",
  leaderboard: "/leaderboard",
  "submit-puzzle": "/submit-puzzle",
  contact: "/contact",
};

/** Human-readable Hebrew label per screen (used in admin UI). */
export const SCREEN_LABEL_HE: Record<AdScreen, string> = {
  play: "מסך המשחק",
  home: "דף הבית",
  levels: "מסך איך אני",
  profile: "פרופיל",
  leaderboard: "מי בראש",
  "submit-puzzle": "הוספת הגדרה",
  contact: "יצירת קשר",
};

/** Screen name normalized for setting-key use (dashes → underscores). */
export function screenKeyPart(s: AdScreen): string {
  return s.replace(/-/g, "_");
}

/** Build a setting key: `ads_<screen>_<suffix>` or `adsense_<screen>_<suffix>`. */
export function screenSettingKey(
  prefix: "ads" | "adsense",
  screen: AdScreen,
  suffix: string,
): string {
  return `${prefix}_${screenKeyPart(screen)}_${suffix}`;
}
