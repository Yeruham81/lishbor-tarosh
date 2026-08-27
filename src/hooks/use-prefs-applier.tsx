import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/game.functions";
import { useAuth } from "./use-auth";
import { applyAccessibilityPreferences, type AccessibilityPrefs } from "@/lib/profile-preferences";
import { getStoredThemePreferences } from "./use-theme";

/**
 * Applies accessibility & theme preferences from the user's profile to
 * <html>: data-text-size, data-high-contrast, data-colorblind, dark class,
 * data-palette. Guest/local palette and mode are restored on sign-out; authenticated
 * accessibility settings are applied only after that user profile loads.
 */
export function usePrefsApplier() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const fetchProfile = useServerFn(getProfile);
  const appliedUserIdRef = useRef<string | null>(null);
  const { data: profile } = useQuery({
    queryKey: ["profile", userId ?? "anon"],
    queryFn: () => fetchProfile(),
    enabled: !!userId,
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const applyGuestPreferences = () => {
      const guestTheme = getStoredThemePreferences();
      applyAccessibilityPreferences({
        ...guestTheme,
        text_size: "normal",
        high_contrast: false,
        colorblind: false,
        screen_reader: false,
      });
    };

    if (!userId) {
      appliedUserIdRef.current = null;
      applyGuestPreferences();
      return;
    }

    if (!profile) {
      // If one authenticated session is replaced directly by another, do not
      // leave the previous player's display preferences active while the new
      // profile is loading.
      if (appliedUserIdRef.current && appliedUserIdRef.current !== userId) {
        appliedUserIdRef.current = null;
        applyGuestPreferences();
      }
      return;
    }

    const preferences = (profile.accessibility_prefs ?? {}) as AccessibilityPrefs;
    applyAccessibilityPreferences(preferences);
    appliedUserIdRef.current = userId;
  }, [profile, userId]);

  if (!userId || !profile) return {};
  return (profile.accessibility_prefs ?? {}) as AccessibilityPrefs;
}
