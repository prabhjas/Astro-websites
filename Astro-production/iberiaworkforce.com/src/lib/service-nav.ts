import { getCollection } from "astro:content";
import { withLocale, type Locale } from "../i18n/locale";

/**
 * The navigation shape of the service tree — the single source of truth for
 * both the desktop mega menu and the mobile drawer.
 *
 * This describes the *intended* information architecture: 5 categories and the
 * countries each will cover. Which pages actually exist is read from the
 * `services` collection at build time, so adding a content file turns its menu
 * entry into a live link with no edit here; until then it renders as pending.
 *
 * Routes are root-level (`/employer-of-record/spain`) — see CLAUDE.md.
 */

export interface ServiceNavItem {
  /** Full path, e.g. `/employer-of-record/spain`. */
  href: string;
  label: string;
  description: string;
  /** False until a content file for this route exists. */
  available: boolean;
}

export interface ServiceNavCategory {
  slug: string;
  label: string;
  /** One-liner under the "Explore …" hub link. */
  description: string;
  hub: ServiceNavItem;
  countries: ServiceNavItem[];
}

/**
 * The same tree read the other way up: a country and the services that cover
 * it. Nothing here is declared separately — it is `IA` inverted, so a country
 * added to a category appears in both menus from the one edit.
 */
export interface CountryNavEntry {
  slug: string;
  label: string;
  /** Services covering this country, in `IA` order. `label` is the service. */
  services: ServiceNavItem[];
}

/**
 * `{country}` in a `countryDescription` is replaced with the country name, so a
 * category describes its country pages once rather than five times.
 */
const IA = [
  {
    slug: "employer-of-record",
    label: "Employer of Record",
    description: "Hire across Europe without setting up a legal entity",
    countryDescription: "Employ staff in {country}, fully compliant",
    countries: ["Spain", "Portugal", "Germany", "Poland", "Italy"],
  },
  {
    slug: "payroll-outsourcing",
    label: "Payroll Outsourcing",
    description: "Spanish and European payroll run by compliance experts",
    // Deliberately generic: kept general-purpose so the line still reads if
    // this category covers more than Spain again — the Spanish-only vocabulary
    // it used to carry (nómina, TGSS, IRPF) would read as an error elsewhere.
    countryDescription: "Payroll run, filed and reported in {country}",
    countries: ["Spain"],
  },
  {
    slug: "temporary-staffing",
    label: "Temporary Staffing",
    description: "ETT-licensed temporary workforce for seasonal peaks",
    countryDescription: "ETT-licensed temporary contracts in {country}",
    countries: ["Spain"],
  },
  {
    slug: "recruitment",
    label: "Recruitment",
    description: "Talent sourcing across Spain and Europe",
    countryDescription: "Source and hire permanent talent in {country}",
    countries: ["Spain"],
  },
  {
    slug: "staff-outsourcing",
    label: "Staff Outsourcing",
    description: "Your workforce, managed under our legal umbrella",
    countryDescription: "Outsourced teams managed in {country}",
    countries: ["Spain"],
  },
] as const;

/**
 * The order countries take in the Countries menu. Spain first — it is the only
 * market covered by all five services — then alphabetical. A country absent
 * from every category's `countries` list simply never appears, so this is an
 * ordering, not a second declaration of coverage.
 */
const COUNTRY_ORDER = ["Spain", "Germany", "Italy", "Poland", "Portugal"];

const COUNTRY_ES: Record<string, string> = {
  Spain: "España",
  Germany: "Alemania",
  Italy: "Italia",
  Poland: "Polonia",
  Portugal: "Portugal",
};

const IA_ES: Record<
  string,
  { label: string; description: string; countryDescription: string; overview: string }
> = {
  "employer-of-record": {
    label: "Employer of Record",
    description: "Contrata en Europa sin constituir una entidad jurídica",
    countryDescription: "Emplea personal en {country}, con plena conformidad",
    overview: "Visión general de Employer of Record",
  },
  "payroll-outsourcing": {
    label: "Externalización de nóminas",
    description: "Nómina española y europea gestionada por expertos en compliance",
    countryDescription: "Nómina gestionada, presentada y reportada en {country}",
    overview: "Visión general de nóminas",
  },
  "temporary-staffing": {
    label: "Trabajo temporal",
    description: "Plantilla temporal con licencia ETT para picos de temporada",
    countryDescription: "Contratos temporales con licencia ETT en {country}",
    overview: "Visión general de trabajo temporal",
  },
  recruitment: {
    label: "Selección de personal",
    description: "Búsqueda de talento en España y Europa",
    countryDescription: "Captación y contratación de talento permanente en {country}",
    overview: "Visión general de selección",
  },
  "staff-outsourcing": {
    label: "Externalización de personal",
    description: "Tu plantilla, gestionada bajo nuestro paraguas legal",
    countryDescription: "Equipos externalizados gestionados en {country}",
    overview: "Visión general de externalización",
  },
};

/** `Spain` -> `spain`, `Czech Republic` -> `czech-republic`. */
const toSlug = (name: string) =>
  name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z-]/g, "");

/**
 * Deliberately not memoised: a module-level cache survives across dev-server
 * requests, so a newly added content file would not reach the menu until a
 * restart — which defeats the one promise this file makes. `getCollection` does
 * its own caching and the mapping below is trivial.
 */
export async function getServiceNav(
  lang: Locale = "en",
): Promise<ServiceNavCategory[]> {
  // Entry ids are the routes without their leading slash, so this is a direct
  // membership test: `employer-of-record`, `employer-of-record/spain`, …
  const built = new Set((await getCollection("services")).map((e) => e.id));

  return IA.map((category) => {
    const local = lang === "es" ? IA_ES[category.slug] : null;
    const label = local?.label ?? category.label;
    const description = local?.description ?? category.description;
    const countryDescription =
      local?.countryDescription ?? category.countryDescription;
    return {
      slug: category.slug,
      label,
      description,
      hub: {
        href: withLocale(`/${category.slug}`, lang),
        label: local?.overview ?? `${category.label} overview`,
        description,
        available: built.has(category.slug),
      },
      countries: category.countries.map((name) => {
        const id = `${category.slug}/${toSlug(name)}`;
        const countryLabel = lang === "es" ? COUNTRY_ES[name] : name;
        return {
          href: withLocale(`/${id}`, lang),
          label: countryLabel,
          description: countryDescription.replace("{country}", countryLabel),
          available: built.has(id),
        };
      }),
    };
  });
}

/**
 * `getServiceNav()` transposed for the Countries menu.
 *
 * URLs stay service-first (`/payroll-outsourcing/germany`) — this is a second
 * way into the same pages, not a second URL scheme. Each row is labelled by the
 * *service*, since the country is already the heading it sits under.
 *
 * Not memoised, for the reason `getServiceNav()` is not.
 */
export async function getCountryNav(
  lang: Locale = "en",
): Promise<CountryNavEntry[]> {
  const categories = await getServiceNav(lang);

  return COUNTRY_ORDER.map((name) => {
    const slug = toSlug(name);
    return {
      slug,
      label: lang === "es" ? COUNTRY_ES[name] : name,
      services: categories.flatMap((category) => {
        const page = category.countries.find((c) =>
          c.href.replace(/\/$/, "").endsWith(`/${slug}`),
        );
        return page ? [{ ...page, label: category.label }] : [];
      }),
    };
  }).filter((country) => country.services.length > 0);
}
