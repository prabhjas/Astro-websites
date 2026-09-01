import { defineCollection, z, type SchemaContext } from "astro:content";
import { glob } from "astro/loaders";
import { SERVICE_ICON_NAMES } from "./lib/service-icon-names";

/**
 * Service pages — 5 category hubs and their country pages.
 *
 * The directory structure mirrors the URL. `src/pages/[hub]/index.astro`
 * renders hubs and `src/pages/[hub]/[country].astro` renders country pages.
 * `index.yaml` in a category directory is that category's hub; its siblings
 * are country pages. `services` is the collection name, not a URL segment:
 *
 *   employer-of-record/index.yaml  -> /employer-of-record
 *   employer-of-record/spain.yaml  -> /employer-of-record/spain
 *
 * Data files, not prose — every page is a fixed run of designed sections and
 * there is no markdown body. Omit a section by leaving its key out.
 */

const iconName = z.enum(SERVICE_ICON_NAMES);

const cta = z.object({
  label: z.string(),
  href: z.string(),
});

/** Eyebrow + heading pair shared by most section headers. */
const sectionHeader = z.object({
  eyebrow: z.string().optional(),
  heading: z.string(),
});

const serviceLoader = (base: string) =>
  glob({
    base,
    pattern: "**/*.{yaml,yml}",
    generateId: ({ entry }) =>
      entry.replace(/\.ya?ml$/, "").replace(/(^|\/)index$/, ""),
  });

const serviceSchema = ({ image }: SchemaContext) =>
    z.object({
      /** Selects the template. */
      type: z.enum(["hub", "country"]),
      /** Short label for cross-links and breadcrumbs, e.g. "Employer of Record". */
      label: z.string(),
      seo: z.object({
        title: z.string(),
        description: z.string(),
        /**
         * Required, not optional: every service page emits Organization +
         * Service + FAQPage, and a page added without this would ship silently
         * unmarked. The FAQ half is generated from the `faq` block the page
         * renders, so the two cannot drift.
         */
        schema: z.object({
          /** `Service.name`, e.g. "Employer of Record Services Germany". */
          serviceName: z.string(),
          /** `Service.serviceType`, e.g. "Employer of Record". */
          serviceType: z.string(),
          /**
           * `Service.areaServed` — a country name on a country page, "Europe"
           * on a hub. Bare place name only; a consumer reads this literally.
           */
          areaServed: z.string(),
          /** Optional: the Germany and Portugal briefs both say PENDING. */
          address: z
            .object({ locality: z.string(), country: z.string() })
            .optional(),
        }),
      }),

      hero: z.object({
        heading: z.string(),
        /** Terracotta line under the H1. Country pages use it; hubs don't. */
        subheading: z.string().optional(),
        badges: z
          .array(z.object({ icon: iconName, label: z.string() }))
          .default([]),
        body: z.string(),
        /**
         * The desktop crop, and the only required one. The tablet and mobile
         * crops are art direction rather than resolution — different aspect
         * ratios framing different parts of the scene, which `object-position`
         * on one file cannot express. Omitting them falls back to desktop.
         */
        image: image(),
        imageTablet: image().optional(),
        imageMobile: image().optional(),
        imageAlt: z.string().default(""),
        primaryCta: cta,
        secondaryCta: cta.optional(),
        /** Hubs are navy photographs with inverse copy; countries are cream. */
        tone: z.enum(["dark", "light"]).default("dark"),
        /**
         * Where the subject sits, so `object-cover` keeps it in frame. Desktop
         * crop only — the narrow crops are framed for their own frame already.
         */
        imageFocus: z.enum(["right", "center"]).default("right"),
      }),

      /** Two-column statement: eyebrow + claim left, the prose backing it right. */
      intro: z
        .object({
          eyebrow: z.string().optional(),
          heading: z.string(),
          paragraphs: z.array(z.string()).min(1),
          /** With a photograph the band becomes heading / photo / prose. */
          image: image().optional(),
          imageAlt: z.string().default(""),
          /**
           * Which side the photograph takes, and where it falls once stacked:
           * `left` puts it between the heading and the prose, `right` after both.
           */
          imagePosition: z.enum(["left", "right"]).default("left"),
          /**
           * Slate pull-quote card beside the prose. The first statement is set
           * in white and the rest in terracotta. Mutually exclusive with
           * `image` — a page answers "what is this" one way or the other.
           */
          quote: z
            .object({ statements: z.array(z.string()).min(1) })
            .optional(),
          /**
           * How large the claim is set, and with it where the columns split:
           * a 64px heading has nothing left to share a 768px frame with.
           * Ignored when a photograph or quote card takes the second column.
           */
          headingScale: z.enum(["h1", "display"]).default("h1"),
          /** Overrides the breakpoint `headingScale` would imply. */
          splitAt: z.enum(["md", "lg"]).optional(),
          /** Trailing button. Bare two-column arrangement only. */
          cta: cta.optional(),
        })
        .optional(),

      /**
       * "Why this service matters": claim, one-line answer, prose and a CTA in
       * a narrow left column, the problems solved beside it as filled cards.
       *
       * Not `whyChoose`, which argues for *us* — these are statements about the
       * reader's own business, hence panels rather than a divider-separated run.
       */
      whyItMatters: z
        .object({
          heading: z.string(),
          /** One-line answer under the claim, at H4 scale. */
          subheading: z.string().optional(),
          /** The paragraph under the pair, at Body LG. */
          body: z.string().optional(),
          items: z
            .array(z.object({ title: z.string(), description: z.string() }))
            .min(1),
          cta: cta.optional(),
        })
        .optional(),

      /**
       * "Why this matters": the claim and its CTA on one side, a single worked
       * example on a card on the other, with the lesson behind a terracotta rule.
       *
       * Not `intro.quote` — that is a claim we make about ourselves. This is a
       * story about the reader going wrong, and the rule under it is the point.
       */
      scenario: z
        .object({
          heading: z.string(),
          body: z.string(),
          cta: cta.optional(),
          example: z.object({
            eyebrow: z.string(),
            quote: z.string(),
            /** The lesson, set behind a terracotta rule under the story. */
            lesson: z.string(),
          }),
        })
        .optional(),

      /**
       * Photograph beside the answer to a question about the service. Both
       * layouts give the photo its own column on desktop and drop it under the
       * copy on narrow frames — that part *is* the section.
       *
       * `quote` pull-quotes one sentence behind a terracotta rule; `prose`
       * argues in ordinary paragraphs under an eyebrow and a smaller claim. The
       * heading scale and the photo's crop travel with the layout, because a
       * band that argues needs room for the argument rather than for one line.
       */
      definition: z
        .object({
          /** Small terracotta label over the claim. `prose` only. */
          eyebrow: z.string().optional(),
          heading: z.string(),
          /** The pull-quoted sentence — `quote` layout. */
          body: z.string().optional(),
          /** The argument, as ordinary paragraphs — `prose` layout. */
          paragraphs: z.array(z.string()).min(1).optional(),
          layout: z.enum(["quote", "prose"]).default("quote"),
          image: image(),
          imageAlt: z.string(),
        })
        // Carrying both would leave the unused half silently dropped.
        .refine((d) => Boolean(d.layout === "prose" ? d.paragraphs : d.body), {
          message:
            "definition: `prose` needs `paragraphs`, `quote` needs `body`",
        })
        .optional(),

      /** Full-bleed section: one big claim, supporting prose beside it. */
      differentiator: z
        .object({
          heading: z.string(),
          /** Second line under the claim. H4 scale, regular. */
          subheading: z.string().optional(),
          paragraphs: z.array(z.string()).min(1),
          /** `light` is the same argument on a neutral with no photograph. */
          tone: z.enum(["dark", "light"]).default("dark"),
          /**
           * Which neutral a `light` band sits on — what keeps a page
           * alternating is the pair of sections either side of it. Dark ignores it.
           */
          surface: z.enum(["page", "surface", "muted"]).default("page"),
          background: image().optional(),
          /** Photograph beside the argument. `layout: "photo"` only. */
          image: image().optional(),
          imageAlt: z.string().default(""),
          /** Which column the prompt and CTA take on a `light` split. */
          ctaPlacement: z.enum(["claim", "prose"]).default("claim"),
          /**
           * One phrase of the claim set in terracotta. Must appear verbatim in
           * `heading`; a phrase that stops matching degrades to a plain heading.
           */
          highlight: z.string().optional(),
          /**
           * `split` is claim left, prose right. `stacked` puts both in one
           * column so a background photograph keeps the other half. `statements`
           * is that stack with a terracotta rule down each paragraph. `photo`
           * gives a square photograph its own column beside the copy — `light`
           * only, since there the photograph is the subject, not a wash.
           */
          layout: z
            .enum(["split", "stacked", "statements", "photo"])
            .default("split"),
          /**
           * How the claim sits against the prose on a **dark** `split`. Only
           * shows when the columns are very different heights — three lines of
           * claim against seven of prose drops a centred claim ~100px.
           */
          align: z.enum(["center", "start"]).default("center"),
          /** Band height: 96/160 by default, 80/80 compact. */
          spacing: z.enum(["default", "compact"]).default("default"),
          /** Question set above the CTA. */
          prompt: z.string().optional(),
          cta: cta.optional(),
        })
        .optional(),

      /**
       * Reasons to choose us: heading on the left, a divider-separated run of
       * title + paragraph on the right. `highlight` must appear verbatim in
       * `heading` — the first occurrence is set in terracotta, and a phrase that
       * stops matching degrades to a plain heading.
       */
      whyChoose: z
        .object({
          heading: z.string(),
          highlight: z.string().optional(),
          items: z
            .array(z.object({ title: z.string(), description: z.string() }))
            .min(1),
          /**
           * `cards` puts the heading on its own line with the reasons as filled
           * cards below — what two long reasons need where four short ones read
           * fine as a divider list.
           */
          layout: z.enum(["list", "cards"]).default("list"),
          /**
           * Which neutral the band sits on. `cards` needs the section and the
           * cards to take different neutrals to read as cards at all.
           */
          surface: z.enum(["page", "surface"]).default("surface"),
          /** Texture behind a `cards` band. Full-bleed, below the copy. */
          background: image().optional(),
          /**
           * Trailing button. On a `list` band it sits under the claim on
           * desktop and after the reasons below that — placement, not source
           * order, which is why that layout is a grid.
           */
          cta: cta.optional(),
          /**
           * Pins the claim and its button while the reasons scroll past, as the
           * homepage's `Differentiators` does. `list` and desktop only.
           */
          sticky: z.boolean().default(false),
        })
        .optional(),

      /**
       * "What's included" as an editorial list rather than the hub's icon grid.
       * The image is optional because the narrow frames drop it.
       */
      featureList: z
        .object({
          heading: z.string(),
          image: image().optional(),
          imageAlt: z.string().default(""),
          items: z
            .array(
              z.object({
                eyebrow: z.string(),
                title: z.string(),
                description: z.string(),
              }),
            )
            .min(1),
          /**
           * `photo` is a photograph on the left, heading above the list on the
           * right. `aside` drops the photo, gives the heading and CTA the left
           * column alone and draws each eyebrow as a navy pill — the same
           * decision, since an eyebrow repeated five times has to read as a
           * label rather than as a line of copy.
           */
          layout: z.enum(["photo", "aside"]).default("photo"),
          /** Trailing button. `aside` only. */
          cta: cta.optional(),
          /** Pins the heading and its button. `aside` and desktop only. */
          sticky: z.boolean().default(false),
        })
        .optional(),

      /**
       * Pricing band: one priced plan beside one "quoted on request" card.
       * Shared with the homepage section, which passes its own copy.
       *
       * A page carries exactly one of `pricing`, `pricingNote`,
       * `pricingSummary` and `pricingVariables`.
       */
      pricing: sectionHeader
        .extend({
          body: z.string().optional(),
          /** The plan card is white either way, so it reads as a card on both. */
          surface: z.enum(["surface", "page"]).default("surface"),
          plan: z.object({
            name: z.string(),
            price: z.string(),
            unit: z.string(),
            note: z.string().optional(),
            features: z.array(z.string()).min(1),
            cta,
          }),
          custom: z.object({
            eyebrow: z.string().optional(),
            heading: z.string(),
            tagline: z.string().optional(),
            description: z.string(),
            cta,
          }),
          /** Closing note under the two cards. */
          footnote: z
            .object({ heading: z.string().optional(), body: z.string() })
            .optional(),
        })
        .optional(),

      /**
       * Pricing as a floor: the headline rate in the gradient and the variables
       * that move it as cards, all floating over a photograph. For a page that
       * can publish a starting number but not a flat rate.
       */
      pricingSummary: sectionHeader
        .extend({
          body: z.string().optional(),
          cards: z
            .array(
              z.object({
                title: z.string(),
                description: z.string().optional(),
                /**
                 * The variables as ticked pills rather than prose. A card
                 * carries `description` or `chips`, never both — the pills
                 * *are* the description.
                 */
                chips: z.array(z.string()).min(1).optional(),
                /**
                 * `filled` is a variable that moves the price; `outline` is the
                 * aside explaining why the number is honest, and sets its title
                 * terracotta because it is a question rather than a plan name.
                 */
                variant: z.enum(["filled", "outline"]).default("filled"),
              }),
            )
            .min(1),
          background: image(),
          cta: cta.optional(),
        })
        .optional(),

      /**
       * Pricing as an open question: no number, but the variables that would
       * decide one, itemised on a white card with a photograph beside it. Where
       * `pricingNote` argues that cost varies and `pricingSummary` publishes a
       * floor, this answers what it is the reader does not know yet.
       */
      pricingVariables: z
        .object({
          heading: z.string(),
          body: z.string().optional(),
          card: z.object({
            heading: z.string(),
            /** One ticked line per variable. */
            items: z.array(z.string()).min(1),
            /** The reassurance under the list, at 12px. */
            footnote: z.string().optional(),
            cta: cta.optional(),
          }),
          image: image(),
          imageAlt: z.string().default(""),
        })
        .optional(),

      /**
       * "Who this is built for": a display-scale claim over a row of
       * icon + title + one-liner columns. Not `included` — that answers what
       * you get, this answers who is buying.
       */
      audience: sectionHeader
        .extend({
          items: z
            .array(
              z.object({
                icon: iconName,
                title: z.string(),
                description: z.string(),
              }),
            )
            .min(1),
        })
        .optional(),

      /** Pricing as an explanation: no cards, just why there is no flat number. */
      pricingNote: z
        .object({
          heading: z.string(),
          /** Second line under the claim. H4 scale, regular — `light` only. */
          subheading: z.string().optional(),
          paragraphs: z.array(z.string()).min(1),
          /** `light` makes the same argument as a cream band with no photograph. */
          tone: z.enum(["dark", "light"]).default("dark"),
          background: image().optional(),
          /**
           * How strongly the photograph reads over the navy. `half` suits a crop
           * whose own treatment is stronger than the band wants; a crop with the
           * navy duotone already baked in needs `full`, or halving it lands
           * within 2/255 of the background and the subject disappears.
           */
          backgroundStrength: z.enum(["half", "full"]).default("half"),
          cta: cta.optional(),
        })
        .optional(),

      /** Numbered step cards. Numbers are derived from order, not authored. */
      howItWorks: z
        .object({
          heading: z.string(),
          /** Which of the two neutrals keeps this page alternating. */
          surface: z.enum(["surface", "page"]).default("surface"),
          steps: z
            .array(
              z.object({
                title: z.string(),
                description: z.string(),
                image: image(),
                imageAlt: z.string(),
              }),
            )
            .min(1),
          prompt: z.string().optional(),
          cta: cta.optional(),
        })
        .optional(),

      /** Grid of icon + title + one-liner cards. */
      included: sectionHeader
        .extend({
          items: z
            .array(
              z.object({
                icon: iconName,
                title: z.string(),
                description: z.string(),
              }),
            )
            .min(1),
          columns: z.union([z.literal(3), z.literal(4)]).default(4),
          /**
           * `grid` is the full-width band: header above the cards, CTA below.
           * `aside` gives the heading and CTA a narrow left column on desktop
           * only. `mosaic` is a six-column grid whose rows alternate two wide
           * cards and three narrow ones, so an odd count tiles without a hole;
           * below `lg` it is `grid` exactly.
           */
          layout: z.enum(["grid", "aside", "mosaic"]).default("grid"),
          /**
           * The tighter card treatment: 16px gutters and a measure on a centred
           * header. One decision, not two — the frames that pull the cards
           * together pull the heading in with them. `aside` and `mosaic` always
           * draw it; a plain grid only where its frame says so.
           */
          compact: z.boolean().default(false),
          /**
           * Which neutral the section sits on. The cards take the other one, so
           * they stay legible as cards either way.
           */
          surface: z.enum(["page", "surface"]).default("page"),
          align: z.enum(["start", "center"]).default("start"),
          cta: cta.optional(),
          /** The button can centre under the cards while the header stays left. */
          ctaAlign: z.enum(["start", "center"]).default("start"),
        })
        .optional(),

      /**
       * Country coverage. One featured market on a dark card, the rest in a
       * lighter grid — hubs only; a country page links back to its hub instead.
       */
      countries: sectionHeader
        .extend({
          /** Centred claim and sub-line between the header and the cards. */
          lead: z
            .object({ heading: z.string(), body: z.string().optional() })
            .optional(),
          /** Carries the lead's scale with it: centred claim, or left sub-line. */
          align: z.enum(["center", "start"]).default("center"),
          featured: z.object({
            name: z.string(),
            badge: z.string().optional(),
            description: z.string(),
            cta,
          }),
          others: z.array(
            z.object({
              name: z.string(),
              /** One-line positioning under the country name. */
              tagline: z.string().optional(),
              description: z.string(),
              /**
               * Status chip above the name — "COMING SOON" where a market has
               * no page yet, which is why `cta` is optional: a card with
               * nothing to link to says so rather than pointing at a 404.
               */
              badge: z.string().optional(),
              cta: cta.optional(),
            }),
          ),
        })
        .optional(),

      /**
       * A short cream strip naming the one market the page is about, with a
       * status chip and a single button.
       *
       * Not `countries`, which is a hub's map of markets to pick from. This is a
       * country page saying where its own team sits, in a band a third the
       * height, so it carries a chip rather than a grid.
       */
      coverage: z
        .object({
          badge: z.string().optional(),
          heading: z.string(),
          body: z.string(),
          cta: cta.optional(),
        })
        .optional(),

      faq: sectionHeader
        .extend({
          items: z
            .array(
              z.object({
                question: z.string(),
                answer: z.string(),
                /**
                 * Turns one phrase inside `answer` into a link, so the answer
                 * stays plain prose in YAML and the full sentence is still what
                 * search engines index. `label` must appear verbatim in
                 * `answer`; the first occurrence is the one linked.
                 */
                link: z
                  .object({ label: z.string(), href: z.string() })
                  .optional(),
              })
            )
            .min(1),
        })
        .optional(),

      /**
       * Closing CTA band. Carries a contact form rather than a pair of buttons;
       * `form` only overrides the component's defaults, so most pages leave it out.
       */
      closing: z
        .object({
          heading: z.string(),
          /** Terracotta second line, at H2 scale, completing the claim. */
          subheading: z.string().optional(),
          /**
           * One phrase *inside* the claim set in terracotta, for a heading that
           * breaks across two colours mid-sentence rather than adding a second
           * line. Must occur verbatim in `heading`; degrades to plain if not.
           */
          highlight: z.string().optional(),
          /** Lead paragraph under the claim. */
          body: z.string().optional(),
          /**
           * How that paragraph is set. `lead` is H3 scale, where it carries the
           * section; `note` drops it to 18px, for a page whose terracotta line
           * has already made the argument.
           */
          bodySize: z.enum(["lead", "note"]).default("lead"),
          footnote: z.string().optional(),
          form: z
            .object({
              heading: z.string().optional(),
              body: z.string().optional(),
              submitLabel: z.string().optional(),
              action: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
    });

const services = defineCollection({
  loader: serviceLoader("./src/content/services"),
  schema: serviceSchema,
});

const servicesEs = defineCollection({
  loader: serviceLoader("./src/content/services-es"),
  schema: serviceSchema,
});

export const collections = { services, servicesEs };
