/**
 * Centralized, browser-only AdSense loader.
 *
 * The AdSense script is loaded lazily, on demand, at most once per page.
 * Only an eligible real ad unit may request the load. During Phase 3 no
 * caller invokes this loader — AdSlot never renders a live AdSenseUnit
 * because useAdServingMode() is "none".
 *
 * Rules:
 *   - Browser only. Never runs during SSR.
 *   - Never loads in test mode.
 *   - Never loaded globally from AppShell / root layout.
 *   - Empty/invalid Publisher ID does not create the script.
 *   - Duplicate concurrent loads share a single Promise.
 *   - An existing matching script is reused.
 *   - Failures/ad-blocker rejections resolve silently.
 */

const SCRIPT_ID = "lishbor-adsbygoogle";
const SRC_BASE = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
const PUBLISHER_ID_RE = /^ca-pub-\d+$/;

let loadPromise: Promise<void> | null = null;

/** Publisher ID must match `ca-pub-<digits>`. */
export function isValidPublisherId(id: string | undefined | null): boolean {
  if (!id) return false;
  return PUBLISHER_ID_RE.test(id);
}

/** Slot ID must be digits only. */
export function isValidSlotId(id: string | undefined | null): boolean {
  if (!id) return false;
  return /^\d+$/.test(id);
}

/**
 * Load the AdSense loader script. Safe to call multiple times — concurrent
 * calls share the same Promise; a matching existing script is reused.
 */
export function loadAdSense(publisherId: string): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve();
  }
  if (!isValidPublisherId(publisherId)) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve) => {
    try {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = `${SRC_BASE}?client=${encodeURIComponent(publisherId)}`;
      s.async = true;
      s.crossOrigin = "anonymous";
      s.dataset.lishborAdsense = "1";
      s.onload = () => resolve();
      s.onerror = () => resolve(); // Silent failure — ad-blocker, offline, etc.
      document.head.appendChild(s);
    } catch {
      resolve();
    }
  });
  return loadPromise;
}
