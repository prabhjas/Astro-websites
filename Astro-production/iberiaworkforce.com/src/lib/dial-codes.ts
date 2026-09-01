/**
 * Country dial codes for the contact form's phone field.
 *
 * The five markets Iberia Work Force operates in lead the list — they are the
 * answer for most visitors, and a native <select> has no search, so ordering is
 * the only affordance available. The rest follow alphabetically.
 *
 * Flags are emoji rather than assets: no request, no licensing, and they fall
 * back to the country's two letters on platforms without the glyphs (Windows
 * being the notable one) rather than to a broken image.
 */
export interface DialCode {
  /** ISO 3166-1 alpha-2, used as the option value alongside the code. */
  iso: string;
  name: string;
  dial: string;
  flag: string;
}

const PRIMARY: DialCode[] = [
  { iso: "ES", name: "Spain", dial: "+34", flag: "🇪🇸" },
  { iso: "PT", name: "Portugal", dial: "+351", flag: "🇵🇹" },
  { iso: "DE", name: "Germany", dial: "+49", flag: "🇩🇪" },
  { iso: "PL", name: "Poland", dial: "+48", flag: "🇵🇱" },
  { iso: "IT", name: "Italy", dial: "+39", flag: "🇮🇹" },
];

const REST: DialCode[] = [
  { iso: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { iso: "AT", name: "Austria", dial: "+43", flag: "🇦🇹" },
  { iso: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪" },
  { iso: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷" },
  { iso: "BG", name: "Bulgaria", dial: "+359", flag: "🇧🇬" },
  { iso: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
  { iso: "CN", name: "China", dial: "+86", flag: "🇨🇳" },
  { iso: "HR", name: "Croatia", dial: "+385", flag: "🇭🇷" },
  { iso: "CZ", name: "Czechia", dial: "+420", flag: "🇨🇿" },
  { iso: "DK", name: "Denmark", dial: "+45", flag: "🇩🇰" },
  { iso: "EE", name: "Estonia", dial: "+372", flag: "🇪🇪" },
  { iso: "FI", name: "Finland", dial: "+358", flag: "🇫🇮" },
  { iso: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { iso: "GR", name: "Greece", dial: "+30", flag: "🇬🇷" },
  { iso: "HU", name: "Hungary", dial: "+36", flag: "🇭🇺" },
  { iso: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { iso: "IE", name: "Ireland", dial: "+353", flag: "🇮🇪" },
  { iso: "IL", name: "Israel", dial: "+972", flag: "🇮🇱" },
  { iso: "JP", name: "Japan", dial: "+81", flag: "🇯🇵" },
  { iso: "LV", name: "Latvia", dial: "+371", flag: "🇱🇻" },
  { iso: "LT", name: "Lithuania", dial: "+370", flag: "🇱🇹" },
  { iso: "LU", name: "Luxembourg", dial: "+352", flag: "🇱🇺" },
  { iso: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽" },
  { iso: "MA", name: "Morocco", dial: "+212", flag: "🇲🇦" },
  { iso: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱" },
  { iso: "NO", name: "Norway", dial: "+47", flag: "🇳🇴" },
  { iso: "RO", name: "Romania", dial: "+40", flag: "🇷🇴" },
  { iso: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { iso: "SK", name: "Slovakia", dial: "+421", flag: "🇸🇰" },
  { iso: "SI", name: "Slovenia", dial: "+386", flag: "🇸🇮" },
  { iso: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦" },
  { iso: "SE", name: "Sweden", dial: "+46", flag: "🇸🇪" },
  { iso: "CH", name: "Switzerland", dial: "+41", flag: "🇨🇭" },
  { iso: "TR", name: "Turkey", dial: "+90", flag: "🇹🇷" },
  { iso: "UA", name: "Ukraine", dial: "+380", flag: "🇺🇦" },
  { iso: "AE", name: "United Arab Emirates", dial: "+971", flag: "🇦🇪" },
  { iso: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { iso: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
];

export const DIAL_CODE_GROUPS = [
  { label: "Where we operate", options: PRIMARY },
  { label: "Other countries", options: REST },
] as const;

/** Preselected because Spain is the flagship market. */
export const DEFAULT_DIAL_ISO = "ES";
