# 10 — Redirects

How URL redirects work for this **static Astro** site (no WordPress / PHP).

---

## Why redirects matter

WordPress often has:

- Old slugs → new slugs (Rank Math / Redirection plugin)
- Trailing-slash vs no slash
- Removed pages that must 301 to a replacement

After cutover, those must live in **Astro + host config**, not Rank Math.

---

## Two layers (use both)

| Layer | What it does | True HTTP 301? |
|-------|----------------|----------------|
| **A. Host redirects** (`public/_redirects`, Cloudflare, nginx, …) | CDN/host returns `301 Permanent` | **Yes** — preferred for SEO |
| **B. Astro `redirects` in config** | Static build emits small HTML redirect pages | Soft redirect (meta/refresh) — fallback |

**SEO rule:** prefer real **301** at the host. Keep Astro redirects as a portable backup.

---

## Source of truth in this repo

Edit:

```text
src/data/redirects.yml
```

Then generate host files:

```bash
npm run redirects:generate
```

That writes:

- `public/_redirects` — Netlify / Cloudflare Pages format  
- `public/_redirects.json` — machine-readable copy  

`astro.config.mjs` also reads the same YAML for Astro’s built-in `redirects` map.

---

## Example YAML

```yaml
redirects:
  - from: /company/
    to: /about-us/
    status: 301
  - from: /about
    to: /about-us/
    status: 301
```

---

## Host cheat sheet

### Cloudflare Pages / Netlify

Use generated `public/_redirects`:

```text
/old-page/  /new-page/  301
```

### Vercel

Add `vercel.json` (can be generated later from the same YAML):

```json
{
  "redirects": [
    { "source": "/old-page/", "destination": "/new-page/", "permanent": true }
  ]
}
```

### nginx

```nginx
return 301 /new-page/;
# or
rewrite ^/old-page/?$ /new-page/ permanent;
```

### Apache

`.htaccess` `Redirect 301 /old-page/ /new-page/`

---

## Migrating from WordPress

1. Export redirects from **Rank Math** or **Redirection** plugin (CSV).
2. Convert rows into `src/data/redirects.yml`.
3. Run `npm run redirects:generate`.
4. Deploy and spot-check with `curl -I https://connectgroup.co/old-path` → expect `301` + `Location:`.

Also fill [inventory/urls.md](inventory/urls.md) “Redirects to preserve”.

---

## Trailing slashes

This project uses Astro `build.format: 'directory'` → URLs like `/about-us/`.

Match WordPress:

- If live site uses trailing slashes, redirect `/about-us` → `/about-us/`
- Configure the host “pretty URLs” / trailing slash setting the same way

---

## What not to do

- Don’t leave redirects only in WordPress after DNS cutover.
- Don’t use JS `window.location` for SEO redirects.
- Don’t 302 permanent slug changes (use **301**).

---

## Related

- [06-risks-and-seo.md](06-risks-and-seo.md)
- [08-seo-strategy.md](08-seo-strategy.md)
