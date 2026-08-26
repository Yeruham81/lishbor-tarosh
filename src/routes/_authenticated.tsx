import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DisplayNameSetup } from "@/components/DisplayNameSetup";
import { usePrefsApplier } from "@/hooks/use-prefs-applier";
import { supabase } from "@/integrations/supabase/client";
import { getDisplayNameStatus } from "@/lib/account.functions";
import { useAuth } from "@/hooks/use-auth";
import { NOINDEX_META } from "@/lib/site";

const PAYPAL_ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function paymentResumeSearch(href: string) {
  const url = new URL(href, "https://local.invalid");
  const paymentToken = url.searchParams.get("token");
  if (!paymentToken || !PAYPAL_ORDER_ID_PATTERN.test(paymentToken)) return null;

  if (url.pathname === "/payment/return") {
    return { returnTo: "payment-return" as const, paymentToken };
  }
  if (url.pathname === "/payment/cancel") {
    return { returnTo: "payment-cancel" as const, paymentToken };
  }
  return null;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,

  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      await supabase.auth.signOut().catch(() => {});
      throw redirect({
        to: "/auth",
        search: paymentResumeSearch(location.href) ?? {},
      });
    }

    return {
      user: data.user,
    };
  },

  head: () => ({ meta: [NOINDEX_META] }),

  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  usePrefsApplier();

  const { user } = useAuth();
  const fetchStatus = useServerFn(getDisplayNameStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["display-name-status", user?.id],
    queryFn: () => fetchStatus(),
    enabled: !!user?.id,
  });

  const needsSetup = !!user && (isLoading || !data || !data.confirmed);

  return (
    <>
      {!needsSetup && <Outlet />}
      <DisplayNameSetup />
    </>
  );
}
