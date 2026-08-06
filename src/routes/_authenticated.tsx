import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DisplayNameSetup } from "@/components/DisplayNameSetup";
import { usePrefsApplier } from "@/hooks/use-prefs-applier";
import { supabase } from "@/integrations/supabase/client";
import { getDisplayNameStatus } from "@/lib/account.functions";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,

  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      await supabase.auth.signOut().catch(() => {});
      throw redirect({ to: "/auth" });
    }

    return {
      user: data.user,
    };
  },

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
