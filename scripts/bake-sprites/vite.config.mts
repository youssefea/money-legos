import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// A tiny browser harness for the brick layer (independent of `next dev`, so it never fights over .next/).
// Serves scripts/bake-sprites/index.html from the repo root; the bake and screenshot scripts drive it.
const root = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  root,
  configFile: false,
  logLevel: "warn",
  publicDir: "public",
  resolve: { alias: { "@": root + "src" } },
  define: {
    "process.env.NEXT_PUBLIC_BASE_PATH": JSON.stringify(""),
    "process.env.NEXT_PUBLIC_DEV": JSON.stringify("1"),
  },
  server: { port: 0, strictPort: false, hmr: false },
});
