import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({ head: () => ({ meta: [{ title: "Home — ZeroLabNetwork" }] }), component: IndexPage, });

function IndexPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (session) {
        navigate({ to: "/admin" });
      }
    }
  }, [loading, session, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold text-foreground mb-4">
          Welcome to Mini Earn-iverse
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Gamified Telegram Mini Apps with multi-tenant economy, ad monetization and withdrawals
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 transition"
          >
            Sign In
          </a>
          <a
            href="/signup"
            className="inline-flex items-center justify-center rounded-md border border-primary px-6 py-3 text-base font-medium text-primary hover:bg-primary/10 transition"
          >
            Sign Up
          </a>
        </div>
      </div>
    </div>
  );
}