# Al Buraq — WordPress → Astro migration notes

Source: **https://alburaq.ae/** (WordPress + Elementor). Ported with the **faithful
mirror** approach — each page serves the site's own rendered HTML + real CSS, with every
asset URL localized to `/images` (media) and `/assets` (styles/fonts). Result is visually
identical to the source.

## Scope ported
- **10 pages:** Home, About Us, Contact Us, What We Do, Blog (listing), Licensing,
  Corporate Sponsorship, Business Center, Payroll Outsourcing, Outsourcing.
- **77 blog posts** at their live root-level URLs (`/<slug>/`).
- All media (2,000+ files) under `public/images` (from the site backup; one newer 2026/06
  image was pulled from the live site as the backup predated it).

## Intentional differences (no silent losses)

### Forms → wired to Pipedrive (replaces the old Contact Form 7 + Pipedrive setup)
All contact forms (Contact Us page, homepage CTA, blog "Partner With Experts" sidebar)
submit to a small server endpoint that forwards the lead to **Pipedrive** — same
destination as the old WordPress CF7 + Pipedrive integration.

- **Endpoint:** `src/pages/api/lead.ts` (`/api/lead/`). Creates a **Person** then a **Lead**
  in Pipedrive — the exact same two calls and field mapping as the old WordPress
  *Contact Form 7 → Pipedrive Integration* plugin (recovered from the live site's
  submission log, `wp-content/uploads/logs/.cf7pd.log`). Validates input; honeypot for spam.
  - **Person:** name, `owner_id 13601147` (lead owner "Connect Group"), `visible_to [3]`,
    email, phone, `label 5`.
  - **Lead:** `title "AD alburaq"`, `owner_id 13601147`, linked person, and 4 custom fields
    (message, country, "Lead Submitted On: \<url\>", "User Landed on:").
  - These IDs/field hashes belong to the Al Buraq Pipedrive account and are overridable via
    env (`PIPEDRIVE_OWNER_ID`, etc.). Verified end-to-end: a test lead was created in
    Pipedrive with the correct owner, label, visibility and all custom fields populated.
- **Front-end:** a small script injected into the mirror pages intercepts the existing
  forms, posts to `/api/lead/`, and shows an inline success/error message. Forms keep
  their original look.
- **WhatsApp** float button links to `wa.me/97143316688` (works as-is).

**Before it sends real leads, two things are needed at deploy:**
1. **Set the secret** `PIPEDRIVE_API_TOKEN` (Pipedrive → Settings → Personal preferences →
   API). See `.env.example`. Until set, the form shows "Form is not configured yet."
2. **Run the endpoint on a server/serverless host.** The site is otherwise static; only
   `/api/lead` needs to run. Locally it uses the `@astrojs/node` adapter — swap for your
   host's adapter (Netlify / Vercel / Cloudflare) at deploy. A purely static file host
   (no functions) serves every page but **cannot run the form endpoint**.

Verified locally end-to-end: validation (422), missing-config (503), and a real call to
the Pipedrive API (rejected only because the test token was fake). With a valid token it
returns success and creates the lead.

### Security: ALL third-party JavaScript stripped
Because source WordPress sites can be compromised, **every `<script>` from the original is
removed** and **no `.js` files are shipped**. The only script in the whole site is our own
inline form handler. Verified: **0 external scripts** in the built output. (Emails decoded
to `info@alburaq.ae`; Cloudflare/analytics/emoji/oembed all gone with the rest.)

The capture process is also read-only: only `GET` requests to the live site (nothing is
uploaded/written/executed on the server), and no downloaded code is run locally.

### Clean asset structure (no "WordPress" folders)
Static styles/fonts live under **`public/assets`** (renamed from `wp-content` /
`wp-includes`); media under `public/images`. No `.php` and no `.js` — just CSS, fonts, svg,
json. It is **not** a WordPress install, just the assets the pages link to.

### Behavior matched to the live site
- `/dubai-e-trader-license/` → redirects to `/e-trader-license-dubai/` (live 301).
- `/dubai-police-complaint-number-guide/` → redirects to home (live 301).
- `/terms/` and `/privacy-policy/` redirect to the homepage on the live site; this build
  keeps lightweight **placeholder** pages at those paths instead — review/replace or
  convert to redirects before production.

### Dynamic widgets (consequence of stripping JS)
With JavaScript removed, carousels/sliders show their **first item** and scroll animations
don't animate — e.g. the homepage testimonials show 1 of 3, client logos are a static row.
All content still exists in the HTML; it can be revealed with a little CSS (no third-party
JS) if a fuller display is wanted.

### Build note
CSS minification is disabled (`vite.build.cssMinify: false`) because the mirrored pages
embed the site's own already-minified CSS, and the strict `lightningcss` engine rejected
some embedded modern syntax in one post.

## Verified
- Build: **89 pages, 0 errors**.
- **0 broken** image/asset references; **0 broken** internal links.
- Screenshot-diffed against the live site (home, about, what-we-do, a blog post) — match.

## Not yet done
- **CMS-ready blog (deferred by choice).** Posts are faithful HTML mirrors, not yet
  structured content. When a CMS is chosen, migrate the blog to an Astro Content Collection
  (see Agents.md Phase 9). Static pages can stay as mirrors.
- Set `PIPEDRIVE_API_TOKEN` + choose the deploy host's serverless adapter (see above).
- Deploying / hosting.
