import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Coins, Zap, Users, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MineCraft SaaS — Build your gamified Telegram Mini App" },
      { name: "description", content: "Multi-tenant platform to launch token-economy Telegram Mini Apps. Custom branding, ad monetization, withdrawals." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Coins className="text-primary" /> MineCraft SaaS
          </div>
          <nav className="flex gap-3">
            <Button asChild variant="ghost"><Link to="/login">Sign in</Link></Button>
            <Button asChild><Link to="/signup">Create a bot</Link></Button>
          </nav>
        </div>
      </header>
      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold tracking-tight">Launch your gamified Telegram Mini App</h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Multi-tenant Mine-to-Earn platform with custom tokens, ad monetization,
            referral milestones, and crypto withdrawals — all configured from one dashboard.
          </p>
          <div className="mt-8 flex gap-3 justify-center">
            <Button asChild size="lg"><Link to="/signup">Get started free</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/login">Sign in</Link></Button>
          </div>
        </section>
        <section className="container mx-auto px-4 py-16 grid md:grid-cols-3 gap-8">
          <Feature icon={<Zap />} title="Custom Economics" desc="Set your token name, conversion rate, mining speed and minimum withdrawals." />
          <Feature icon={<Users />} title="Built-in Referrals" desc="Configure milestone rewards. Users earn for inviting friends." />
          <Feature icon={<Shield />} title="Withdrawal Pipeline" desc="Approve user withdrawals with one click. Web3 hooks ready." />
        </section>
      </main>
      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8 text-sm text-muted-foreground text-center">
          © MineCraft SaaS
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-lg border p-6">
      <div className="text-primary mb-3">{icon}</div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
