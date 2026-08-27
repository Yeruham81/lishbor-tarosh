import { useEffect, useState, useCallback } from "react";

export type Palette = "sunset" | "ocean" | "forest" | "candy";
export type Mode = "light" | "dark";

const PALETTE_KEY = "mh.palette";
const MODE_KEY = "mh.mode";

export const PALETTES: { id: Palette; label: string; swatch: string }[] = [
  { id: "sunset", label: "שקיעה", swatch: "linear-gradient(135deg,#ff7a3d,#ff2e80,#7b3aed)" },
  { id: "ocean", label: "אוקיינוס", swatch: "linear-gradient(135deg,#06b6d4,#3b82f6,#6366f1)" },
  { id: "forest", label: "יער", swatch: "linear-gradient(135deg,#84cc16,#10b981,#0d9488)" },
  { id: "candy", label: "סוכריה", swatch: "linear-gradient(135deg,#f472b6,#a855f7,#6366f1)" },
];

function apply(palette: Palette, mode: Mode) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.toggle("dark", mode === "dark");
  html.dataset.palette = palette;
}

export function getStoredThemePreferences(): { palette: Palette; mode: Mode } {
  if (typeof window === "undefined") return { palette: "sunset", mode: "light" };
  try {
    const palette = (localStorage.getItem(PALETTE_KEY) as Palette) || "sunset";
    const mode = (localStorage.getItem(MODE_KEY) as Mode) || "light";
    return { palette, mode };
  } catch {
    return { palette: "sunset", mode: "light" };
  }
}

export function useTheme() {
  const [palette, setPaletteState] = useState<Palette>("sunset");
  const [mode, setModeState] = useState<Mode>("light");

  useEffect(() => {
    try {
      const p = (localStorage.getItem(PALETTE_KEY) as Palette) || "sunset";
      const m = (localStorage.getItem(MODE_KEY) as Mode) || "light";
      setPaletteState(p);
      setModeState(m);
      apply(p, m);
    } catch {}
  }, []);

  const setPalette = useCallback(
    (p: Palette) => {
      setPaletteState(p);
      try {
        localStorage.setItem(PALETTE_KEY, p);
      } catch {}
      apply(p, mode);
    },
    [mode],
  );

  const setMode = useCallback(
    (m: Mode) => {
      setModeState(m);
      try {
        localStorage.setItem(MODE_KEY, m);
      } catch {}
      apply(palette, m);
    },
    [palette],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(PALETTE_KEY);
      localStorage.removeItem(MODE_KEY);
    } catch {}
    setPaletteState("sunset");
    setModeState("light");
    apply("sunset", "light");
  }, []);

  return { palette, mode, setPalette, setMode, reset };
}

// Apply on initial script load (before React) to prevent flash
if (typeof window !== "undefined") {
  try {
    const p = (localStorage.getItem(PALETTE_KEY) as Palette) || "sunset";
    const m = (localStorage.getItem(MODE_KEY) as Mode) || "light";
    apply(p, m);
  } catch {}
}
