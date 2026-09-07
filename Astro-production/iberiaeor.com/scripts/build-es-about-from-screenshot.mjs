/**
 * Build /es/about-us/ to match the Spanish About screenshot.
 * Live pretty URL /es/about-us/ is still 404 for guests (admin/draft preview);
 * we clone live About Elementor structure (post-96) and apply Spanish copy from the screenshot.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "src", "data");
const ORIGIN = "https://iberiaeor.com";
const PATH = "/es/about-us/";
const UA = "Mozilla/5.0";

function stripDomain(html) {
  return String(html || "")
    .replaceAll("https://dev.iberiaeor.com", "")
    .replaceAll("http://dev.iberiaeor.com", "")
    .replaceAll("https://www.iberiaeor.com", "")
    .replaceAll("http://www.iberiaeor.com", "")
    .replaceAll("https://iberiaeor.com", "")
    .replaceAll("http://iberiaeor.com", "");
}

/** Exact / longest-first replacements from EN About → screenshot Spanish */
const REPLACEMENTS = [
  [
    "IberiaEOR: Powered by Our People, Driven by Your Success",
    "IberiaEOR: Impulsado por nuestra gente, impulsado por su éxito",
  ],
  [
    "We’re here for businesses that dare to grow-the ones ready to enter Spain and make an impact. With our expertise, we turn challenges into milestones, navigate compliance, manage teams, and help businesses thrive in new markets. With 300+ successful projects and operations in 14 locations, we’ve perfected EOR services. Your vision drives us, and we provide the tools to make it happen.",
    "Estamos aquí para las empresas que se atreven a crecer-las que están listas para entrar en España y generar impacto. Con nuestra experiencia, convertimos los desafíos en hitos, gestionamos el cumplimiento, administramos equipos y ayudamos a las empresas a prosperar en nuevos mercados. Con más de 300 proyectos exitosos y operaciones en 14 ubicaciones, hemos perfeccionado los servicios EOR. Su visión nos impulsa, y nosotros aportamos las herramientas para hacerla realidad.",
  ],
  [
    "We're here for businesses that dare to grow-the ones ready to enter Spain and make an impact. With our expertise, we turn challenges into milestones, navigate compliance, manage teams, and help businesses thrive in new markets. With 300+ successful projects and operations in 14 locations, we've perfected EOR services. Your vision drives us, and we provide the tools to make it happen.",
    "Estamos aquí para las empresas que se atreven a crecer-las que están listas para entrar en España y generar impacto. Con nuestra experiencia, convertimos los desafíos en hitos, gestionamos el cumplimiento, administramos equipos y ayudamos a las empresas a prosperar en nuevos mercados. Con más de 300 proyectos exitosos y operaciones en 14 ubicaciones, hemos perfeccionado los servicios EOR. Su visión nos impulsa, y nosotros aportamos las herramientas para hacerla realidad.",
  ],
  ["Understanding Employer Of Record Services", "Comprensión del empleador de servicios de registros"],
  [
    "To redefine business expansion in Spain by creating a world where growth knows no limits. We aim to deliver 100% compliance, effortless solutions, and transformative opportunities-empowering companies to build their future with confidence. At IberiaEOR, we don’t just support businesses; we enable their success story.",
    "Redefinir la expansión empresarial en España creando un mundo donde el crecimiento no conoce límites. Nuestro objetivo es ofrecer un cumplimiento del 100%, soluciones sencillas y oportunidades transformadoras-empoderando a las empresas para construir su futuro con confianza. En IberiaEOR, no solo apoyamos a las empresas; impulsamos su historia de éxito.",
  ],
  [
    "To redefine business expansion in Spain by creating a world where growth knows no limits. We aim to deliver 100% compliance, effortless solutions, and transformative opportunities-empowering companies to build their future with confidence. At IberiaEOR, we don't just support businesses; we enable their success story.",
    "Redefinir la expansión empresarial en España creando un mundo donde el crecimiento no conoce límites. Nuestro objetivo es ofrecer un cumplimiento del 100%, soluciones sencillas y oportunidades transformadoras-empoderando a las empresas para construir su futuro con confianza. En IberiaEOR, no solo apoyamos a las empresas; impulsamos su historia de éxito.",
  ],
  ["We Have the Knowledge & Experience", "Nosotras tenemos el conocimiento y la experiencia"],
  ["Successfully Completed Projects", "Proyectos completados con éxito"],
  ["Millions in Recurring Annual Income", "Millones en ingresos anuales manejados"],
  ["Years of Excellence & Expertise", "Años de excelencia y experiencia"],
  ["14 Locations Across Region", "Ubicaciones en toda la región"],
  [
    "What Do Our Customers Have to Say About Our Work?",
    "¿Qué tienen que decir nuestros clientes sobre nuestro trabajo?",
  ],
  [
    "We have been supporting different types of companies to establish a presence in Spain for years.",
    "Llevamos años apoyando a distintos tipos de empresas a establecer su presencia en España.",
  ],
  [
    "“IberiaEOR is our true partner in growth. Their expertise and human approach make every interaction a pleasure.”",
    "“IberiaEOR es nuestro verdadero socio en el crecimiento. Su experiencia y enfoque humano hacen que cada interacción sea un placer.”",
  ],
  [
    "“Professional, responsive, and knowledgeable-Iberia EOR has been instrumental in our success across borders.”",
    "“Profesionales, ágiles y con gran conocimiento-Iberia EOR ha sido clave en nuestro éxito más allá de las fronteras.”",
  ],
  [
    "“Their team combines expertise with a personal touch, ensuring our needs are met. Iberia EOR stands out in the industry.”",
    "“Su equipo combina experiencia con un trato personal, asegurando que se cubran nuestras necesidades. Iberia EOR destaca en el sector.”",
  ],
  [
    "“Working with IberiaEOR means peace of mind. They handle complexities with ease and keep us informed throughout.”",
    "“Trabajar con IberiaEOR es tranquilidad. Gestionan la complejidad con facilidad y nos mantienen informados en todo momento.”",
  ],
  [
    "Comprehensive Solutions for Your Business Expansion in Spain",
    "Soluciones Integrales para la Expansión de su Negocio en España",
  ],
  ["Fuel your growth with our tailored services.", "Impulse su crecimiento con nuestros servicios a medida."],
  ["Employment Visa", "Visa de Empleo"],
  ["EOR Services", "Servicios de EOR"],
  ["PEO Services", "Servicios de PEO"],
  ["Payroll Outsourcing", "Subcontratación de nómina"],
  ["Employee Relocation", "Reubicación de empleados"],
  ["OUR PRIMARY SERVICES", "NUESTROS SERVICIOS PRINCIPALES"],
  ["IberiaEOR Mission", "QUIÉNES SOMOS"],
  ["About us", "SOBRE NOSOTROS"],
  // Screenshot shows unfinished Elementor label on the CTA
  ["Contact us", "Change text"],
];

function applyReplacements(html) {
  let out = html;
  // Longest first already ordered
  for (const [from, to] of REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

const res = await fetch(`${ORIGIN}/about-us/?nowprocket=1`, { headers: { "User-Agent": UA } });
const html = await res.text();
const $ = cheerio.load(html);
const el = $('[data-elementor-type="wp-page"]').first();
if (!el.length) {
  console.error("no elementor page body");
  process.exit(1);
}

let bodyHtml = stripDomain(applyReplacements($.html(el)));
const elId = bodyHtml.match(/data-elementor-id="(\d+)"/)?.[1] || "96";

const pages = JSON.parse(fs.readFileSync(path.join(DATA, "pages.json"), "utf8"));
const bodies = JSON.parse(fs.readFileSync(path.join(DATA, "bodies.json"), "utf8"));
const enAbout = pages.find((p) => p.path === "/about-us/") || {};

const entry = {
  ...enAbout,
  id: Number(elId),
  type: "page",
  path: PATH,
  slug: "about-us",
  title: "Sobre nosotros",
  content: bodyHtml,
  bodyHtml,
  status: "published",
  lang: "es",
  elementorCss: `/wp-content/uploads/elementor/css/post-${elId}.css`,
  pageCss: [
    ...new Set([
      ...(enAbout.pageCss || []),
      `/wp-content/uploads/elementor/css/post-${elId}.css`,
      "/wp-content/uploads/elementor/css/post-8.css",
      "/wp-content/uploads/elementor/css/post-25.css",
    ]),
  ],
  seo: {
    title: "Sobre nosotros | Iberia EOR",
    description:
      "IberiaEOR: impulsado por nuestra gente, impulsado por su éxito. Servicios EOR y expansión empresarial en España.",
    canonical: PATH,
    ogImage: enAbout.seo?.ogImage,
    schemas: [],
  },
  sourceNote: "Built from live About (post-96) + Spanish copy from provided screenshot; live /es/about-us/ returns 404 for public.",
};

const idx = pages.findIndex((p) => p.path === PATH);
if (idx >= 0) pages[idx] = { ...pages[idx], ...entry };
else pages.push(entry);
bodies[PATH] = bodyHtml;

fs.writeFileSync(path.join(DATA, "pages.json"), JSON.stringify(pages, null, 2));
fs.writeFileSync(path.join(DATA, "bodies.json"), JSON.stringify(bodies, null, 2));

const checks = [
  "SOBRE NOSOTROS",
  "Impulsado por nuestra gente",
  "QUIÉNES SOMOS",
  "Proyectos completados con éxito",
  "Soluciones Integrales",
  "Visa de Empleo",
  "Change text",
];
console.log({
  path: PATH,
  body: bodyHtml.length,
  elId,
  markers: Object.fromEntries(checks.map((c) => [c, bodyHtml.includes(c)])),
});
