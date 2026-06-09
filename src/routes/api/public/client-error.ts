import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/client-error")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Content-Type": "application/json",
        };
        try {
          const body = await request.text();
          const trimmed = body.length > 4000 ? body.slice(0, 4000) + "…[truncated]" : body;
          console.error("[mini-app client error]", trimmed);
          return new Response(JSON.stringify({ ok: true }), { status: 200, headers: cors });
        } catch (e) {
          console.error("[mini-app client error] failed to parse body", e);
          return new Response(JSON.stringify({ ok: false, error: "LOG_FAILED", fallback: true }), {
            status: 200,
            headers: cors,
          });
        }
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
