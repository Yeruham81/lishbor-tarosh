import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useFeatureFlags } from "@/hooks/use-public-settings";
import { getMyRole } from "@/lib/account.functions";
import type { AdEligibilityInput, AdPlacement } from "./types";

/** Pure predicate — safe to unit-test. */
export function isAdEligible(input: AdEligibilityInput): boolean {
  const { placement, pathname, isAdmin, adminLoading, flags, hasRemoveAdsEntitlement } = input;

  // Never show anything while admin status is still resolving.
  if (adminLoading) return false;
  // Admins never see placeholders or ads.
  if (isAdmin) return false;
  // Future entitlement hook — not implemented yet.
  if (hasRemoveAdsEntitlement) return false;

  // Global kill switches. Placeholders only render in test mode this phase.
  if (!flags.adsEnabled) return false;
  if (!flags.adsTestMode) return false;

  // Excluded routes — never show ads anywhere near these.
  if (pathname === "/demo") return false;
  if (pathname === "/auth") return false;
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/reset-password")) return false;
  if (pathname.startsWith("/challenge")) return false;

  // Placement-specific rules.
  switch (placement) {
    case "post-solve-bottom":
      if (!flags.postSolveEnabled) return false;
      // Allowed only on the authenticated play screen.
      return pathname === "/play";
    case "game-bottom":
      // Reserved for a future phase.
      return false;
  }
}

/** React hook that assembles the eligibility inputs from live app state. */
export function useAdEligibility(placement: AdPlacement): boolean {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const flags = useFeatureFlags();
  const { user } = useAuth();

  const fetchRole = useServerFn(getMyRole);
  const roleQ = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const adminLoading = flags.loading || (!!user && roleQ.isLoading);
  const isAdmin = !!roleQ.data?.isAdmin;

  return isAdEligible({
    placement,
    pathname,
    isAdmin,
    adminLoading,
    flags: {
      adsEnabled: (flags as any).adsEnabled ?? false,
      adsTestMode: (flags as any).adsTestMode ?? false,
      postSolveEnabled: (flags as any).adsPostSolveEnabled ?? false,
      gameEnabled: (flags as any).adsGameEnabled ?? false,
    },
  });
}
