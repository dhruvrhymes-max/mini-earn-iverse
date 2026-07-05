import { createFileRoute, Link, Outlet, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, BarChart, Coins, Megaphone, ListChecks, Wallet, Users, Settings, Menu, X, Pickaxe } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/$tenantId")({
  component: TenantLayout,
});

function TenantLayout() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId" });
  const [open, setOpen] = useState(false);
  const links = [
    { to: "/admin/$tenantId", label: "Analytics", icon: BarChart, exact: true },
    { to: "/admin/$tenantId/branding", label: "Manage Bot", icon: Settings },
    { to: "/admin/$tenantId/economics", label: "Economics", icon: Coins },
    { to: "/admin/$tenantId/miners", label: "Miners", icon: Pickaxe },
    { to: "/admin/$tenantId/ads", label: "Ads", icon: Megaphone },
    { to: "/admin/$tenantId/tasks", label: "Tasks", icon: ListChecks },
    { to: "/admin/$tenantId/referrals", label: "Referral rewards", icon: Users },
    { to: "/admin/$tenantId/milestones", label: "Milestones", icon: Users },
    { to: "/admin/$tenantId/withdrawals", label: "Withdrawals", icon: Wallet },
  ];
  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Mobile top bar with hamburger */}
      <div className="md:hidden sticky top-0 z-30 flex items-center gap-2 border-b bg-background px-3 h-12">
        <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <Link to="/admin" className="text-sm font-medium">All bots</Link>
      </div>

      {/* Sidebar — drawer on mobile, fixed on desktop */}
      <aside
        className={`${open ? "block" : "hidden"} md:block md:w-60 md:border-r md:relative absolute z-20 top-12 md:top-0 left-0 right-0 md:right-auto bg-background border-b md:border-b-0 p-4 space-y-1`}
      >
        <Link to="/admin" className="hidden md:flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All bots
        </Link>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            params={{ tenantId }}
            activeOptions={{ exact: l.exact }}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-accent [&.active]:bg-accent [&.active]:font-medium"
            activeProps={{ className: "active" }}
          >
            <l.icon className="h-4 w-4" /> {l.label}
          </Link>
        ))}
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-auto"><Outlet /></main>
    </div>
  );
}
