import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTenant, updateTenant, deleteTenant } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { sanitizeShortName } from "@/lib/mini-admin";

import { MiniAppLinks } from "@/components/admin/MiniAppLinks";

const WEBHOOK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/telegram-webhook`;

export const Route = createFileRoute("/_authenticated/admin/$tenantId/branding")({
  component: Branding,
});

function Branding() {
  const { tenantId } = useParams({ from: "/_authenticated/admin/$tenantId/branding" });
  const nav = useNavigate();
  const get = useServerFn(getTenant);
  const upd = useServerFn(updateTenant);
  const del = useServerFn(deleteTenant);
  const qc = useQueryClient();
  const { data: t } = useQuery({ queryKey: ["tenant", tenantId], queryFn: () => get({ data: { id: tenantId } }) });
  const [form, setForm] = useState<any>({});
  const [uploading, setUploading] = useState(false);
  const [registering, setRegistering] = useState(false);
  useEffect(() => { if (t) {
    const econ: any = (t as any).economics || {};
    setForm({
      token_name: t.token_name, token_symbol: t.token_symbol, action_verb: t.action_verb,
      token_icon_url: t.token_icon_url ?? "",
      bot_username: (t as any).bot_username ?? "",
      mini_app_short_name: sanitizeShortName((t as any).mini_app_short_name ?? ""),
      welcome_text: (t as any).welcome_text ?? "",
      welcome_cta_text: (t as any).welcome_cta_text ?? "",
      welcome_image_url: (t as any).welcome_image_url ?? "",
      bot_token: "",
      primary: (t.theme as any).primary, background: (t.theme as any).background, accent: (t.theme as any).accent,
      // economics
      tokens_per_mine: econ.tokens_per_mine ?? econ.mining_rate_per_hour ?? 100,
      mine_duration_seconds: econ.mine_duration_seconds ?? (Number(econ.mining_cycle_hours ?? 4) * 3600),
      token_per_usdt: econ.token_per_usdt ?? 10000,
      min_withdraw_usdt: econ.min_withdraw_usdt ?? 0.1,
      // admin ids
      admin_telegram_ids: Array.isArray((t as any).admin_telegram_ids) ? (t as any).admin_telegram_ids.join(", ") : "",
    });
  } }, [t]);

  const m = useMutation({
    mutationFn: () => {
      const cleanShort = sanitizeShortName(form.mini_app_short_name);
      const adminIds = String(form.admin_telegram_ids || "")
        .split(/[\s,]+/).map((s: string) => s.trim()).filter(Boolean)
        .map((s: string) => Number(s)).filter((n: number) => Number.isFinite(n) && n > 0);
      // Keep legacy fields in sync with new intuitive fields.
      const tokensPerMine = Number(form.tokens_per_mine) || 0;
      const mineDurSec = Math.max(1, Number(form.mine_duration_seconds) || 1);
      const cycleHours = mineDurSec / 3600;
      const ratePerHour = tokensPerMine / cycleHours;
      const patch: any = {
        token_name: form.token_name, token_symbol: form.token_symbol, action_verb: form.action_verb,
        token_icon_url: form.token_icon_url || null,
        bot_username: form.bot_username || null,
        mini_app_short_name: cleanShort || null,
        welcome_text: form.welcome_text || null,
        welcome_cta_text: form.welcome_cta_text || null,
        welcome_image_url: form.welcome_image_url || null,
        theme: { primary: form.primary, background: form.background, accent: form.accent },
        admin_telegram_ids: adminIds,
        economics: {
          tokens_per_mine: tokensPerMine,
          mine_duration_seconds: mineDurSec,
          mining_cycle_hours: cycleHours,
          mining_rate_per_hour: ratePerHour,
          token_per_usdt: Number(form.token_per_usdt) || 0,
          min_withdraw_usdt: Number(form.min_withdraw_usdt) || 0,
        },
      };
      if (form.bot_token && form.bot_token.trim()) patch.bot_token = form.bot_token.trim();
      return upd({ data: { id: tenantId, patch } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenant", tenantId] }); toast.success("Saved"); setForm((f: any) => ({ ...f, bot_token: "" })); },
    onError: (e: any) => toast.error(e.message),
  });

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `welcome/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("tenant-assets").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
      setForm((f: any) => ({ ...f, welcome_image_url: data.publicUrl }));
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  }

  async function reRegisterWebhook() {
    const token = form.bot_token?.trim();
    if (!token) { toast.error("Paste the bot token first to re-register the webhook"); return; }
    setRegistering(true);
    try {
      const url = `${WEBHOOK_URL}?t=${tenantId}`;
      const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, allowed_updates: ["message", "callback_query"] }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.description);
      toast.success("Webhook registered");
    } catch (e: any) { toast.error(e.message); } finally { setRegistering(false); }
  }

  if (!t) return null;
  const previewLink = form.bot_username && sanitizeShortName(form.mini_app_short_name)
    ? `https://t.me/${form.bot_username}/${sanitizeShortName(form.mini_app_short_name)}?startapp=ref_XXXX`
    : "Set bot username + short name to preview";

  return (
    <div className="max-w-xl pb-12">
      <h1 className="text-2xl font-bold mb-6">Manage Bot</h1>
      <div className="mb-6">
        <MiniAppLinks slug={(t as any).slug} botUsername={form.bot_username} shortName={sanitizeShortName(form.mini_app_short_name)} />
      </div>
      <div className="space-y-4">
        <Field label="Token name"><Input value={form.token_name ?? ""} onChange={(e) => setForm({ ...form, token_name: e.target.value })} /></Field>
        <Field label="Token symbol"><Input value={form.token_symbol ?? ""} onChange={(e) => setForm({ ...form, token_symbol: e.target.value })} /></Field>
        <Field label="Action verb (Mine / Fish / Wood)"><Input value={form.action_verb ?? ""} onChange={(e) => setForm({ ...form, action_verb: e.target.value })} /></Field>
        <Field label="Token icon URL"><Input value={form.token_icon_url ?? ""} onChange={(e) => setForm({ ...form, token_icon_url: e.target.value })} placeholder="https://…" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Primary"><Input type="color" value={form.primary ?? "#f59e0b"} onChange={(e) => setForm({ ...form, primary: e.target.value })} /></Field>
          <Field label="Background"><Input type="color" value={form.background ?? "#0a0a0a"} onChange={(e) => setForm({ ...form, background: e.target.value })} /></Field>
          <Field label="Accent"><Input type="color" value={form.accent ?? "#fbbf24"} onChange={(e) => setForm({ ...form, accent: e.target.value })} /></Field>
        </div>

        <div className="pt-6 mt-6 border-t space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Economics</h2>
            <p className="text-sm text-muted-foreground">Set per-mine reward, cycle duration, and USDT conversion.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Tokens per mine (${form.token_symbol || "TKN"})`}>
              <Input type="number" min={0} value={form.tokens_per_mine ?? 0} onChange={(e) => setForm({ ...form, tokens_per_mine: e.target.value })} />
            </Field>
            <Field label="Mine duration (seconds)">
              <Input type="number" min={1} value={form.mine_duration_seconds ?? 3600} onChange={(e) => setForm({ ...form, mine_duration_seconds: e.target.value })} />
            </Field>
            <Field label={`Tokens per 1 USDT`}>
              <Input type="number" min={0} value={form.token_per_usdt ?? 10000} onChange={(e) => setForm({ ...form, token_per_usdt: e.target.value })} />
            </Field>
            <Field label="Min withdraw (USDT)">
              <Input type="number" min={0} step="0.01" value={form.min_withdraw_usdt ?? 0.1} onChange={(e) => setForm({ ...form, min_withdraw_usdt: e.target.value })} />
            </Field>
          </div>
        </div>

        <div className="pt-6 mt-6 border-t space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Telegram Bot</h2>
            <p className="text-sm text-muted-foreground">Token is stored server-side only. Leave blank to keep the existing token.</p>
          </div>
          <Field label="Bot username (without @)"><Input value={form.bot_username ?? ""} onChange={(e) => setForm({ ...form, bot_username: e.target.value.replace(/^@/, "") })} placeholder="my_cool_bot" /></Field>
          <Field label="Mini App short name (letters, digits, _ only)">
            <Input value={form.mini_app_short_name ?? ""} onChange={(e) => setForm({ ...form, mini_app_short_name: sanitizeShortName(e.target.value) })} placeholder="app" />
            <p className="text-xs text-muted-foreground pt-1">Invite link preview: <span className="font-mono break-all">{previewLink}</span></p>
          </Field>
          <Field label="Bot token"><Input type="password" value={form.bot_token ?? ""} onChange={(e) => setForm({ ...form, bot_token: e.target.value })} placeholder={(t as any).bot_username ? "•••••• (saved — paste to replace or to re-register webhook)" : "123456:ABC-DEF..."} autoComplete="off" /></Field>
          <Button type="button" variant="outline" size="sm" onClick={reRegisterWebhook} disabled={registering}>
            {registering ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" />Registering…</> : "Re-register Telegram webhook"}
          </Button>
        </div>

        <div className="pt-6 mt-6 border-t space-y-4">
          <h2 className="text-lg font-semibold">Welcome message (/start)</h2>
          <Field label="Welcome image">
            <Input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
            {form.welcome_image_url && <img src={form.welcome_image_url} alt="welcome" className="mt-2 h-24 rounded border" />}
          </Field>
          <Field label="Welcome text"><Textarea rows={3} value={form.welcome_text ?? ""} onChange={(e) => setForm({ ...form, welcome_text: e.target.value })} placeholder="Welcome to My Bot! Mine tokens 24/7…" /></Field>
          <Field label="CTA button text"><Input value={form.welcome_cta_text ?? ""} onChange={(e) => setForm({ ...form, welcome_cta_text: e.target.value })} placeholder="Open My Bot" /></Field>
        </div>

        <div className="pt-6 mt-6 border-t space-y-4">
          <h2 className="text-lg font-semibold">In-app admins</h2>
          <p className="text-sm text-muted-foreground">Telegram user IDs (comma-separated) that see the admin panel inside the mini app.</p>
          <Field label="Admin Telegram IDs">
            <Input value={form.admin_telegram_ids ?? ""} onChange={(e) => setForm({ ...form, admin_telegram_ids: e.target.value })} placeholder="123456789, 987654321" />
          </Field>
        </div>

        <Button onClick={() => m.mutate()} disabled={m.isPending}>Save changes</Button>

        <div className="pt-6 mt-6 border-t">
          <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
          <p className="text-sm text-muted-foreground mb-3">Deleting permanently removes this bot, its users, balances, tasks, and history.</p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Delete bot</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{t.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This cannot be undone. The Telegram webhook will be removed and all data for this bot will be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    try {
                      await del({ data: { id: tenantId } });
                      toast.success("Bot deleted");
                      qc.invalidateQueries({ queryKey: ["my-tenants"] });
                      nav({ to: "/admin" });
                    } catch (e: any) { toast.error(e.message); }
                  }}
                >Yes, delete forever</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}
