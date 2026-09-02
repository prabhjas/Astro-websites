/** Lead-safe trailing-slash entry patch after astro build (publisher-safe). */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export default function leadSafeSlashIntegration() {
  return {
    name: "lead-safe-slash",
    hooks: {
      "astro:build:done": async () => {
        const script = join(dirname(fileURLToPath(import.meta.url)), "patch-entry-lead-safe-slash.mjs");
        const result = spawnSync(process.execPath, [script], { stdio: "inherit", cwd: process.cwd() });
        if (result.status !== 0) {
          throw new Error(`lead-safe-slash patch failed with status ${result.status}`);
        }
      },
    },
  };
}
