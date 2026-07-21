import type { AdServingMode } from "./types";

/**
 * Central AdServingMode hook.
 *
 * During Phase 3 this MUST always return "none". No real Google request may
 * occur, regardless of personalization preference, admin settings, or IDs.
 * A later phase will introduce personalized / non-personalized / limited
 * based on the user's cookie-consent record.
 */
export function useAdServingMode(): AdServingMode {
  return "none";
}
