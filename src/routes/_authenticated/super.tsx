import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Megaphone, Building2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/super")({
  component: SuperLayout,
});

function SuperLayout() {
  const { roles, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !roles.includes("super_admin")) nav({ to: "/admin" }); }, [loading, roles, nav]);
  if (!roles.includes("super_admin")) return null;
  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 border-r p-4 space-y-1">
        <Link to="/admin" className="flex items-center gap-2 text-sm text-muted-foreground mb-4"><ArrowLeft className="h-4 w-4" />Exit super admin</Link>
        <Link to="/super" activeOptions={{ exact: true }} activeProps={{ className: "bg-accent" }} className="flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-accent"><Shield className="h-4 w-4" />Overview</Link>
        <Link to="/super/tenants" activeProps={{ className: "bg-accent" }} className="flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-accent"><Building2 className="h-4 w-4" />Tenants</Link>
        <Link to="/super/announcements" activeProps={{ className: "bg-accent" }} className="flex items-center gap-2 px-3 py-2 rounded text-sm hover:bg-accent"><Megaphone className="h-4 w-4" />Announcements</Link>
      </aside>
      <main className="flex-1 p-8 overflow-auto"><Outlet /></main>
    </div>
  );
}
