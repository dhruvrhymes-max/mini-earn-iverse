import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMyTenants, createTenant } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, LogOut, Shield, ExternalLink, Loader2 } from "lucide-react";

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
  const [botToken, setBotToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      // Fetch bot identity from Telegram
      const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const meJson = await meRes.json();
      if (!meJson.ok) throw new Error(meJson.description || "Invalid bot token");
      const me = meJson.result as { id: number; username: string; first_name: string };

      const tenant = await create({ data: {
        name: me.first_name || me.username,
        bot_token: token,
        bot_username: me.username,
      }});
      try {
        await registerWebhook(token, tenant.id);
        toast.success("Bot created and webhook registered. Open Manage Bot to customize.");
      } catch (we: any) {
        toast.warning(`Bot created, but webhook registration failed: ${we.message}.`);
      }
      qc.invalidateQueries({ queryKey: ["myTenants"] });
      setBotToken("");
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
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setBotToken(""); }}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New bot</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create a new bot</DialogTitle>
                <p className="text-sm text-muted-foreground">Paste your Telegram bot token from @BotFather. We'll fetch the bot info and register the webhook automatically. You can configure welcome message, theme, mini app and more from <strong>Manage Bot</strong> afterwards.</p>
              </DialogHeader>
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
                  <p className="text-xs text-muted-foreground mt-1">Get it from @BotFather → /newbot or /mybots → API token</p>
                </div>
                <Button type="submit" disabled={submitting || !botToken.trim()} className="w-full">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : "Create bot"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {isLoading ? <p className="text-muted-foreground">Loading…</p> : tenants.length === 0 ? (
          <div className="border rounded-lg p-12 text-center text-muted-foreground">
            <p>No bots yet. Create your first one.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((t) => (
              <Link key={t.id} to="/admin/$tenantId" params={{ tenantId: t.id }} className="border rounded-lg p-5 hover:border-primary transition-colors">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{t.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${t.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{t.status}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">@{(t as any).bot_username || t.slug}</p>
                <div className="mt-3 text-sm flex items-center gap-1 text-primary">
                  <ExternalLink className="h-3 w-3" />
                  <a href={`/app/${t.slug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>Open mini app</a>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
