import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAdEligible } from "@/lib/ads/eligibility";
import type { AdConfig, AdScreen } from "@/lib/ads/types";

const allScreens: AdScreen[] = ["play", "home", "levels", "profile", "leaderboard", "submit-puzzle", "contact"];

const config: AdConfig = {
  enabled: true,
  staticEnabled: true,
  testMode: true,
  liveEnabled: false,
  transitionAdsEnabled: false,
  publisherId: "",
  screens: Object.fromEntries(
    allScreens.map((screen) => [
      screen,
      {
        enabled: true,
        left: { slotId: "" },
        right: { slotId: "" },
        bottom: { slotId: "" },
      },
    ]),
  ) as AdConfig["screens"],
};

describe("Premium entitlement", () => {
  it("suppresses advertisements for a paid user", () => {
    const common = {
      screen: "play" as const,
      pathname: "/play",
      isAdmin: false,
      adminLoading: false,
      config,
    };

    expect(isAdEligible({ ...common, hasRemoveAdsEntitlement: false })).toBe(true);
    expect(isAdEligible({ ...common, hasRemoveAdsEntitlement: true })).toBe(false);
  });

  it("fails closed while authenticated entitlement state is unavailable", () => {
    expect(
      isAdEligible({
        screen: "play",
        pathname: "/play",
        isAdmin: false,
        adminLoading: true,
        config,
        hasRemoveAdsEntitlement: false,
      }),
    ).toBe(false);
  });

  it("installs the one-pending-purchase and atomic-profile invariants", () => {
    const migration = readFileSync("supabase/migrations/20260826010000_paypal_checkout_hardening.sql", "utf8");
    expect(migration).toContain(
      "CREATE UNIQUE INDEX IF NOT EXISTS purchases_one_pending_per_user_provider_environment_idx",
    );
    expect(migration).toContain("WHERE status = 'pending'");
    expect(migration).toContain("GET DIAGNOSTICS _profile_rows = ROW_COUNT");
    expect(migration).toContain("profile_entitlement_not_granted");
  });

  it("never promises that an uncertain return-flow payment was not charged", () => {
    const returnRoute = readFileSync("src/routes/_authenticated/payment.return.tsx", "utf8");
    expect(returnRoute).not.toContain("לא חויבתם");
    expect(returnRoute).toContain("בדיקה מחדש");
    expect(returnRoute).toContain("אל תתחילו רכישה חדשה");
  });
});
