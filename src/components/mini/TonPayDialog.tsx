import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createTonInvoice, checkTonInvoice } from "@/lib/ton-pay.functions";
import { Copy, Loader2, Wallet, CheckCircle2, X } from "lucide-react";

export type TonPayRequest =
  | { kind: "miner"; minerId: string; label: string }
  | { kind: "coins"; tonAmount: number; label: string };

type Props = {
  open: boolean;
  request: TonPayRequest | null;
  userId: string;
  theme: any;
  onClose: () => void;
  onPaid: () => void;
};

type Invoice = { id: string; address: string; memo: string; amountTon: number; tokens: number };

/** Payment sheet: shows the bot's TON address + a unique memo, then verifies on-chain. */
export function TonPayDialog({ open, request, userId, theme, onClose, onPaid }: Props) {
  const create = useServerFn(createTonInvoice);
  const check = useServerFn(checkTonInvoice);
  const [inv, setInv] = useState<Invoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !request || !userId) return;
    setInv(null); setPaid(false); setError(null); setBusy(true);
    create({
      data: {
        userId,
        kind: request.kind,
        minerId: request.kind === "miner" ? request.minerId : null,
        tonAmount: request.kind === "coins" ? request.tonAmount : null,
      },
    })
      .then((r: any) => setInv(r))
      .catch((e: any) => setError(e?.message ?? "Could not start the payment"))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request?.kind, (request as any)?.minerId, (request as any)?.tonAmount, userId]);

  if (!open) return null;

  const copy = async (value: string, what: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Copy failed — select it manually");
    }
  };

  const tonLink = inv
    ? `ton://transfer/${inv.address}?amount=${Math.round(inv.amountTon * 1e9)}&text=${encodeURIComponent(inv.memo)}`
    : "";

  const verify = async () => {
    if (!inv) return;
    setChecking(true);
    try {
      const res: any = await check({ data: { invoiceId: inv.id } });
      if (res.status === "paid") {
        setPaid(true);
        toast.success("Payment confirmed!");
        onPaid();
      } else {
        toast.message("No payment found yet", { description: "It can take up to a minute. Try again shortly." });
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Verification failed");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl p-5 pb-8 space-y-4"
        style={{ background: "#0d0d12", border: `1px solid ${theme?.primary ?? "#f59e0b"}44` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5" style={{ color: theme?.primary }} />
          <h3 className="font-black flex-1">Pay with Gram (TON)</h3>
          <button onClick={onClose} className="text-white/40"><X className="h-5 w-5" /></button>
        </div>

        {busy && <p className="text-sm text-white/60 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Preparing payment…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {inv && !paid && (
          <>
            <p className="text-xs text-white/60">
              {request?.label} — send <b className="text-white">{inv.amountTon} TON</b> to the address below and
              <b className="text-white"> include the memo</b>. Payments without the memo cannot be matched.
            </p>

            <Field label="Amount" value={`${inv.amountTon} TON`} onCopy={() => copy(String(inv.amountTon), "Amount")} />
            <Field label="Address" value={inv.address} onCopy={() => copy(inv.address, "Address")} mono />
            <Field label="Memo / comment (required)" value={inv.memo} onCopy={() => copy(inv.memo, "Memo")} mono highlight={theme?.primary} />

            <a href={tonLink} className="block">
              <Button className="w-full" style={{ background: theme?.primary, color: "#000" }}>Open in Tonkeeper</Button>
            </a>
            <Button variant="outline" className="w-full" disabled={checking} onClick={verify}>
              {checking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Checking blockchain…</> : "I have paid — verify"}
            </Button>
            <p className="text-[11px] text-white/40 text-center">
              Your purchase unlocks automatically once the transfer is confirmed on-chain.
            </p>
          </>
        )}

        {paid && (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 mx-auto" style={{ color: theme?.primary }} />
            <p className="font-bold">Payment confirmed</p>
            <p className="text-xs text-white/60">Your purchase has been delivered.</p>
            <Button className="w-full mt-2" style={{ background: theme?.primary, color: "#000" }} onClick={onClose}>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onCopy, mono, highlight }: { label: string; value: string; onCopy: () => void; mono?: boolean; highlight?: string }) {
  return (
    <div className="rounded-2xl px-3 py-2" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${highlight ? `${highlight}66` : "rgba(255,255,255,0.1)"}` }}>
      <p className="text-[10px] uppercase tracking-widest text-white/45">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`flex-1 text-sm break-all ${mono ? "font-mono" : "font-bold"}`}>{value}</p>
        <button onClick={onCopy} className="p-1.5 rounded-lg bg-white/10"><Copy className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}
