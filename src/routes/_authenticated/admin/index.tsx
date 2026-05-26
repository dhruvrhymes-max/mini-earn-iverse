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
import { Plus, LogOut, Shield, ExternalLink } from "lucide-react";

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
  const m = useMutation({
    mutationFn: (vars: { slug: string; name: string; bot_token?: string; bot_username?: string }) => create({ data: vars }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["myTenants"] }); toast.success("Bot created"); setOpen(false); setSlug(""); setName(""); setBotToken(""); setBotUsername(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");

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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New bot</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a bot</DialogTitle>
                <p className="text-sm text-muted-foreground">Paste your Telegram bot token from @BotFather. It's stored securely and used to verify Telegram users.</p>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); m.mutate({ slug, name, bot_token: botToken || undefined, bot_username: botUsername || undefined }); }} className="space-y-3">
                <div><Label>Bot name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Mining Bot" required /></div>
                <div>
                  <Label>Slug (used in URL)</Label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} pattern="[a-z0-9-]+" placeholder="my-mining-bot" required />
                  <p className="text-xs text-muted-foreground mt-1">Mini app URL: /app/{slug || "your-slug"}</p>
                </div>
                <div>
                  <Label>Bot username</Label>
                  <Input value={botUsername} onChange={(e) => setBotUsername(e.target.value.replace(/^@/, ""))} placeholder="MyMiningBot (without @)" />
                </div>
                <div>
                  <Label>Bot token</Label>
                  <Input type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="123456789:ABCdef..." autoComplete="off" />
                  <p className="text-xs text-muted-foreground mt-1">Optional now — you can add it later in Branding.</p>
                </div>
                <Button type="submit" disabled={m.isPending} className="w-full">{m.isPending ? "Creating…" : "Create bot"}</Button>
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
                <p className="text-sm text-muted-foreground mt-1">/{t.slug}</p>
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
