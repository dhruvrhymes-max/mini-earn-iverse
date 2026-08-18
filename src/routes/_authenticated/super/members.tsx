import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAccountApprovals, setAccountApproval } from "@/lib/super.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/super/members")({
  head: () => ({
    meta: [
      { title: "Member Approvals | ZeroLabNetwork" },
      { name: "description", content: "Approve or reject new ZeroLabNetwork members before they can create bots." },
      { property: "og:title", content: "Member Approvals | ZeroLabNetwork" },
      { property: "og:description", content: "Approve or reject new ZeroLabNetwork members before they can create bots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Members,
});

function Members() {
  const list = useServerFn(listAccountApprovals);
  const setStatus = useServerFn(setAccountApproval);
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["accountApprovals"], queryFn: () => list() });
  const mutation = useMutation({
    mutationFn: (v: { userId: string; status: "approved" | "rejected" | "pending" }) => setStatus({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["accountApprovals"] }); toast.success("Member updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const pending = data.filter((r: any) => r.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Member approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">New registrations must be approved here before they can create bots.</p>
      </div>
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : (
        <div className="space-y-3">
          {pending.length > 0 && <p className="text-sm font-medium">{pending.length} awaiting review</p>}
          {data.map((row: any) => (
            <div key={row.user_id} className="border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{row.email || row.user_id}</div>
                <div className="text-xs text-muted-foreground">
                  {row.status} · {row.bots} bot{row.bots === 1 ? "" : "s"} · joined {new Date(row.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" disabled={mutation.isPending || row.status === "approved"} onClick={() => mutation.mutate({ userId: row.user_id, status: "approved" })}>Approve</Button>
                <Button size="sm" variant="destructive" disabled={mutation.isPending || row.status === "rejected"} onClick={() => mutation.mutate({ userId: row.user_id, status: "rejected" })}>Reject</Button>
              </div>
            </div>
          ))}
          {data.length === 0 && <p className="text-muted-foreground">No members yet.</p>}
        </div>
      )}
    </div>
  );
}
