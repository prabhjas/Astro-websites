/**
 * The icon vocabulary service-page content may reference by name.
 *
 * Kept in its own module, free of asset imports, so `content.config.ts` can
 * build a `z.enum` from it without pulling SVG modules into the content-loader
 * graph. `service-icons.ts` holds the actual glyphs and is checked against this
 * list at type level, so a name here without a glyph is a type error.
 *
 * Glyphs are named for what they depict, not for the label they happen to sit
 * under, so any page can reach for one without inheriting another page's copy.
 * `verified` is the deliberate exception — Italy uses it as a mark meaning
 * "covered" rather than as a picture of anything.
 *
 * Note that the same drawing at a second size is a second file: `Icon` renders
 * a glyph at its intrinsic size, so a 48px export cannot serve a 32px card.
 * That is why `visa`/`passport-globe` and `team-people`/`people-group` pair up.
 */
export const SERVICE_ICON_NAMES = [
  // Hero trust badges
  "scale",
  "institute",
  "money",
  "law",
  "protect",
  "global",
  "employee",
  "licence",
  "talk",
  "search",
  "visa",
  // "What's included" cards — EOR Spain and the hub
  "employment-contracts",
  "payroll",
  "social-security",
  "work-permits",
  "cba-compliance",
  "expenses",
  "severance",
  "hr-admin",
  // Portugal
  "contract-briefcase",
  "pay-envelope",
  "meal-allowance",
  "permit-passport",
  "accident-insurance",
  "probation-support",
  // Poland's 48px "who we work with" columns
  "laptop",
  "world-globe",
  "team-people",
  // Germany — the two obligations with no Iberian counterpart
  "sick-pay",
  "works-council",
  // Italy, which draws one mark across all six cards
  "verified",
  // Payroll Outsourcing
  "shield-tick",
  "calculator",
  "document-shield",
  "hand-star",
  "beach-parasol",
  "person-archive",
  "envelope-document",
  "document-cross",
  "money-hand",
  // Temporary Staffing
  "candidate-selection",
  "contract-signed",
  "envelope-seal",
  "risk-shield",
  "gavel",
  "person-case",
  "door-exit",
  // Recruitment
  "person-scan",
  "document-stamp",
  "document-lines",
  "search-person",
  "headset",
  "swap-arrows",
  "globe-pin",
  "passport-globe",
  // Staff Outsourcing
  "money-roll",
  "people-group",
] as const;

export type ServiceIconName = (typeof SERVICE_ICON_NAMES)[number];
