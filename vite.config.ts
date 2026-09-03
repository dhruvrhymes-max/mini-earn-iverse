import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    define: {
      __LOVABLE_ENABLED__: false,
    },
    preview: {
      allowedHosts: ["mini-earn-iverse-production.up.railway.app"],
    },
  },
});
