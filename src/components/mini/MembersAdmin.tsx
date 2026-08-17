import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminFindUser, adminSetBan, adminAdjustBalance, adminListBanned } from "@/lib/bot-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, ShieldOff, ShieldCheck } from "lucide-react";

type Props = { tenantId: string; initData: string | null; previewTgId: number | null; tokenSymbol: string };

export function MembersAdmin({ tenantId, initData, previewTgId, tokenSymbol }: Props) {
  const auth = { tenantId, initData, previewTgId: initData ? null : previewTgId };
  const find = useServerFn(adminFindUser);
  const setBan = useServerFn(adminSetBan);
  const adjust = useServerFn(adminAdjustBalance);
  const banned = useServerFn(adminListBanned);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [res, setRes] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [delta, setDelta] = useState("");

  const search = useMutation({
    mutationFn: () => find({ data: { ...auth, query: q } }),
    onSuccess: (r: any) => setRes(r),
    onError: (e: any) => { setRes(null); toast.error(e.message); },
  });

  const ban = useMutation({
    mutationFn: (v: { userId: string; banned: boolean }) => setBan({ data: { ...auth, ...v, reason } }),
    onSuccess: () => { toast.success("Updated"); search.mutate(); qc.invalidateQueries({ queryKey: ["banned", tenantId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const adj = useMutation({
    mutationFn: (userId: string) => adjust({ data: { ...auth, userId, delta_tokens: Number(delta) || 0 } }),
    onSuccess: () => { toast.success("Balance updated"); setDelta(""); search.mutate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: bannedRows = [] } = useQuery({
    queryKey: ["banned", tenantId],
    queryFn: () => banned({ data: auth }),
  });

  const unban = useMutation({
    mutationFn: (userId: string) => setBan({ data: { ...auth, userId, banned: false, reason: null } }),
    onSuccess: () => { toast.success("Unblocked"); qc.invalidateQueries({ queryKey: ["banned", tenantId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const u = res?.user;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input placeholder="Telegram ID or @username" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button onClick={() => search.mutate()} disabled={!q.trim() || search.isPending}>
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {u && (
        <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
          <div className="font-semibold text-base">{u.first_name || "Member"} {u.username && <span className="text-white/50">@{u.username}</span>}</div>
          <Kv k="Telegram ID" v={u.telegram_id} />
          <Kv k="Balance" v={`${Number(u.balance).toFixed(2)} ${tokenSymbol}`} />
          <Kv k="USDT" v={`$${Number(u.usd_balance).toFixed(4)}`} />
          <Kv k="Referrals" v={res.referrals} />
          <Kv k="Ads watched" v={u.ads_watched ?? 0} />
          <Kv k="Joined" v={new Date(u.created_at).toLocaleDateString()} />
          <Kv k="Last address" v={u.last_ip || "—"} />
          <Kv k="Status" v={u.banned ? `Blocked — ${u.ban_reason}` : "Active"} />

          <div className="flex gap-2 pt-2">
            <Input placeholder={`± ${tokenSymbol}`} type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
            <Button variant="secondary" onClick={() => adj.mutate(u.id)} disabled={!delta}>Adjust</Button>
          </div>
          <Input placeholder="Reason (for block)" value={reason} onChange={(e) => setReason(e.target.value)} />
          {u.banned ? (
            <Button className="w-full" variant="secondary" onClick={() => ban.mutate({ userId: u.id, banned: false })}>
              <ShieldCheck className="h-4 w-4 mr-1" /> Unblock
            </Button>
          ) : (
            <Button className="w-full" variant="destructive" onClick={() => ban.mutate({ userId: u.id, banned: true })}>
              <ShieldOff className="h-4 w-4 mr-1" /> Block member
            </Button>
          )}
          {res.recent?.length > 0 && (
            <div className="pt-2 space-y-1">
              <div className="text-xs uppercase text-white/40">Recent activity</div>
              {res.recent.map((t: any, i: number) => (
                <div key={i} className="flex justify-between text-xs text-white/60">
                  <span>{t.type}</span><span>{Number(t.amount).toFixed(2)} · {t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-white/40">Blocked accounts ({bannedRows.length})</div>
        {bannedRows.map((b: any) => (
          <div key={b.id} className="flex items-center gap-2 bg-white/5 rounded-lg p-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{b.username ? `@${b.username}` : b.first_name || b.telegram_id}</div>
              <div className="text-xs text-white/40 truncate">
                {b.ban_kind === "multi_account" ? "Multiple accounts" : "Manual"} · {b.ban_reason}
              </div>
            </div>
            <Button size="sm" variant="secondary" onClick={() => unban.mutate(b.id)}>Unblock</Button>
          </div>
        ))}
        {bannedRows.length === 0 && <p className="text-xs text-white/40">No blocked accounts.</p>}
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: any }) {
  return <div className="flex justify-between"><span className="text-white/50">{k}</span><span className="font-medium">{String(v)}</span></div>;
}
