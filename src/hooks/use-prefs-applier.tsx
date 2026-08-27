import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/game.functions";
import { useAuth } from "./use-auth";
import { applyAccessibilityPreferences, type AccessibilityPrefs } from "@/lib/profile-preferences";

/**
 * Applies accessibility & theme preferences from the user's profile to
 * <html>: data-text-size, data-high-contrast, data-colorblind, dark class,
 * data-palette. Falls back to localStorage when not yet loaded.
 */
export function usePrefsApplier() {
  const { user } = useAuth();
  const fetchProfile = useServerFn(getProfile);
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
    enabled: !!user,
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const preferences = (profile?.accessibility_prefs ?? {}) as AccessibilityPrefs;
    applyAccessibilityPreferences(preferences);
  }, [profile]);
}
