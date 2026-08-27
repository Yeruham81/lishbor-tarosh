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

  it("recovers a minimal or previously captured PayPal order before verification", () => {
    const payments = readFileSync("src/lib/payments.functions.ts", "utf8");
    expect(payments).toContain("if (!hasCompleteCaptureRepresentation(facts))");
    expect(payments).toContain("order = await getPaypalOrder(cfg, data.orderId)");
  });

  it("replaces only a pending PayPal order that is confirmed missing", () => {
    const payments = readFileSync("src/lib/payments.functions.ts", "utf8");

    expect(payments).toContain("if (!isPaypalRequestError(error, 404)) throw error");
    expect(payments).toContain("[paypal] stale pending order closed");
    expect(payments).toContain("return null");
  });

  it("resumes an existing PayPal checkout while it can still be completed", () => {
    const payments = readFileSync("src/lib/payments.functions.ts", "utf8");

    expect(payments).toContain('if (status === "CREATED" && url)');
    expect(payments).toContain("return { orderId: purchase.paypal_order_id, approvalUrl: url }");
    expect(payments).toContain('if (status === "APPROVED" || status === "COMPLETED")');
    expect(payments).toContain("approvalUrl: localReturnUrl(purchase.paypal_order_id)");
  });

  it("preserves the approved PayPal order while an unauthenticated user signs back in", () => {
    const authenticatedRoute = readFileSync("src/routes/_authenticated.tsx", "utf8");
    const authRoute = readFileSync("src/routes/auth.tsx", "utf8");

    expect(authenticatedRoute).toContain("paymentResumeSearch(location.href)");
    expect(authenticatedRoute).toContain('returnTo: "payment-return"');
    expect(authRoute).toContain('returnTo === "payment-return"');
    expect(authRoute).toContain('to: "/payment/return"');
    expect(authRoute).toContain("paymentToken");
  });

  it("uses an RTL-safe Hebrew-only purchase label", () => {
    const dialog = readFileSync("src/components/PremiumUpgradeDialog.tsx", "utf8");
    const card = readFileSync("src/components/PremiumUpgradeCard.tsx", "utf8");

    expect(dialog).toContain("מעבר לתשלום מאובטח");
    expect(card).toContain("לתשלום מאובטח – 20 ש״ח");
    expect(dialog).not.toContain("PayPal — 20 ₪");
  });

  it("allows automatic clue advancement only for paid players", () => {
    const profileRoute = readFileSync("src/routes/_authenticated/profile.tsx", "utf8");
    const accountFunctions = readFileSync("src/lib/account.functions.ts", "utf8");
    const preferenceHardeningMigration = readFileSync(
      "supabase/migrations/20260827104000_profile_preferences_avatar_hardening.sql",
      "utf8",
    );
    const gameFunctions = readFileSync("src/lib/game.functions.ts", "utf8");
    const playRoute = readFileSync("src/routes/_authenticated/play.tsx", "utf8");

    expect(profileRoute).toContain("checked={!!p.is_paid && !!p.auto_next}");
    expect(profileRoute).toContain("disabled={!p.is_paid}");
    expect(profileRoute).toContain("disabled={disabled}");
    expect(profileRoute).toContain('"זמין לשחקנים ששילמו"');
    expect(accountFunctions).toContain('supabaseAdmin.rpc("update_profile_preferences_atomic"');
    expect(accountFunctions).toContain('throw new Error("premium_required")');
    expect(preferenceHardeningMigration).toContain("SELECT is_paid");
    expect(preferenceHardeningMigration).toContain("FOR UPDATE");
    expect(preferenceHardeningMigration).toContain("IF _auto_next IS TRUE AND NOT COALESCE(v_is_paid, false) THEN");
    expect(preferenceHardeningMigration).toContain("RAISE EXCEPTION 'premium_required'");
    expect(gameFunctions).toContain("is_blocked, is_paid, created_at");
    expect(playRoute).toContain("!profileQ.data?.is_paid || !profileQ.data?.auto_next");
  });

  it("enforces the automatic-advance entitlement in the database", () => {
    const migration = readFileSync("supabase/migrations/20260827010000_premium_auto_next_entitlement.sql", "utf8");

    expect(migration).toContain("CHECK (auto_next = false OR is_paid = true)");
    expect(migration).toContain("auth.role() IN ('anon', 'authenticated')");
    expect(migration).toContain("payment_entitlement_read_only");
  });

  it("shows paid-player status and email in the requested admin columns", () => {
    const playersRoute = readFileSync("src/routes/_authenticated/admin.players.tsx", "utf8");
    const payingRoute = readFileSync("src/routes/_authenticated/admin.paying.tsx", "utf8");

    const emailColumn = playersRoute.indexOf('{ key: "email", label: "אימייל" }');
    const subscriptionColumn = playersRoute.indexOf('{ key: "subscription", label: "מנוי" }');
    const ageColumn = playersRoute.indexOf('{ key: "age", label: "גיל" }');
    const payingPlayerHeader = payingRoute.indexOf("<TableHead>שחקן</TableHead>");
    const payingEmailHeader = payingRoute.indexOf('className="hidden md:table-cell">אימייל</TableHead>');
    const payingAgeHeader = payingRoute.indexOf('className="hidden md:table-cell">גיל</TableHead>');

    expect(emailColumn).toBeGreaterThan(-1);
    expect(subscriptionColumn).toBeGreaterThan(emailColumn);
    expect(ageColumn).toBeGreaterThan(subscriptionColumn);
    expect(playersRoute).toContain("r.is_paid ?");
    expect(playersRoute).toContain("text-emerald-700");
    expect(payingPlayerHeader).toBeGreaterThan(-1);
    expect(payingEmailHeader).toBeGreaterThan(payingPlayerHeader);
    expect(payingAgeHeader).toBeGreaterThan(payingEmailHeader);
    expect(payingRoute).toContain('{r.email ?? "—"}');
  });
});
