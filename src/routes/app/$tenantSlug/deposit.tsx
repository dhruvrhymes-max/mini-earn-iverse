import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/$tenantSlug/deposit")({
  component: () => (
    <div className="p-6 pt-12 text-center">
      <h1 className="text-2xl font-bold mb-4">Deposit</h1>
      <p className="text-white/60">Buy tokens — coming soon.</p>
    </div>
  ),
});
