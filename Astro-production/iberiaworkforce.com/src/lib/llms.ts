/**
 * `/llms.txt` — the site, as plain text, for language models.
 *
 * Generated from the `services` collection rather than hand-maintained, so it
 * cannot drift the way a second copy of the page list always does: adding a
 * content file adds its line here, which is the same promise `service-nav.ts`
 * makes for the menus.
 *
 * Nothing here is invented. Every title and one-line description is the `seo`
 * block the page itself already emits, and the standing facts below are the
 * hero badges and the pricing band.
 */
import { getCollection } from "astro:content";
import { pageUrl, SITE } from "./schema";

const SUMMARY =
  "ETT-licensed Employer of Record, payroll and workforce services for companies hiring in Spain, Portugal, Germany, Poland and Italy. Backed by a Spanish law firm.";

const NOTES = [
  "Employer of Record in Spain is a flat €299 per employee per month; every other service is quoted on request.",
  "Iberia Work Force holds a Spanish ETT (empresa de trabajo temporal) licence.",
  "The site is published in English and Spanish. Spanish pages live under /es/ with the same URL structure.",
];

/** Category directory -> the heading its pages sit under. */
const CATEGORY_TITLES: Record<string, string> = {
  "employer-of-record": "Employer of Record",
  "payroll-outsourcing": "Payroll Outsourcing",
  "temporary-staffing": "Temporary Staffing",
  recruitment: "Recruitment",
  "staff-outsourcing": "Staff Outsourcing",
};

const line = (title: string, path: string, note: string) =>
  `- [${title}](${path === "/" ? `${SITE}/` : pageUrl(path)}): ${note}`;

const lineEs = (title: string, path: string, note: string) =>
  `- [${title}](${pageUrl(path.replace(/^\//, ""), "es")}): ${note}`;

export async function buildLlmsTxt(): Promise<string> {
  const [services, servicesEs] = await Promise.all([
    getCollection("services"),
    getCollection("servicesEs"),
  ]);

  /*
    Hub first, then its country pages — the same shape as the URL tree and the
    services menu. `entry.id` is the directory path, so the category is its
    first segment and a hub is the entry whose id is the category itself.
  */
  const groupByCategory = <T extends { id: string }>(entries: T[]) =>
    Object.keys(CATEGORY_TITLES).map((category) => {
      const matched = entries
        .filter((entry) => entry.id === category || entry.id.startsWith(`${category}/`))
        .sort((a, b) =>
          a.id === category ? -1 : b.id === category ? 1 : a.id.localeCompare(b.id),
        );
      return { category, entries: matched };
    });

  const categories = groupByCategory(services);
  const categoriesEs = groupByCategory(servicesEs);

  const sections = [
    ["Company (English)", [
      line("Iberia Work Force", "/", "Homepage: services, pricing and the markets covered."),
      line("About", "/about", "Who the company is, the ETT licence, and how it works with clients."),
      line("Contact", "/contact", "Enquiry form, response commitments and how to reach the team."),
      line("All services", "/services", "Index of every service offered."),
    ]],
    ...categories.map(({ category, entries }) => [
      CATEGORY_TITLES[category],
      entries.map((entry) =>
        line(entry.data.seo.title, `/${entry.id}`, entry.data.seo.description),
      ),
    ] as [string, string[]]),
    ["Company (Spanish /es)", [
      lineEs("Iberia Work Force", "/", "Inicio: servicios, precios y mercados."),
      lineEs("Sobre nosotros", "/about", "Quiénes somos, la licencia ETT y cómo trabajamos."),
      lineEs("Contacto", "/contact", "Formulario de consulta y cómo contactar al equipo."),
      lineEs("Todos los servicios", "/services", "Índice de todos los servicios."),
    ]],
    ...categoriesEs.map(({ category, entries }) => [
      `${CATEGORY_TITLES[category]} (ES)`,
      entries.map((entry) =>
        lineEs(entry.data.seo.title, `/${entry.id}`, entry.data.seo.description),
      ),
    ] as [string, string[]]),
  ] as [string, string[]][];

  return [
    "# Iberia Work Force",
    "",
    `> ${SUMMARY}`,
    "",
    ...NOTES.map((note) => `- ${note}`),
    "",
    ...sections.flatMap(([heading, items]) => [`## ${heading}`, "", ...items, ""]),
  ].join("\n");
}

/** Both `/llms.txt` and its `/llm.txt` alias answer with exactly this. */
export const llmsResponse = async () =>
  new Response(await buildLlmsTxt(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
