// Centralized advertising types.
// Add new placements here — do not use arbitrary strings at call sites.
export type AdPlacement = "post-solve-bottom" | "game-bottom";

export type AdEligibilityInput = {
  placement: AdPlacement;
  pathname: string;
  isAdmin: boolean;
  adminLoading: boolean;
  flags: {
    adsEnabled: boolean;
    adsTestMode: boolean;
    postSolveEnabled: boolean;
    gameEnabled: boolean;
  };
  /**
   * Reserved for a future ad-removal entitlement (e.g. Premium).
   * Not implemented in this phase — always leave undefined for now.
   */
  hasRemoveAdsEntitlement?: boolean;
};

/**
 * Reserved for a future phase — describes how an eligible ad should be served.
 * Not consumed by any code path yet. Ad ELIGIBILITY is independent of the
 * personalization preference; declining personalization must not remove ads,
 * it only shifts the future mode toward "non-personalized" or "limited".
 */
export type AdServingMode = "personalized" | "non-personalized" | "limited" | "none";

/** Typed shape returned by useAdConfig(). */
export type AdConfig = {
  enabled: boolean;
  testMode: boolean;
  h5Enabled: boolean;
  publisherId: string;
  placements: {
    postSolveBottom: {
      enabled: boolean;
      slotId: string;
    };
    gameBottom: {
      enabled: boolean;
      slotId: string;
    };
  };
};
