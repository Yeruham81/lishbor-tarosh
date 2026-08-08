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
 *
 * ⚠️ NOT A CERTIFIED CMP.
 * This local consent record is an INTERNAL preference mechanism only. It is
 * not a Google-certified Consent Management Platform and is not an IAB TCF
 * (Transparency & Consent Framework) implementation. It MUST NOT be used as
 * the sole source of truth for AdSense personalization or any downstream
 * ad-serving decision in regions/products where a certified CMP or IAB TCF
 * integration is required (e.g. EEA/UK/CH under Google's EU user consent
 * policy). When live AdSense is enabled, integrate a Google-certified CMP
 * (or equivalent TCF vendor) and defer to its signals; the record here may
 * complement — but never replace — that source of truth.
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

// ---------------------------------------------------------------------------
// Certified CMP / IAB TCF bridge — preparation only
// ---------------------------------------------------------------------------
//
// This bridge intentionally does NOT decide whether AdSense may load and does
// NOT translate TCF data into personalized/non-personalized ad serving yet.
// `useAdServingMode()` remains hard-locked to "none" until live activation is
// explicitly approved and the selected certified CMP has been configured.
//
// The bridge is provider-neutral: any Google-certified CMP exposing the IAB
// TCF v2 `__tcfapi` can be observed here. This lets the future serving layer
// consume a centralized CMP signal instead of querying window globals inside
// individual AdSlot components.

export type CertifiedCmpStatus = "waiting" | "ready" | "unavailable" | "error";

export type CertifiedCmpSnapshot = {
  status: CertifiedCmpStatus;
  gdprApplies: boolean | null;
  tcString: string | null;
  eventStatus: string | null;
  cmpId: number | null;
  cmpVersion: number | null;
  tcfPolicyVersion: number | null;
};

type TcfApi = (
  command: string,
  version: number,
  callback: (data: any, success: boolean) => void,
  parameter?: any,
) => void;

declare global {
  interface Window {
    __tcfapi?: TcfApi;
  }
}

const EMPTY_CMP_SNAPSHOT: CertifiedCmpSnapshot = {
  status: "waiting",
  gdprApplies: null,
  tcString: null,
  eventStatus: null,
  cmpId: null,
  cmpVersion: null,
  tcfPolicyVersion: null,
};

function snapshotFromTcData(data: any): CertifiedCmpSnapshot {
  return {
    status: "ready",
    gdprApplies: typeof data?.gdprApplies === "boolean" ? data.gdprApplies : null,
    tcString: typeof data?.tcString === "string" && data.tcString.length > 0 ? data.tcString : null,
    eventStatus: typeof data?.eventStatus === "string" ? data.eventStatus : null,
    cmpId: typeof data?.cmpId === "number" ? data.cmpId : null,
    cmpVersion: typeof data?.cmpVersion === "number" ? data.cmpVersion : null,
    tcfPolicyVersion: typeof data?.tcfPolicyVersion === "number" ? data.tcfPolicyVersion : null,
  };
}

/**
 * Observe the certified CMP's IAB TCF signal when one is installed.
 *
 * - No CMP installed: returns `unavailable` after a short discovery window.
 * - CMP present but still collecting consent: remains observable via the TCF
 *   addEventListener callback and updates when consent changes.
 * - This hook does not load a CMP, does not load Google Ads, and does not make
 *   any ad-serving decision.
 */
export function useCertifiedCmp(): CertifiedCmpSnapshot {
  const [snapshot, setSnapshot] = useState<CertifiedCmpSnapshot>(EMPTY_CMP_SNAPSHOT);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    let listenerId: number | null = null;
    let attempts = 0;
    const maxAttempts = 40; // ~10 seconds at 250ms; no permanent polling.

    const attach = (): boolean => {
      const api = window.__tcfapi;
      if (typeof api !== "function") return false;

      try {
        api("addEventListener", 2, (data: any, success: boolean) => {
          if (cancelled) return;

          if (!success || !data) {
            setSnapshot((current) => ({ ...current, status: "error" }));
            return;
          }

          if (typeof data.listenerId === "number") listenerId = data.listenerId;
          setSnapshot(snapshotFromTcData(data));
        });
        return true;
      } catch {
        setSnapshot((current) => ({ ...current, status: "error" }));
        return true;
      }
    };

    if (attach()) {
      return () => {
        cancelled = true;
        if (listenerId !== null && typeof window.__tcfapi === "function") {
          try {
            window.__tcfapi("removeEventListener", 2, () => {}, listenerId);
          } catch {
            /* best effort only */
          }
        }
      };
    }

    const timer = window.setInterval(() => {
      attempts += 1;

      if (attach()) {
        window.clearInterval(timer);
        return;
      }

      if (attempts >= maxAttempts) {
        window.clearInterval(timer);
        if (!cancelled) {
          setSnapshot({
            ...EMPTY_CMP_SNAPSHOT,
            status: "unavailable",
          });
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      if (listenerId !== null && typeof window.__tcfapi === "function") {
        try {
          window.__tcfapi("removeEventListener", 2, () => {}, listenerId);
        } catch {
          /* best effort only */
        }
      }
    };
  }, []);

  return snapshot;
}
