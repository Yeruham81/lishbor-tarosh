import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { useFeatureFlags } from "@/hooks/use-public-settings";
import { getMyRole } from "@/lib/account.functions";
import { useAdConfig } from "./config";
import { SCREEN_ROUTES } from "./screens";
import type {
  AdConfig,
  AdEligibilityInput,
  AdPosition,
  AdScreen,
  DesktopAdLayoutMode,
} from "./types";

const EXCLUDED_PREFIXES = ["/admin", "/challenge"];
const EXCLUDED_EXACT = ["/demo", "/auth", "/reset-password"];

function isExcludedRoute(pathname: string): boolean {
  if (EXCLUDED_EXACT.includes(pathname)) return true;
  return EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Which positions are permitted by a desktop layout mode on a wide viewport. */
function desktopAllows(layout: DesktopAdLayoutMode, pos: AdPosition): boolean {
  switch (layout) {
    case "off":
      return false;
    case "bottom-only":
      return pos === "bottom";
    case "left-and-bottom":
      return pos === "left" || pos === "bottom";
    case "right-and-bottom":
      return pos === "right" || pos === "bottom";
    case "both-sides":
      return pos === "left" || pos === "right";
  }
}

/** Pure predicate — safe to unit-test. */
export function isAdEligible(input: AdEligibilityInput): boolean {
  const {
    screen,
    position,
    pathname,
    isAdmin,
    adminLoading,
    isWide,
    config,
    hasRemoveAdsEntitlement,
  } = input;

  // Loading / admin / entitlement guards.
  if (adminLoading) return false;
  if (isAdmin) return false;
  if (hasRemoveAdsEntitlement) return false;

  // Global kill switches.
  if (!config.enabled) return false;
  if (!config.staticEnabled) return false;

  // Route guards.
  if (isExcludedRoute(pathname)) return false;
  if (pathname !== SCREEN_ROUTES[screen]) return false;

  const sc = config.screens[screen];
  if (!sc) return false;
  if (sc.desktopLayout === "off") return false;

  // Per-position enable toggle.
  const posCfg = sc[position];
  if (!posCfg?.enabled) return false;

  // Mobile / narrow: only bottom, for every layout except "off"
  // (and bottom individually enabled — already checked above).
  if (!isWide) {
    return position === "bottom";
  }

  // Wide desktop: respect the layout matrix.
  return desktopAllows(sc.desktopLayout, position);
}

/** SSR-safe wide-viewport detector (>= 1280px). */
export function useIsWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 1280px)");
    const on = () => setWide(mq.matches);
    on();
    if (mq.addEventListener) mq.addEventListener("change", on);
    else mq.addListener(on);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", on);
      else mq.removeListener(on);
    };
  }, []);
  return wide;
}

/** React hook that assembles eligibility inputs from live app state. */
export function useAdEligibility(screen: AdScreen, position: AdPosition): boolean {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const flags = useFeatureFlags();
  const config: AdConfig = useAdConfig();
  const isWide = useIsWide();
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
    screen,
    position,
    pathname,
    isAdmin,
    adminLoading,
    isWide,
    config,
    hasRemoveAdsEntitlement: false,
  });
}
