import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Megaphone, Building2, ArrowLeft, ListChecks, Menu, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super")({
  component: SuperLayout,
});

const NAV = [
  { to: "/super", label: "Overview", Icon: Shield, exact: true },
  { to: "/super/tenants", label: "Tenants", Icon: Building2 },
  { to: "/super/members", label: "Member approvals", Icon: Shield },
  { to: "/super/check-bots", label: "Check bots", Icon: ListChecks },
  { to: "/super/tasks", label: "Global tasks", Icon: ListChecks },
  { to: "/super/announcements", label: "Announcements", Icon: Megaphone },
] as const;

function SuperLayout() {
  const { roles, loading } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!loading && !roles.includes("super_admin")) nav({ to: "/admin" }); }, [loading, roles, nav]);
  if (!roles.includes("super_admin")) return null;

  const links = (
    <>
      <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <ArrowLeft className="h-4 w-4" />Exit super admin
      </Link>
      {NAV.map(({ to, label, Icon, exact }: any) => (
        <Link
          key={to}
          to={to}
          onClick={() => setOpen(false)}
          {...(exact ? { activeOptions: { exact: true } } : {})}
          activeProps={{ className: "bg-accent" }}
          className="flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-accent"
        >
          <Icon className="h-4 w-4" />{label}
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen md:flex bg-background">
      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 flex items-center gap-3 border-b bg-background px-4 h-14">
        <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-2 -ml-2 rounded hover:bg-accent">
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold text-sm">Super admin</span>
      </header>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative w-64 max-w-[80%] h-full bg-background border-r p-4 space-y-1 overflow-y-auto">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="absolute top-3 right-3 p-2 rounded hover:bg-accent">
              <X className="h-4 w-4" />
            </button>
            {links}
          </aside>
        </div>
      )}

      <aside className="hidden md:block w-60 shrink-0 border-r p-4 space-y-1 md:sticky md:top-0 md:h-screen md:overflow-y-auto">{links}</aside>

      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
