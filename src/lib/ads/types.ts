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
