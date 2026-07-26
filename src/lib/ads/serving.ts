import type { AdServingMode } from "./types";

/**
 * Central AdServingMode hook.
 *
 * During Phase 3 this MUST always return "none". No real Google request may
 * occur, regardless of personalization preference, admin settings, or IDs.
 *
 * ⚠️ Future consent-based serving logic MUST NOT rely solely on the local
 * `cookie_consent_v1` advertising preference (see `src/lib/ads/consent.ts`).
 * When AdSense is enabled, the decision between personalized /
 * non-personalized / limited ads must take into account a Google-certified
 * CMP (or an equivalent IAB TCF-compliant consent source) — especially for
 * EEA/UK/CH traffic under Google's EU user consent policy. The local
 * preference may act as an additional signal or override, but the certified
 * consent source is the authoritative input. Do not implement that logic
 * here yet.
 */
export function useAdServingMode(): AdServingMode {
  return "none";
}

