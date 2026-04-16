import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

/** Express API when using `vite` alone (client/). Defaults to 3012 (index.js) or set BACKEND_URL / VITE_DEV_BACKEND (e.g. http://127.0.0.1:5000 on Replit). */
function devBackendTarget(mode: string) {
  const env = loadEnv(mode, process.cwd(), "");
  return (
    env.BACKEND_URL ||
    env.VITE_DEV_BACKEND ||
    "http://127.0.0.1:3012"
  );
}

export default defineConfig(async ({ mode }) => ({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          (await import("@replit/vite-plugin-cartographer")).cartographer(),
          (await import("@replit/vite-plugin-dev-banner")).devBanner(),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api": {
        target: devBackendTarget(mode),
        changeOrigin: true,
      },
    },
  },
}));
