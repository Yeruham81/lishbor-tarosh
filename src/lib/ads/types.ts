// Centralized advertising types.
// The set of approved ad screens, positions, and desktop layouts is fixed.
// Never use arbitrary strings at call sites.

export type AdScreen = "play" | "home" | "levels" | "profile" | "leaderboard" | "submit-puzzle" | "contact";

export type AdPosition = "left" | "right" | "bottom";

/** `${screen}-${position}`. */
export type AdPlacement = `${AdScreen}-${AdPosition}`;

/**
 * Randomly selected once per page/ad cycle on sufficiently wide desktops.
 *
 *   both-sides       → left + right
 *   left-and-bottom  → left + bottom
 *   right-and-bottom → right + bottom
 *
 * Every desktop layout contains at least one side advertisement and never
 * displays more than two advertisements.
 *
 * Mobile and narrow screens ignore this layout and show only the bottom unit.
 */
export type RandomDesktopAdLayout = "both-sides" | "left-and-bottom" | "right-and-bottom";

/**
 * Future serving mode — describes HOW an eligible ad should be served.
 * It remains independent of general ad eligibility.
 *
 * During the current infrastructure phase, serving remains locked to "none".
 */
export type AdServingMode = "personalized" | "non-personalized" | "limited" | "none";

export type AdPositionConfig = {
  slotId: string;
};

/**
 * One enable/disable switch controls all advertising on the screen.
 * The desktop layout is selected randomly by PageAdLayout.
 */
export type ScreenAdConfig = {
  enabled: boolean;
  left: AdPositionConfig;
  right: AdPositionConfig;
  bottom: AdPositionConfig;
};

export type AdConfig = {
  enabled: boolean;
  staticEnabled: boolean;
  testMode: boolean;
  liveEnabled: boolean;
  transitionAdsEnabled: boolean;
  publisherId: string;
  screens: Record<AdScreen, ScreenAdConfig>;
};

export type AdEligibilityInput = {
  screen: AdScreen;
  position: AdPosition;
  pathname: string;
  isAdmin: boolean;
  adminLoading: boolean;
  config: AdConfig;

  /**
   * Reserved for a future ad-removal entitlement such as Premium.
   * It is not currently connected to profiles.is_paid, payments, or storage.
   */
  hasRemoveAdsEntitlement?: boolean;
};
