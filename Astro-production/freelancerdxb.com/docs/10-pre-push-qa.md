# freelancerdxb.com — pre-push QA (2026-08-07)

Local base: `http://127.0.0.1:5109/` · branch: `rajpal-branch`

## Verdict: PASS — ready to commit/push

### Pages
| Path | Status | Body / nav / form |
|------|--------|-------------------|
| `/` | 200 | OK (80 images, contact form) |
| `/about-us/` | 200 | OK |
| `/freelance/` | 200 | OK |
| `/freelance-journey/` | 200 | OK |
| unknown path | 404 | Brand 404 |

### Redirects (all 301 as expected)
`/about/` → `/about-us/` · `/home/` → `/` · `/contact/` & `/contact-us/` → `/#contactform` · `/hello-world/` → `/` · `/feed/` & `/comments/feed/` → `/` · `/index.php` → `/` · `/freelance-services/` → `/freelance/` · `/journey/` → `/freelance-journey/` · `/wp-json/` & `/xmlrpc.php` → 404 (no WP endpoints)

### No live WordPress asset loads
- Zero `https://freelancerdxb.com/wp-*` references in served HTML
- Zero absolute WP URLs left in `public/**/*.css|js`
- Outfit font self-hosted at `/wp-content/uploads/elementor/google-fonts/css/outfit.css` (+ local woff2)
- Dead Elementor Google Font CSS links (404 on origin) removed

### Assets
- Homepage relative assets checked: **70/70 HTTP 200**
- Cloudflare email-decode hosted locally; emails rewritten to `mailto:info@freelancerdxb.com`

### Navigation / CTAs / forms
- Internal nav links: `/`, `/about-us/`, `/freelance/`, `/freelance-journey/` → 200
- Home CTAs mostly `#contactform` / `#` (in-page)
- `POST /api/contact/` → `{"success":true,...}`
- `astro-mirror-fixes.js` + `cf-email-decode.js` → 200

### Fixes applied during this QA
1. Restored corrupted `*.cleaned.html` (over-aggressive strip had removed `<body>`) via `prepare-page.mjs`
2. Safer WP discovery stripping only (link tags / Leadfeeder script)
3. Self-hosted Outfit; removed fonts.googleapis.com
4. Hosted `/cdn-cgi/.../email-decode.min.js`; decoded CF emails to mailto
