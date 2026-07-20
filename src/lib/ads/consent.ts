import { useEffect, useState, useCallback } from "react";

/**
 * Centralized ad-personalization consent module.
 *
 * Reuses the existing `cookie_consent_v1` localStorage record used by the
 * CookieConsentBanner. This module owns storage-key handling, validation,
 * reads, writes, and cross-tab synchronization so no other component
 * touches localStorage directly.
 *
 * Important: this preference controls PERSONALIZATION only — it does NOT
 * control whether the ad placeholder or (future) ads render. See
 * `src/lib/ads/eligibility.ts` for ad eligibility.
 */

export const CONSENT_STORAGE_KEY = "cookie_consent_v1";
export const CONSENT_VERSION = 1;

/** Event fired whenever consent is saved from within this tab. */
export const CONSENT_CHANGED_EVENT = "lishbor:cookie-consent-changed";
/** Event other UI can dispatch to open the shared preferences dialog. */
export const OPEN_COOKIE_PREFERENCES_EVENT = "lishbor:open-cookie-preferences";

export type AdPersonalizationPreference = "unknown" | "granted" | "denied";

export type CookieConsentRecord = {
  essential: true;
  analytics: boolean;
  advertising: boolean;
  version: 1;
  savedAt: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Read + validate the stored consent record. Returns null when invalid/absent. */
export function readConsent(): CookieConsentRecord | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== CONSENT_VERSION) return null;
    if (parsed.essential !== true) return null;
    if (typeof parsed.analytics !== "boolean") return null;
    if (typeof parsed.advertising !== "boolean") return null;
    return {
      essential: true,
      analytics: parsed.analytics,
      advertising: parsed.advertising,
      version: CONSENT_VERSION,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function getAdPersonalizationPreference(): AdPersonalizationPreference {
  const rec = readConsent();
  if (!rec) return "unknown";
  return rec.advertising ? "granted" : "denied";
}

/** Save consent. Dispatches CONSENT_CHANGED_EVENT for same-tab listeners. */
export function saveConsent(input: { analytics: boolean; advertising: boolean }): CookieConsentRecord {
  const rec: CookieConsentRecord = {
    essential: true,
    analytics: !!input.analytics,
    advertising: !!input.advertising,
    version: CONSENT_VERSION,
    savedAt: new Date().toISOString(),
  };
  if (isBrowser()) {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(rec));
      window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: rec }));
    } catch {
      /* ignore quota / privacy-mode failures */
    }
  }
  return rec;
}

/** Ask any mounted preferences dialog to open. */
export function openCookiePreferences(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(OPEN_COOKIE_PREFERENCES_EVENT));
}

/**
 * React hook returning the current preference plus the raw record.
 * Updates immediately on same-tab saves and on cross-tab storage events.
 */
export function useAdPersonalization(): {
  preference: AdPersonalizationPreference;
  record: CookieConsentRecord | null;
} {
  const [record, setRecord] = useState<CookieConsentRecord | null>(() => readConsent());

  const refresh = useCallback(() => setRecord(readConsent()), []);

  useEffect(() => {
    if (!isBrowser()) return;
    refresh();
    const onChanged = () => refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_STORAGE_KEY) refresh();
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onChanged as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, onChanged as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  return {
    preference: record ? (record.advertising ? "granted" : "denied") : "unknown",
    record,
  };
}
