import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Regenerate public/_redirects from YAML. Never throw — callers must still succeed. */
export async function regenerateRedirectArtifacts(): Promise<{ ok: boolean; detail?: string }> {
  try {
    await execFileAsync("node", ["scripts/generate-redirects.mjs"], {
      cwd: process.cwd(),
      timeout: 30_000,
    });
    return { ok: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[redirects] generate-redirects.mjs failed (non-fatal):", detail);
    return { ok: false, detail };
  }
}
