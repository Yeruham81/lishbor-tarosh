// Centralized advertising types.
// The set of approved ad screens (routes) and positions is fixed.
// Never use arbitrary strings at call sites.

export type AdScreen = "play" | "home" | "levels" | "profile" | "leaderboard" | "submit-puzzle" | "contact";

export type AdPosition = "left" | "right" | "bottom";

/** `${screen}-${position}`. */
export type AdPlacement = `${AdScreen}-${AdPosition}`;

/** * Randomly selected once per page/ad cycle on sufficiently wide desktops. * * both-sides → left + right * left-and-bottom → left + bottom * right-and-bottom → right + bottom * * Every desktop layout contains at least one side advertisement and never * displays more than two advertisements. * * Mobile and narrow screens ignore this layout and show only the bottom unit. */
export type RandomDesktopAdLayout = "both-sides" | "left-and-bottom" | "right-and-bottom";

/**
 * Future serving mode — describes HOW an eligible ad should be served
 * (personalized / non-personalized / limited / none). Independent of
 * eligibility; declining personalization must not remove ads. In this phase
 * the hook always returns "none" and no live ad may load.
 */
export type AdServingMode = "personalized" | "non-personalized" | "limited" | "none";

export type AdPositionConfig = {
  enabled: boolean;
  slotId: string;
};

export type ScreenAdConfig = {
  desktopLayout: DesktopAdLayoutMode;
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
  /** True on sufficiently wide desktop viewports (>= 1280px). */
  isWide: boolean;
  config: AdConfig;
  /**
   * Reserved for a future ad-removal entitlement (e.g. Premium). Not wired to
   * profiles.is_paid, payments, or any storage during this phase. Always
   * pass the current default (typically `undefined` / `false`).
   */
  hasRemoveAdsEntitlement?: boolean;
};
