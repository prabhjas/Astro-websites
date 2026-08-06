/**
 * Trade licence facts (DET Dubai Unified Licence) — single source of truth for
 * the footer licence strip, the JSON-LD block and the llms.txt licence section.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import licence from "../data/licence.json";

export type Licence = typeof licence;

export { licence };

/** Field order used by the footer strip, the PDF and llms.txt alike. */
export const licenceRows: Array<{ label: string; value: string }> = [
  { label: "License Status", value: licence.status },
  { label: "License Number", value: licence.number },
  { label: "Business Name", value: licence.businessName },
  { label: "License Type", value: licence.type },
  { label: "Issuing Authority", value: licence.issuingAuthority },
  { label: "Legal Type", value: licence.legalType },
  { label: "Issue Date", value: licence.issueDate },
];

/**
 * The scanned licence PDF is optional: the strip only offers "click here to
 * view" once the file is actually present in public/, so a missing upload can
 * never ship a dead link. Cached per process — public/ never changes at runtime.
 */
let pdfPresent: boolean | null = null;
export function hasLicencePdf(): boolean {
  // No pdfPath configured means the scanned licence is deliberately not
  // published (it expires yearly and would silently go stale). Guard first:
  // path.join(cwd, "public", "") resolves to public/ itself, which exists, and
  // would otherwise render a "view the license" button pointing at nothing.
  if (!licence.pdfPath) return false;
  if (pdfPresent === null) {
    try {
      pdfPresent = existsSync(
        path.join(process.cwd(), "public", licence.pdfPath.replace(/^\//, "")),
      );
    } catch {
      pdfPresent = false;
    }
  }
  return pdfPresent;
}

/** Heading of the llms.txt licence block — also the "already present" marker. */
export const LICENCE_HEADING = "## Licence & Verification";

/** Markdown licence block appended to /llms.txt and /llm.txt. */
export function licenceLlmsSection(siteOrigin: string): string {
  const origin = siteOrigin.replace(/\/$/, "");
  const lines = [
    LICENCE_HEADING,
    "",
    `${licence.businessName} is licensed in Dubai, UAE by the ${licence.issuingAuthority}.`,
    "",
    ...licenceRows.map((row) => `- ${row.label}: ${row.value}`),
    `- Verify this licence: ${licence.verifyUrl}`,
  ];
  if (hasLicencePdf()) {
    lines.push(`- Licence document (PDF): ${origin}${licence.pdfPath}`);
  }
  lines.push(
    "",
    "Licensed activities:",
    "",
    ...licence.activities.map((activity) => `- ${activity} (Active)`),
    "",
  );
  return lines.join("\n");
}
