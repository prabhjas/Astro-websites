/**
 * JSON-LD builders for the service pages.
 *
 * Every service page emits the same three nodes: an `Organization` for the
 * company, a `Service` for what the page sells, and a `FAQPage` built from the
 * accordion the page already renders.
 *
 * Two rules are why these are builders rather than hand-written blobs in each
 * content file:
 *
 * 1. The FAQ markup is generated from the same array the page renders. Google
 *    requires the marked-up Q&A to be visible, and a hand-maintained copy
 *    drifts the first time an answer is edited. Nothing here rewrites,
 *    truncates or reorders the answers.
 * 2. `@id` is the page URL plus a fragment, so the `Service`'s `provider`
 *    points at the `Organization` in the same graph rather than repeating it.
 */

/** The canonical origin. Mirrors `site` in astro.config.mjs. */
export const SITE = "https://iberiaworkforce.com";

/**
 * The brand's own spelling, which is not the wordmark's: the logo and page copy
 * read "Iberia Work Force", while the SEO brief and the domain are "Iberia
 * Workforce". Structured data has to match what the client is ranking for, so
 * it is kept in one place and the two never disagree by accident.
 */
export const ORGANISATION_NAME = "Iberia Workforce";

export interface Address {
  locality: string;
  country: string;
}

/** `/employer-of-record/germany` -> `https://iberiaworkforce.com/employer-of-record/germany/`. */
export const pageUrl = (path: string, lang: "en" | "es" = "en") => {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const prefix = lang === "es" ? "es/" : "";
  if (!clean) return lang === "es" ? `${SITE}/es/` : `${SITE}/`;
  return `${SITE}/${prefix}${clean}/`.replace(/([^:])\/\/+/g, "$1/");
};

/**
 * The company. `address` is omitted where the client has not confirmed which
 * office the page speaks from — an invented city here is worse than none.
 *
 * The brief writes this as `location`; `address` with a `PostalAddress` carries
 * the same two facts in the property search engines actually read.
 */
export const organization = (url: string, address?: Address) => ({
  "@type": "Organization",
  "@id": `${url}#organization`,
  name: ORGANISATION_NAME,
  url: `${SITE}/`,
  parentOrganization: { "@type": "Organization", name: "Connect Group", url: "https://connectgroup.co/" },
  logo: `${SITE}/logo.png`,
  ...(address && {
    address: {
      "@type": "PostalAddress",
      addressLocality: address.locality,
      addressCountry: address.country,
    },
  }),
});

/**
 * What the page sells. `areaServed` is a `Country` on a country page and a
 * `Place` on a hub — "Europe" is not a country, and typing it as one is the
 * kind of detail a validator passes and a consumer does not.
 */
export const service = (opts: {
  url: string;
  name: string;
  serviceType: string;
  areaServed: string;
  areaType: "Country" | "Place";
  description: string;
}) => ({
  "@type": "Service",
  "@id": `${opts.url}#service`,
  name: opts.name,
  serviceType: opts.serviceType,
  url: opts.url,
  description: opts.description,
  provider: { "@id": `${opts.url}#organization` },
  areaServed: { "@type": opts.areaType, name: opts.areaServed },
});

/**
 * The FAQ accordion, as marked-up Q&A. `answer` is passed through exactly as
 * the content file holds it, which is the same string the page renders. Where
 * an item carries a `link`, the anchor is a presentation detail of the rendered
 * answer — the text is identical either way.
 */
export const faqPage = (
  url: string,
  items: readonly { question: string; answer: string }[],
) => ({
  "@type": "FAQPage",
  "@id": `${url}#faq`,
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
});

/**
 * The homepage's `Organization` — the conventional place for the entity node.
 *
 * The shared builder plus the two things only the homepage carries: a `logo`
 * (a stable file in `public/`, since an `src/assets` import is content-hashed
 * and would change URL on every rebuild) and the Barcelona address twelve of
 * the fourteen service pages already state. No new facts.
 */
export const siteOrganization = (lang: "en" | "es" = "en") => ({
  ...organization(`${SITE}/`, { locality: "Barcelona", country: "ES" }),
  logo: `${SITE}/logo.png`,
  description:
    lang === "es"
      ? "Employer of Record con licencia ETT, nóminas y servicios de personal para empresas que contratan en España, Portugal, Alemania, Polonia e Italia."
      : "ETT-licensed Employer of Record, payroll and workforce services for companies hiring in Spain, Portugal, Germany, Poland and Italy.",
});
