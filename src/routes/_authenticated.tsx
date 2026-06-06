import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DisplayNameSetup } from "@/components/DisplayNameSetup";
import { usePrefsApplier } from "@/hooks/use-prefs-applier";

export const Route = createFileRoute("/_authenticated")({
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
