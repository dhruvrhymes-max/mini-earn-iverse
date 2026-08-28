import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminFindUser, adminSetBan, adminAdjustBalance, adminListMembers, adminIpNeighbors } from "@/lib/bot-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, ShieldOff, ShieldCheck, Users } from "lucide-react";

type Props = { tenantId: string; initData: string | null; previewTgId: number | null; tokenSymbol: string };

function prettyIp(v: string | null | undefined) {
  if (!v) return "not captured yet";
  return String(v).startsWith("dev:") ? `device ${String(v).slice(4, 14)}` : String(v);
}

export function MembersAdmin({ tenantId, initData, previewTgId, tokenSymbol }: Props) {
  const auth = { tenantId, initData, previewTgId: initData ? null : previewTgId };
  const find = useServerFn(adminFindUser);
  const setBan = useServerFn(adminSetBan);
  const adjust = useServerFn(adminAdjustBalance);
  const listMembers = useServerFn(adminListMembers);
  const neighbors = useServerFn(adminIpNeighbors);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [res, setRes] = useState<any | null>(null);
  const [reason, setReason] = useState("");
  const [delta, setDelta] = useState("");
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [ipOpenId, setIpOpenId] = useState<string | null>(null);
  const [ipData, setIpData] = useState<Record<string, any>>({});
  const [ipLoading, setIpLoading] = useState(false);

  async function toggleIp(userId: string) {
    if (ipOpenId === userId) { setIpOpenId(null); return; }
    setIpOpenId(userId);
    if (ipData[userId]) return;
    setIpLoading(true);
    try {
      const r: any = await neighbors({ data: { ...auth, userId } });
      setIpData((prev) => ({ ...prev, [userId]: r }));
    } catch (e: any) { toast.error(e.message); setIpOpenId(null); }
    finally { setIpLoading(false); }
  }


  const search = useMutation({
    mutationFn: () => find({ data: { ...auth, query: q } }),
    onSuccess: (r: any) => setRes(r),
    onError: (e: any) => { setRes(null); toast.error(e.message); },
  });

  const ban = useMutation({
    mutationFn: (v: { userId: string; banned: boolean }) => setBan({ data: { ...auth, ...v, reason } }),
    onSuccess: () => { toast.success("Updated"); if (q.trim()) search.mutate(); qc.invalidateQueries({ queryKey: ["members", tenantId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const adj = useMutation({
    mutationFn: (userId: string) => adjust({ data: { ...auth, userId, delta_tokens: Number(delta) || 0 } }),
    onSuccess: () => { toast.success("Balance updated"); setDelta(""); setAdjustingId(null); if (q.trim()) search.mutate(); qc.invalidateQueries({ queryKey: ["members", tenantId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const PAGE = 50;
  const [page, setPage] = useState(1);
  const [listQuery, setListQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => { setListQuery(q.trim()); setPage(1); }, 350);
    return () => clearTimeout(id);
  }, [q]);

  const { data: list, isLoading, isFetching } = useQuery({
    queryKey: ["members", tenantId, listQuery, page],
    queryFn: () => listMembers({ data: { ...auth, search: listQuery || null, offset: 0, limit: page * PAGE } }) as Promise<any>,
    placeholderData: (prev: any) => prev,
  });
  const visibleMembers: any[] = list?.rows ?? [];
  const totalMembers: number = list?.total ?? 0;
  const hasMore: boolean = !!list?.hasMore;

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
          <Kv k="Active refs" v={res.activeReferrals ?? 0} />
          <Kv k="Ads watched" v={u.ads_watched ?? 0} />
          <Kv k="Joined" v={new Date(u.created_at).toLocaleDateString()} />
          <div className="flex justify-between">
            <span className="text-white/50">Last address</span>
            <button className="font-medium text-primary/80 underline underline-offset-2" onClick={() => toggleIp(u.id)}>
              {prettyIp(u.last_ip)}
            </button>
          </div>
          {ipOpenId === u.id && (
            <div className="rounded-lg bg-black/30 p-2 space-y-1 text-[11px]">
              {ipLoading && !ipData[u.id] && <p className="text-white/40">Loading linked accounts…</p>}
              {ipData[u.id] && ((ipData[u.id].accounts ?? []).length === 0
                ? <p className="text-white/40">No other accounts from these addresses.</p>
                : ipData[u.id].accounts.map((a: any) => (
                  <div key={a.id} className="bg-white/5 rounded p-1.5">
                    <div className="truncate">{a.first_name || "Member"} {a.username ? `@${a.username}` : ""} · {a.banned ? "Blocked" : "Active"}</div>
                    <div className="text-white/40 truncate">UID {a.id} · TG {a.telegram_id} · {prettyIp(a.shared_ip)}</div>
                  </div>
                )))}
            </div>
          )}

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

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-white/40">
          <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> All members</span>
          <span>{visibleMembers.length} / {totalMembers}</span>
        </div>
        {isLoading && <p className="text-xs text-white/40">Loading members…</p>}
        {visibleMembers.map((member: any) => (
          <div key={member.id} className="bg-white/5 rounded-lg p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{member.first_name || "Member"} {member.username ? `@${member.username}` : ""}</div>
                <div className="text-xs text-white/40">ID {member.telegram_id} · {member.banned ? (member.ban_kind === "multi_account" ? "Blocked · multi-account" : "Blocked") : "Active"}</div>
                <button
                  onClick={() => toggleIp(member.id)}
                  className="text-[11px] text-primary/80 underline underline-offset-2 truncate max-w-full text-left"
                >
                  IP: {prettyIp(member.last_ip)} {ipOpenId === member.id ? "▴" : "▾"}
                </button>

              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-semibold">{Number(member.balance).toFixed(2)} {tokenSymbol}</div>
                <div className="text-xs text-white/40">${Number(member.usd_balance).toFixed(4)} USDT</div>
              </div>
            </div>
            {ipOpenId === member.id && (
              <div className="rounded-lg bg-black/30 p-2 space-y-2 text-[11px]">
                {ipLoading && !ipData[member.id] && <p className="text-white/40">Loading linked accounts…</p>}
                {ipData[member.id] && (
                  <>
                    <div className="text-white/50">
                      Addresses seen: {(ipData[member.id].keys ?? []).length === 0
                        ? "none recorded yet"
                        : ipData[member.id].keys.map(prettyIp).join(", ")}
                    </div>
                    {(ipData[member.id].accounts ?? []).length === 0 ? (
                      <p className="text-white/40">No other accounts from these addresses.</p>
                    ) : (
                      <div className="space-y-1">
                        <div className="uppercase tracking-wider text-white/40">Other accounts on same IP/device</div>
                        {ipData[member.id].accounts.map((a: any) => (
                          <div key={a.id} className="flex items-center justify-between gap-2 bg-white/5 rounded p-1.5">
                            <div className="min-w-0">
                              <div className="truncate">{a.first_name || "Member"} {a.username ? `@${a.username}` : ""}</div>
                              <div className="text-white/40 truncate">UID {a.id}</div>
                              <div className="text-white/40 truncate">TG {a.telegram_id} · {prettyIp(a.shared_ip)} · {a.banned ? "Blocked" : "Active"}</div>
                            </div>
                            <Button size="sm" variant={a.banned ? "secondary" : "destructive"} className="shrink-0"
                              onClick={() => ban.mutate({ userId: a.id, banned: !a.banned })} disabled={ban.isPending}>
                              {a.banned ? "Unblock" : "Block"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <MemberStat label="Refs" value={member.referrals} />
              <MemberStat label="Active refs" value={member.active_referrals} />
              <MemberStat label="Ads" value={member.ads_watched ?? 0} />
            </div>

            {adjustingId === member.id && (
              <div className="flex gap-2">
                <Input placeholder={`± ${tokenSymbol}`} type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
                <Button size="sm" variant="secondary" onClick={() => adj.mutate(member.id)} disabled={!delta || adj.isPending}>Apply</Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setAdjustingId(adjustingId === member.id ? null : member.id); setDelta(""); }}>Adjust balance</Button>
              <Button size="sm" variant={member.banned ? "secondary" : "destructive"} onClick={() => ban.mutate({ userId: member.id, banned: !member.banned })} disabled={ban.isPending}>
                {member.banned ? <><ShieldCheck className="h-4 w-4 mr-1" /> Unblock</> : <><ShieldOff className="h-4 w-4 mr-1" /> Block</>}
              </Button>
            </div>
          </div>
        ))}
        {!isLoading && visibleMembers.length === 0 && <p className="text-xs text-white/40">No members found.</p>}
        {hasMore && (
          <Button variant="secondary" className="w-full" disabled={isFetching} onClick={() => setPage((n) => n + 1)}>
            {isFetching ? "Loading…" : "Load more members"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: any }) {
  return <div className="flex justify-between"><span className="text-white/50">{k}</span><span className="font-medium">{String(v)}</span></div>;
}

function MemberStat({ label, value }: { label: string; value: number }) {
  return <div className="bg-white/5 rounded p-2"><div className="font-semibold">{value}</div><div className="text-white/40">{label}</div></div>;
}
