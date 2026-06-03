import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DisplayNameSetup } from "@/components/DisplayNameSetup";

export const Route = createFileRoute("/_authenticated")({
  component: () => (
    <>
      <Outlet />
      <DisplayNameSetup />
    </>
  ),
});
