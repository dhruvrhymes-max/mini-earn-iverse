import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/client-error")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.text();
          // Truncate to avoid log spam from massive payloads.
          const trimmed = body.length > 4000 ? body.slice(0, 4000) + "…[truncated]" : body;
          console.error("[mini-app client error]", trimmed);
        } catch (e) {
          console.error("[mini-app client error] failed to parse body", e);
        }
        return new Response(null, { status: 204 });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});
