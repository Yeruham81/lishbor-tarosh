import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { DisplayNameSetup } from "@/components/DisplayNameSetup";
import { usePrefsApplier } from "@/hooks/use-prefs-applier";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      await supabase.auth.signOut().catch(() => {});
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  usePrefsApplier();
  return (
    <>
      <Outlet />
      <DisplayNameSetup />
    </>
  );
}
