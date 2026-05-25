import { createFileRoute, Link, Outlet, useParams } from "@tanstack/react-router";
import { ArrowLeft, BarChart, Coins, Megaphone, ListChecks, Wallet, Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/$tenantId")({
  component: TenantLayout,
});

function TenantLayout() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId" });
  const links = [
    { to: "/admin/$tenantId", label: "Analytics", icon: BarChart, exact: true },
    { to: "/admin/$tenantId/branding", label: "Branding", icon: Coins },
    { to: "/admin/$tenantId/economics", label: "Economics", icon: Wallet },
    { to: "/admin/$tenantId/ads", label: "Ads", icon: Megaphone },
    { to: "/admin/$tenantId/tasks", label: "Tasks", icon: ListChecks },
    { to: "/admin/$tenantId/milestones", label: "Referrals", icon: Users },
    { to: "/admin/$tenantId/withdrawals", label: "Withdrawals", icon: Wallet },
  ];
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="w-60 border-r p-4 space-y-1">
        <Link to="/admin" className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All bots
        </Link>
        {links.map((l) => (
          <Link key={l.to} to={l.to} params={{ tenantId }} activeOptions={{ exact: l.exact }}
            className="flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-accent [&.active]:bg-accent [&.active]:font-medium"
            activeProps={{ className: "active" }}>
            <l.icon className="h-4 w-4" /> {l.label}
          </Link>
        ))}
      </aside>
      <main className="flex-1 p-8 overflow-auto"><Outlet /></main>
    </div>
  );
}
