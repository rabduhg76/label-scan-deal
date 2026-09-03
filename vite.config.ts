// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";
import { readdirSync, statSync, existsSync } from "node:fs";

const debugEntries = () => {
  try {
    const cwd = process.cwd();
    const srcDir = path.resolve(cwd, "src");
    process.stdout.write(`[DEBUG] cwd: ${cwd}\n`);
    process.stdout.write(`[DEBUG] src dir: ${srcDir} exists: ${statSync(srcDir).isDirectory()}\n`);
    const list = readdirSync(srcDir);
    process.stdout.write(`[DEBUG] src contents: ${list.join(",")}\n`);
    const candidates = ["router.tsx", "router.ts", "start.ts", "server.ts", "client.tsx"];
    for (const c of candidates) {
      const p = path.resolve(srcDir, c);
      process.stdout.write(`[DEBUG] ${c} exists: ${statSync(p).isFile()}\n`);
    }
  } catch (e: any) {
    process.stdout.write(`[DEBUG] failed: ${e?.message}\n`);
  }
};

const ENV_HARD_FAIL =
  "FATAL: .env file present in working tree. Move secrets to Cloudflare Pages env vars.";

const guardEnv = {
  name: "guard-env-file",
  buildStart() {
    if (existsSync(path.resolve(process.cwd(), ".env"))) {
      process.stdout.write(`[guard-env-file] ${ENV_HARD_FAIL}\n`);
      throw new Error(ENV_HARD_FAIL);
    }
  },
};

export default defineConfig({
  plugins: [
    guardEnv,
    {
      name: "debug-pre-config",
      config(_userConfig, _env) {
        debugEntries();
        return {};
      },
    },
    {
      name: "debug-resolved",
      configResolved(config) {
        process.stdout.write(`[DEBUG] vite.root: ${config.root}\n`);
      },
    },
  ],
  tanstackStart: {
    router: { entry: "router.tanstack.tsx" },
    server: { entry: "server.ts" },
    start: { entry: "start.ts" },
  },
});
