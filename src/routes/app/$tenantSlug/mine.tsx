import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/app/$tenantSlug/mine")({
  component: () => <Navigate to="/app/$tenantSlug" params={(p: any) => p} />,
});
