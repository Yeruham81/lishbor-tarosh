import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useFeatureFlags } from "@/hooks/use-public-settings";
import { getMyRole } from "@/lib/account.functions";
import { useAdConfig } from "./config";
import { SCREEN_ROUTES } from "./screens";
import type { AdConfig, AdEligibilityInput, AdScreen } from "./types";

const EXCLUDED_PREFIXES = ["/admin", "/challenge"];
const EXCLUDED_EXACT = ["/demo", "/auth", "/reset-password"];

function isExcludedRoute(pathname: string): boolean {
  if (EXCLUDED_EXACT.includes(pathname)) return true;

  return EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Determines whether advertising is generally eligible on the requested
 * screen. Responsive position selection is handled by PageAdLayout.
 */
export function isAdEligible(input: AdEligibilityInput): boolean {
  const { screen, pathname, isAdmin, adminLoading, config, hasRemoveAdsEntitlement } = input;

  // Fail closed while role or settings state is unavailable.
  if (adminLoading) return false;

  // User exclusions.
  if (isAdmin) return false;
  if (hasRemoveAdsEntitlement) return false;

  // Global advertising switches.
  if (!config.enabled) return false;
  if (!config.staticEnabled) return false;

  // Route exclusions and explicit screen allowlist.
  if (isExcludedRoute(pathname)) return false;
  if (pathname !== SCREEN_ROUTES[screen]) return false;

  // One switch controls all placements on the current screen.
  const screenConfig = config.screens[screen];

  if (!screenConfig?.enabled) return false;

  return true;
}

/**
 * Assembles eligibility inputs from the current route, settings,
 * authentication state, and Admin-role query.
 *
 * The position remains part of the public hook API because AdSlot calls this
 * hook per placement, but PageAdLayout controls which positions are mounted.
 */
export function useAdEligibility(screen: AdScreen, position: AdPosition): boolean {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  const flags = useFeatureFlags();
  const config: AdConfig = useAdConfig();
  const { user } = useAuth();

  const fetchRole = useServerFn(getMyRole);

  const roleQuery = useQuery({
    queryKey: ["my-role"],
    queryFn: () => fetchRole(),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const adminLoading = flags.loading || (!!user && (roleQuery.isLoading || roleQuery.isError));

  const isAdmin = !!roleQuery.data?.isAdmin;

  return isAdEligible({
    screen,
    position,
    pathname,
    isAdmin,
    adminLoading,
    config,
    hasRemoveAdsEntitlement: false,
  });
}
