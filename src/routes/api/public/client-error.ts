import { createFileRoute } from "@tanstack/react-router";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

export const Route = createFileRoute("/api/public/client-error")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = request.body ? await request.text() : "";
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
          headers: cors,
        }),
    },
  },
});
