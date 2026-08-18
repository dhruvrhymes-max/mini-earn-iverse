import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — ZeroLabNetwork" },
      { name: "description", content: "Sign in to the ZeroLabNetwork console. Access is for ZeroLabNetwork project members only." },
      { property: "og:title", content: "Sign in — ZeroLabNetwork" },
      { property: "og:description", content: "Sign in to the ZeroLabNetwork console. Access is for ZeroLabNetwork project members only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    navigate({ to: "/admin" });
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Enter your email first");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Reset link sent — check your inbox");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <form
        onSubmit={mode === "signin" ? onSubmit : onReset}
        className="w-full max-w-sm space-y-4 rounded-lg border p-6"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{mode === "signin" ? "Sign in" : "Reset password"}</h1>
          <p className="text-xs font-medium text-muted-foreground">
            For ZeroLabNetwork project members only.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        {mode === "signin" && (
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        )}

        {mode === "forgot" && sent && (
          <p className="text-sm text-muted-foreground">
            If an account exists for that email, a reset link is on its way. Open it on this device to set a new password.
          </p>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? mode === "signin" ? "Signing in…" : "Sending…"
            : mode === "signin" ? "Sign in" : "Send reset link"}
        </Button>

        <button
          type="button"
          onClick={() => { setMode(mode === "signin" ? "forgot" : "signin"); setSent(false); }}
          className="w-full text-sm underline text-muted-foreground"
        >
          {mode === "signin" ? "Forgot your password?" : "Back to sign in"}
        </button>

        {mode === "forgot" && (
          <p className="text-xs text-muted-foreground text-center">
            Forgot the email too? Ask a ZeroLabNetwork super admin to look up your member account.
          </p>
        )}

        <p className="text-sm text-muted-foreground text-center">
          No account? <Link to="/signup" className="underline">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
