/**
 * Trade licence facts (DET Dubai) — single source of truth for the footer
 * licence strip and the llms.txt licence section.
 *
 * Values come from src/data/licence.json. The strip stays hidden until the
 * licence names a real company and number (see isLicenceComplete).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import licence from "../data/licence.json";

export type Licence = typeof licence;

export { licence };

/** Display DET dates as DD/MM/YYYY to match the licence document. */
export function formatLicenceDate(value: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!iso) return value;
  return `${iso[3]}/${iso[2]}/${iso[1]}`;
}

/**
 * Field order for the 2-column strip — matches the Connect Freelance footer
 * mockup (status/name/authority/date on the left, number/type/legal on the right).
 */
export const licenceRows: Array<{ label: string; value: string }> = [
  { label: "License Status", value: licence.status },
  { label: "License Number", value: licence.number },
  { label: "Business Name", value: licence.businessName },
  { label: "License Type", value: licence.type },
  { label: "Issuing Authority", value: licence.issuingAuthority },
  { label: "Legal Type", value: licence.legalType },
  { label: "Issue Date", value: licence.issueDate ? formatLicenceDate(licence.issueDate) : "" },
].filter((row) => Boolean(row.value));

export function isLicenceComplete(): boolean {
  return Boolean(licence.businessName && licence.number);
}

let pdfPresent: boolean | null = null;
export function hasLicencePdf(): boolean {
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

export function licenceSchemaFragment(pdfAbsoluteUrl?: string) {
  if (!isLicenceComplete()) return {};
  return {
    legalName: licence.businessName,
    identifier: {
      "@type": "PropertyValue",
      name: "DET Trade Licence Number",
      value: licence.number,
      ...(licence.unifiedNumber ? { description: `Dubai Unified Licence ${licence.unifiedNumber}` } : {}),
    },
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      name: `${licence.type || "Trade"} Trade Licence ${licence.number}`,
      ...(licence.type ? { credentialCategory: licence.type } : {}),
      identifier: licence.number,
      ...(licence.issueDate ? { dateCreated: licence.issueDate } : {}),
      url: licence.verifyUrl,
      recognizedBy: {
        "@type": "GovernmentOrganization",
        name: licence.issuingAuthority,
        url: "https://www.dubaided.gov.ae/",
      },
      ...(pdfAbsoluteUrl && hasLicencePdf()
        ? { subjectOf: { "@type": "DigitalDocument", url: pdfAbsoluteUrl } }
        : {}),
    },
    ...(licence.activities.length ? { knowsAbout: licence.activities } : {}),
  };
}

export const LICENCE_HEADING = "## Licence & Verification";

export function licenceLlmsSection(siteOrigin: string): string {
  if (!isLicenceComplete()) return "";
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
  if (licence.activities.length) {
    lines.push("", "Licensed activities:", "", ...licence.activities.map((a) => `- ${a} (Active)`), "");
  }
  return lines.join("\n");
}
