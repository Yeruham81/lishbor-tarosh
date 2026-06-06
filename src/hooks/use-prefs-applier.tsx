import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/game.functions";
import { useAuth } from "./use-auth";

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
    const html = document.documentElement;
    const a: any = (profile as any)?.accessibility_prefs ?? {};
    html.dataset.textSize = a.text_size ?? "normal";
    html.dataset.highContrast = a.high_contrast ? "true" : "false";
    html.dataset.colorblind = a.colorblind ? "true" : "false";
    if (a.palette) html.dataset.palette = a.palette;
    if (a.mode) html.classList.toggle("dark", a.mode === "dark");
    if (a.screen_reader) html.setAttribute("aria-live", "polite");
    else html.removeAttribute("aria-live");
  }, [profile]);
}
