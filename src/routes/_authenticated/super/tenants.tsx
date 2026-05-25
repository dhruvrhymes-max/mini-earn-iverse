import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAllTenants, setTenantStatus, deleteTenant } from "@/lib/super.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super/tenants")({
  component: Tenants,
});

function Tenants() {
  const list = useServerFn(listAllTenants);
  const setS = useServerFn(setTenantStatus);
  const del = useServerFn(deleteTenant);
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ["allTenants"] });
  const { data: rows = [] } = useQuery({ queryKey: ["allTenants"], queryFn: () => list() });
  const sm = useMutation({ mutationFn: (v: any) => setS({ data: v }), onSuccess: () => { inv(); toast.success("Updated"); } });
  const dm = useMutation({ mutationFn: (id: string) => del({ data: { id } }), onSuccess: () => { inv(); toast.success("Deleted"); } });
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">All Tenants</h1>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted"><tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Slug</th><th className="p-3 text-left">Status</th><th className="p-3"></th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{t.name}</td>
                <td className="p-3">/{t.slug}</td>
                <td className="p-3">{t.status}</td>
                <td className="p-3 text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => sm.mutate({ id: t.id, status: t.status === "active" ? "suspended" : "active" })}>{t.status === "active" ? "Suspend" : "Activate"}</Button>
                  <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete this tenant?")) dm.mutate(t.id); }}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
