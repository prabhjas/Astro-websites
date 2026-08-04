import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = process.env.LOCAL_ORIGIN || "http://127.0.0.1:5092";
const env = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
const secret = (env.match(/^INTERNAL_JOB_SECRET=(.*)$/m) || [])[1]?.trim();
if (!secret) {
  console.error("missing INTERNAL_JOB_SECRET");
  process.exit(1);
}

async function check(label, pathName, expectStatus, withAuth) {
  const headers = withAuth ? { Authorization: `Bearer ${secret}` } : {};
  const res = await fetch(`${BASE}${pathName}`, { headers });
  const ok = res.status === expectStatus;
  const body = (await res.text()).slice(0, 120).replace(/\s+/g, " ");
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  HTTP ${res.status}  ${body}`);
  return ok;
}

const results = [];
results.push(await check("posts-deny", "/api/internal/posts/", 403, false));
results.push(await check("posts-auth", "/api/internal/posts/", 200, true));
results.push(await check("redirects", "/api/internal/redirects/", 200, true));
results.push(await check("gtm", "/api/internal/gtm/", 200, true));
results.push(await check("leads", "/api/internal/leads?limit=1", 200, true));
if (results.some((r) => !r)) process.exit(1);
console.log("Bearer FLOW smoke OK");
