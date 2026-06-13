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
import { Loader2, Trash2, Check } from "lucide-react";
import { THEME_PRESETS } from "@/lib/theme-presets";

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
  useEffect(() => { if (t) setForm({
    token_name: t.token_name, token_symbol: t.token_symbol, action_verb: t.action_verb,
    token_icon_url: t.token_icon_url ?? "",
    bot_username: (t as any).bot_username ?? "",
    mini_app_short_name: (t as any).mini_app_short_name ?? "",
    welcome_text: (t as any).welcome_text ?? "",
    welcome_cta_text: (t as any).welcome_cta_text ?? "",
    welcome_image_url: (t as any).welcome_image_url ?? "",
    bot_token: "",
    theme_preset: (t as any).theme_preset ?? "",
    primary: (t.theme as any).primary, background: (t.theme as any).background, accent: (t.theme as any).accent,
  }); }, [t]);

  function applyPreset(presetId: string) {
    const p = THEME_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    setForm((f: any) => ({
      ...f,
      theme_preset: p.id,
      token_name: p.token_name,
      token_symbol: p.token_symbol,
      action_verb: p.action_verb,
      welcome_text: p.welcome_text,
      welcome_cta_text: p.welcome_cta_text,
      primary: p.theme.primary,
      background: p.theme.background,
      accent: p.theme.accent,
    }));
    toast.success(`${p.label} applied — click Save to publish`);
  }

  const m = useMutation({
    mutationFn: () => {
      const patch: any = {
        token_name: form.token_name, token_symbol: form.token_symbol, action_verb: form.action_verb,
        token_icon_url: form.token_icon_url || null,
        bot_username: form.bot_username || null,
        mini_app_short_name: form.mini_app_short_name || null,
        welcome_text: form.welcome_text || null,
        welcome_cta_text: form.welcome_cta_text || null,
        welcome_image_url: form.welcome_image_url || null,
        theme: { primary: form.primary, background: form.background, accent: form.accent },
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
        body: JSON.stringify({ url, allowed_updates: ["message"] }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.description);
      toast.success("Webhook registered");
    } catch (e: any) { toast.error(e.message); } finally { setRegistering(false); }
  }

  if (!t) return null;
  return (
    <div className="max-w-xl pb-12">
      <h1 className="text-2xl font-bold mb-6">Manage Bot</h1>
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
            <h2 className="text-lg font-semibold">Telegram Bot</h2>
            <p className="text-sm text-muted-foreground">Token is stored server-side only. Leave blank to keep the existing token.</p>
          </div>
          <Field label="Bot username (without @)"><Input value={form.bot_username ?? ""} onChange={(e) => setForm({ ...form, bot_username: e.target.value.replace(/^@/, "") })} placeholder="my_cool_bot" /></Field>
          <Field label="Mini App short name"><Input value={form.mini_app_short_name ?? ""} onChange={(e) => setForm({ ...form, mini_app_short_name: e.target.value })} placeholder="app" /></Field>
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
