import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyTenants, createTenant } from "@/lib/admin.functions";
import { THEME_PRESETS, type ThemePreset } from "@/lib/theme-presets";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, LogOut, Shield, ExternalLink, Loader2, Check } from "lucide-react";

const WEBHOOK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/telegram-webhook`;

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "My Bots — Admin" }] }),
  component: AdminIndex,
});

function AdminIndex() {
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const list = useServerFn(listMyTenants);
  const create = useServerFn(createTenant);
  const qc = useQueryClient();
  const { data: tenants = [], isLoading } = useQuery({ queryKey: ["myTenants"], queryFn: () => list() });

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [preset, setPreset] = useState<ThemePreset>(THEME_PRESETS[0]);
  const [botToken, setBotToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setStep(1); setBotToken(""); setPreset(THEME_PRESETS[0]); setSubmitting(false);
  }

  async function registerWebhook(token: string, tenantId: string) {
    const url = `${WEBHOOK_URL}?t=${tenantId}`;
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, allowed_updates: ["message"] }),
    });
    const j = await res.json().catch(() => ({}));
    if (!j.ok) throw new Error(j.description || "Telegram setWebhook failed");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = botToken.trim();
    if (!token) return;
    setSubmitting(true);
    try {
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meJson = await meRes.json();
      if (!meJson.ok) throw new Error(meJson.description || "Invalid bot token");
      const me = meJson.result as { id: number; username: string; first_name: string };

      const tenant = await create({ data: {
        name: me.first_name || me.username,
        bot_token: token,
        bot_username: me.username,
        preset_id: preset.id,
        preset: {
          theme: preset.theme,
          token_name: preset.token_name,
          token_symbol: preset.token_symbol,
          token_icon_url: preset.token_icon_url,
          action_verb: preset.action_verb,
          welcome_text: preset.welcome_text,
          welcome_cta_text: preset.welcome_cta_text,
          game_mode: preset.game_mode,
        },
      }});
      try {
        await registerWebhook(token, tenant.id);
        toast.success("Bot created & webhook registered. Send /start to your bot to test.");
      } catch (we: any) {
        toast.warning(`Bot created, but webhook registration failed: ${we.message}.`);
      }
      qc.invalidateQueries({ queryKey: ["myTenants"] });
      reset();
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create bot");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="font-bold">MineCraft SaaS</div>
          <div className="flex items-center gap-2">
            {roles.includes("super_admin") && (
              <Button asChild variant="outline" size="sm"><Link to="/super"><Shield className="mr-1 h-4 w-4" />Super Admin</Link></Button>
            )}
            <span className="hidden sm:inline text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Bots</h1>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/admin/new-ai"><Shield className="mr-1 h-4 w-4" />AI Creator</Link></Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New bot</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{step === 1 ? "Choose a theme & token" : "Connect your Telegram bot"}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {step === 1
                    ? "Pick a preset — colors, token name, and welcome message. You can fine-tune everything later in Manage Bot."
                    : `Preset: ${preset.emoji} ${preset.label}. Paste your bot token from @BotFather.`}
                </p>
              </DialogHeader>
              {step === 1 ? (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {THEME_PRESETS.map((p) => {
                      const selected = preset.id === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPreset(p)}
                          className={`relative text-left rounded-lg border-2 p-4 transition-all ${selected ? "border-primary" : "border-border hover:border-muted-foreground/40"}`}
                          style={{ background: p.theme.background, color: "white" }}
                        >
                          {selected && <Check className="absolute top-2 right-2 h-5 w-5" style={{ color: p.theme.primary }} />}
                          <div className="text-2xl">{p.emoji}</div>
                          <div className="font-semibold mt-1">{p.label}</div>
                          <div className="text-xs opacity-70 mt-0.5">{p.description}</div>
                          <div className="flex gap-1 mt-3">
                            <span className="w-5 h-5 rounded-full border border-white/20" style={{ background: p.theme.primary }} />
                            <span className="w-5 h-5 rounded-full border border-white/20" style={{ background: p.theme.accent }} />
                            <span className="text-xs opacity-70 ml-2 self-center">{p.token_symbol} · {p.action_verb}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <Button className="w-full" onClick={() => setStep(2)}>Next</Button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <Label>Bot token</Label>
                    <Input
                      type="password"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder="123456789:ABCdef..."
                      autoComplete="off"
                      required
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-1">From @BotFather → /newbot or /mybots → API token</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={submitting}>Back</Button>
                    <Button type="submit" disabled={submitting || !botToken.trim()} className="flex-1">
                      {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : "Create bot"}
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
          </div>
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading…</p> : tenants.length === 0 ? (
          <div className="border rounded-lg p-12 text-center text-muted-foreground">
            <p>No bots yet. Create your first one.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((t) => (
              <div key={t.id} className="border rounded-lg p-5 hover:border-primary transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{t.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${t.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{t.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">@{(t as any).bot_username || t.slug}</p>
                <div className="mt-3 text-sm flex flex-wrap items-center gap-3 text-primary">
                  <Link to="/admin/$tenantId" params={{ tenantId: t.id }} className="font-medium">
                    Manage bot
                  </Link>
                  <a href={`/app/${t.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Open mini app
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
