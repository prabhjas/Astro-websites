import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Regenerate public/_redirects from YAML. Never throw — callers must still 303 home. */
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

export function redirectsDashboardUrl(params?: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") q.set(k, String(v));
    }
  }
  const s = q.toString();
  return `/internal/operations/redirects/${s ? `?${s}` : ""}`;
}
