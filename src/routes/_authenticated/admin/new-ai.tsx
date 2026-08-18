import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { generateBotConfig } from "@/lib/ai-bot-creator.functions";
import { applyAiBotConfig } from "@/lib/ai-bot-creator-apply.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/new-ai")({
  head: () => ({ meta: [
    { title: "AI Bot Creator | ZeroLabNetwork" },
    { name: "description", content: "ZeroLabNetwork is an amazing project working in webapps / saas / tma etc..." },
    { property: "og:title", content: "AI Bot Creator | ZeroLabNetwork" },
    { property: "og:description", content: "ZeroLabNetwork is an amazing project working in webapps / saas / tma etc..." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AiCreator,
});

function AiCreator() {
  const nav = useNavigate();
  const gen = useServerFn(generateBotConfig);
  const apply = useServerFn(applyAiBotConfig);
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState<"gemini" | "lovable">("lovable");
  const [config, setConfig] = useState<any>(null);
  const [botToken, setBotToken] = useState("");
  const [botUsername, setBotUsername] = useState("");

  const genM = useMutation({
    mutationFn: () => gen({ data: { description, provider } }),
    onSuccess: (c) => { setConfig(c); toast.success("Config generated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const applyM = useMutation({
    mutationFn: () => apply({ data: { bot_token: botToken, bot_username: botUsername, config } }),
    onSuccess: async (tenant: any) => {
      try {
        const webhook = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/telegram-webhook?t=${tenant.id}`;
        await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: webhook, allowed_updates: ["message", "callback_query"] }),
        });
      } catch { /* non-fatal */ }
      toast.success("Bot created!");
      nav({ to: "/admin/$tenantId", params: { tenantId: tenant.id } });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> All bots</Link>
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Sparkles className="h-7 w-7 text-primary" /> AI Bot Creator</h1>
        <p className="text-muted-foreground text-sm mt-1">Describe your bot in plain English. AI picks colors, theme, tasks, and miners.</p>
      </div>

      {!config && (
        <div className="space-y-4 border rounded-xl p-5 bg-card">
          <div>
            <Label>Provider</Label>
            <select className="w-full border rounded-md h-10 px-2 bg-background mt-1" value={provider} onChange={(e) => setProvider(e.target.value as any)}>
              <option value="lovable">Lovable AI (recommended)</option>
              <option value="gemini">Gemini (your key)</option>
            </select>
          </div>
          <div>
            <Label>Describe your bot</Label>
            <Textarea rows={4} placeholder="e.g. orange fruit theme, juicy tap-to-earn, tokens called Juice…"
              value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button className="w-full" size="lg" onClick={() => genM.mutate()} disabled={genM.isPending || description.length < 3}>
            {genM.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : "Generate design"}
          </Button>
        </div>
      )}

      {config && (
        <div className="space-y-6">
          <div className="rounded-xl overflow-hidden border" style={{ background: config.theme.background }}>
            <div className="p-6 text-white">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-full flex items-center justify-center text-3xl" style={{ background: config.theme.primary }}>{config.mascot_emoji}</div>
                <div>
                  <div className="text-xl font-bold" style={{ color: config.theme.primary }}>{config.name}</div>
                  <div className="text-xs opacity-70">{config.token_symbol} · {config.action_verb} · scene: {config.scene}</div>
                </div>
              </div>
              <p className="mt-4 text-sm whitespace-pre-line opacity-90">{config.welcome_text}</p>
              <div className="mt-4 space-y-3 border-t border-white/15 pt-4">
                <div><div className="text-[10px] uppercase opacity-60">Concept</div><p className="text-sm">{config.concept}</p></div>
                <div><div className="text-[10px] uppercase opacity-60">Gameplay idea</div><p className="text-sm">{config.gameplay_idea}</p></div>
                <div><div className="text-[10px] uppercase opacity-60">Visual direction</div><p className="text-sm">{config.visual_direction}</p></div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[config.theme.primary, config.theme.background, config.theme.accent].map((c) => (
                  <div key={c} className="rounded p-2 text-xs font-mono" style={{ background: c, color: "#000" }}>{c}</div>
                ))}
              </div>
              <div className="mt-4 text-xs opacity-70">{config.token_name} ({config.token_symbol}) · {config.theme.layout_family} layout · Tasks: {config.tasks.length} · Miners: {config.miners.length}</div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Bot username</Label><Input placeholder="@my_bot" value={botUsername} onChange={(e) => setBotUsername(e.target.value)} /></div>
              <div><Label>Bot token</Label><Input placeholder="12345:AAA…" value={botToken} onChange={(e) => setBotToken(e.target.value)} /></div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfig(null)}>Try again</Button>
              <Button className="flex-1" onClick={() => applyM.mutate()} disabled={applyM.isPending || !botToken || !botUsername}>
                {applyM.isPending ? "Creating…" : "Create bot"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
