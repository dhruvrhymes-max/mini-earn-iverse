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
import { Textarea } from "@/components/ui/textarea";
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
  const [name, setName] = useState("");
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [shortName, setShortName] = useState("");
  const [welcomeText, setWelcomeText] = useState("");
  const [welcomeCta, setWelcomeCta] = useState("");
  const [welcomeImageUrl, setWelcomeImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName(""); setBotToken(""); setBotUsername(""); setShortName("");
    setWelcomeText(""); setWelcomeCta(""); setWelcomeImageUrl("");
  };

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `welcome/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("tenant-assets").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
      setWelcomeImageUrl(data.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
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
    setSubmitting(true);
    try {
      const tenant = await create({ data: {
        name,
        bot_token: botToken.trim(),
        bot_username: botUsername.replace(/^@/, ""),
        mini_app_short_name: shortName || undefined,
        welcome_image_url: welcomeImageUrl || undefined,
        welcome_text: welcomeText || undefined,
        welcome_cta_text: welcomeCta || undefined,
      }});
      try {
        await registerWebhook(botToken.trim(), tenant.id);
        toast.success("Bot created and webhook registered");
      } catch (we: any) {
        toast.warning(`Bot created, but webhook registration failed: ${we.message}. You can retry from Branding.`);
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
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Bots</h1>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New bot</Button></DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create a new bot</DialogTitle>
                <p className="text-sm text-muted-foreground">Configure your Telegram bot. We'll auto-register the webhook so /start works immediately.</p>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Telegram</h3>
                  <div>
                    <Label>Bot name</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Mining Bot" required />
                  </div>
                  <div>
                    <Label>Bot username (from BotFather, without @)</Label>
                    <Input value={botUsername} onChange={(e) => setBotUsername(e.target.value.replace(/^@/, ""))} placeholder="my_mining_bot" required />
                  </div>
                  <div>
                    <Label>Bot token</Label>
                    <Input type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="123456789:ABCdef..." autoComplete="off" required />
                  </div>
                  <div>
                    <Label>Mini App short name (from BotFather)</Label>
                    <Input value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="app" />
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <h3 className="text-sm font-semibold">Welcome message (on /start)</h3>
                  <div>
                    <Label>Welcome image</Label>
                    <Input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                    {uploading && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Uploading…</p>}
                    {welcomeImageUrl && <img src={welcomeImageUrl} alt="welcome" className="mt-2 h-24 rounded border" />}
                  </div>
                  <div>
                    <Label>Welcome text</Label>
                    <Textarea value={welcomeText} onChange={(e) => setWelcomeText(e.target.value)} placeholder="Welcome to My Bot! Mine tokens 24/7…" rows={3} />
                  </div>
                  <div>
                    <Label>Call-to-action button text</Label>
                    <Input value={welcomeCta} onChange={(e) => setWelcomeCta(e.target.value)} placeholder="Open My Bot" />
                  </div>
                </div>

                <Button type="submit" disabled={submitting || uploading} className="w-full">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</> : "Create bot & register webhook"}
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
