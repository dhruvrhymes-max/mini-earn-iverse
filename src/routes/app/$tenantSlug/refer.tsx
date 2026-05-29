import { createFileRoute } from "@tanstack/react-router";
import { useMini } from "@/lib/miniapp-context";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/$tenantSlug/refer")({
  component: Refer,
});

function Refer() {
  const { tenant, user } = useMini();
  const link = typeof window !== "undefined" ? `${window.location.origin}/app/${tenant.slug}?ref=${user.telegram_id}` : "";
  return (
    <div className="p-6 pt-12">
      <h1 className="text-2xl font-bold mb-4">Invite friends</h1>
      <p className="text-white/70">Share your link and earn rewards at every milestone.</p>
      <div className="mt-6 bg-white/5 rounded-lg p-3 font-mono text-xs break-all">{link}</div>
      <Button className="mt-4 w-full" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied"); }}>
        <Copy className="h-4 w-4 mr-2" />Copy link
      </Button>
      <p className="mt-8 text-center text-white/60">You have <b className="text-white">{user.referral_count}</b> referrals</p>
    </div>
  );
}
