// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import { existsSync } from "node:fs";

export default defineConfig({
  vite: {
    plugins: [
      {
        name: "debug-resolve",
        configResolved(config) {
          console.error("[DEBUG] cwd:", process.cwd());
          console.error("[DEBUG] vite.root:", config.root);
          console.error("[DEBUG] src/router.tsx exists:", existsSync(path.resolve(config.root, "src/router.tsx")));
          console.error("[DEBUG] src/router.tsx exists (cwd):", existsSync(path.resolve(process.cwd(), "src/router.tsx")));
          console.error("[DEBUG] src/start.ts exists:", existsSync(path.resolve(config.root, "src/start.ts")));
          console.error("[DEBUG] src/server.ts exists:", existsSync(path.resolve(config.root, "src/server.ts")));
        },
      },
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
