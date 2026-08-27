export type AccessibilityPrefs = {
  text_size?: "small" | "normal" | "large";
  high_contrast?: boolean;
  colorblind?: boolean;
  screen_reader?: boolean;
  palette?: "sunset" | "ocean" | "forest" | "candy";
  mode?: "light" | "dark";
};

export type NotificationPrefs = {
  mute_level_up?: boolean;
  mute_challenge?: boolean;
  mute_daily?: boolean;
  mute_events?: boolean;
  mute_announcements?: boolean;
};

export function applyAccessibilityPreferences(preferences: AccessibilityPrefs) {
  if (typeof document === "undefined") return;

  const html = document.documentElement;
  html.dataset.textSize = preferences.text_size ?? "normal";
  html.dataset.highContrast = preferences.high_contrast ? "true" : "false";
  html.dataset.colorblind = preferences.colorblind ? "true" : "false";
  html.dataset.palette = preferences.palette ?? "sunset";
  html.dataset.screenReader = preferences.screen_reader ? "true" : "false";
  html.classList.toggle("dark", preferences.mode === "dark");

  // Never turn the whole document into a live region. Dedicated status and
  // dialog regions announce only the relevant changes without noisy repeats.
  html.removeAttribute("aria-live");
}
