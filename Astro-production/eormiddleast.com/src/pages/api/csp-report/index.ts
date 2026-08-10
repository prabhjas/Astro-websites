import type { APIRoute } from "astro";
import { logWarn } from "@/services/logger";
import { getClientIp } from "@/utils/form/rate-limit";
import { readRequestBodyLimited } from "@/utils/form/read-body-limited";

export const prerender = false;

const MAX_BODY_BYTES = 16_384;
const RATE_WINDOW_MS = 60_000;
const MAX_REPORTS_PER_WINDOW = 60;
const reportHits = new Map<string, number[]>();

function isReportRateLimited(request: Request): boolean {
  const key = getClientIp(request);
  const now = Date.now();
  const recent = (reportHits.get(key) || []).filter(
    (timestamp) => now - timestamp < RATE_WINDOW_MS,
  );
  if (recent.length >= MAX_REPORTS_PER_WINDOW) {
    reportHits.set(key, recent);
    return true;
  }
  recent.push(now);
  reportHits.set(key, recent);
  return false;
}

function cleanText(value: unknown, maxLength = 500): string {
  if (value == null) return "";
  return String(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanUrl(value: unknown): string {
  const text = cleanText(value, 2_000);
  if (!text) return "";
  if (/^(?:inline|eval|data|blob):?$/i.test(text)) return text.toLowerCase();
  try {
    const url = new URL(text);
    return `${url.origin}${url.pathname}`.slice(0, 1_000);
  } catch {
    return text.slice(0, 1_000);
  }
}

function reportBody(value: unknown): Record<string, unknown> {
  const root = Array.isArray(value) ? value[0] : value;
  if (!root || typeof root !== "object") return {};
  const record = root as Record<string, unknown>;
  const nested = record["csp-report"] || record.body;
  return nested && typeof nested === "object" ? (nested as Record<string, unknown>) : record;
}

export const POST: APIRoute = async ({ request }) => {
  if (isReportRateLimited(request)) {
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }

  const limited = await readRequestBodyLimited(request, MAX_BODY_BYTES);
  if (!limited.ok) {
    return new Response(null, { status: 413, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const parsed = JSON.parse(new TextDecoder().decode(limited.bytes)) as unknown;
    const report = reportBody(parsed);
    logWarn("csp_report", {
      document: cleanUrl(report["document-uri"] ?? report.documentURL ?? report.url),
      blocked: cleanUrl(report["blocked-uri"] ?? report.blockedURL),
      directive: cleanText(report["effective-directive"] ?? report.effectiveDirective, 120),
      violatedDirective: cleanText(report["violated-directive"] ?? report.violatedDirective, 200),
      source: cleanUrl(report["source-file"] ?? report.sourceFile),
      line: Number(report["line-number"] ?? report.lineNumber) || undefined,
      column: Number(report["column-number"] ?? report.columnNumber) || undefined,
      status: Number(report["status-code"] ?? report.statusCode) || undefined,
      disposition: cleanText(report.disposition, 40),
    });
  } catch {
    // Invalid browser reports are ignored to avoid retries and log injection.
  }

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
};
