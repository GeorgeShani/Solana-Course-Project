import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  // One `.env` for the whole repo, at the root. Only `VITE_*` values and `NETWORK` reach the
  // browser bundle; everything else in it (database, RPC key, Jupiter key) stays on the server.
  envDir: "..",
  envPrefix: ["VITE_", "NETWORK"],
  // In development the browser talks to /api on the Vite origin, exactly as it does behind Caddy
  // in production (/api/* -> the Hono server with the prefix stripped), so cookies and the
  // origin checks behave the same in both.
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  plugins: [
    tanstackStart(), // must come before react()
    react(),
  ],
});
