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
    { to: "/admin/$tenantId/channels", label: "Check channels", icon: ListChecks },
    { to: "/admin/$tenantId/referrals", label: "Referral rewards", icon: Users },
    { to: "/admin/$tenantId/milestones", label: "Milestones", icon: Users },
    { to: "/admin/$tenantId/withdrawals", label: "Withdrawals", icon: Wallet },
    { to: "/admin/$tenantId/payout-settings", label: "Payout settings", icon: Settings },
  ];
  const nav = (
    <>
      <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 text-sm text-muted-foreground mb-4 hover:text-foreground">
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
    </>
  );

  return (
    <div className="min-h-screen bg-background md:flex">
      {/* Mobile top bar with hamburger */}
      <header className="md:hidden sticky top-0 z-40 flex items-center gap-2 border-b bg-background px-3 h-12">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-sm font-semibold">Bot admin</span>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative w-64 max-w-[80%] h-full bg-background border-r p-4 space-y-1 overflow-y-auto">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute top-3 right-3 p-2 rounded hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:block md:w-60 shrink-0 border-r p-4 space-y-1 md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        {nav}
      </aside>

      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-x-hidden"><Outlet /></main>
    </div>
  );
}

