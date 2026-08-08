import type { AdServingMode } from "./types";

/**
 * Central AdServingMode hook.
 *
 * PRE-APPROVAL HARD LOCK:
 * This MUST return "none" until AdSense approval and explicit live activation.
 * No real Google ad request may occur, regardless of admin settings, IDs,
 * local cookie preferences, or CMP state.
 *
 * CMP preparation now lives centrally in `src/lib/ads/consent.ts` via
 * `useCertifiedCmp()`, which observes a Google-certified / IAB TCF-compatible
 * CMP without making any serving decision. When live serving is implemented,
 * this hook is the only place that should combine:
 *
 * - certified CMP / TCF state,
 * - the application's local advertising preference as an additional signal,
 * - product/region requirements,
 * - and the desired personalized / non-personalized / limited mode.
 *
 * Do not move that logic into AdSlot or individual routes.
 */
export function useAdServingMode(): AdServingMode {
  return "none";
}
