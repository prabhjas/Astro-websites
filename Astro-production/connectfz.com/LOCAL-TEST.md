# connectfz.com — local test checklist

**Base URL (local):** http://127.0.0.1:5096/

Site is started with:

```bash
cd /path/to/Astro-websites
export PATH="$HOME/.local/node/bin:$PATH"
node scripts/fleet-local.mjs up connectfz
```

## Pages

| Page | URL |
|------|-----|
| Home | http://127.0.0.1:5096/ |
| About | http://127.0.0.1:5096/about-us/ |
| Contact | http://127.0.0.1:5096/contact/ |
| Insights | http://127.0.0.1:5096/insights/ |
| Free Zones | http://127.0.0.1:5096/free-zones/ |
| Search | http://127.0.0.1:5096/search/ |
| 404 sample | http://127.0.0.1:5096/this-should-404-fleet-test/ |

## Redirects

| From | Expect |
|------|--------|
| http://127.0.0.1:5096/home/ | 301 → `/` |
| http://127.0.0.1:5096/index.php/ | 301 → `/` |

## SEO

| File | URL |
|------|-----|
| robots | http://127.0.0.1:5096/robots.txt |
| sitemap index | http://127.0.0.1:5096/sitemap_index.xml |
| page sitemap | http://127.0.0.1:5096/page-sitemap.xml |
| llms | http://127.0.0.1:5096/llms.txt |
| llm alias | http://127.0.0.1:5096/llm.txt |

## APIs

| Check | URL / command |
|-------|----------------|
| Health | http://127.0.0.1:5096/api/health/ |
| Geo | http://127.0.0.1:5096/api/geo/ |
| Contact (valid) | see curl below |
| Contact (empty → 422) | `{}` JSON POST |
| Internal deny | `/api/internal/leads/` without bearer → 403 |
| Internal OK | Bearer `local-fleet-test-secret` → 200 |

```bash
# Valid contact
curl -sS -X POST 'http://127.0.0.1:5096/api/contact/' \
  -H 'content-type: application/json' -H 'origin: http://127.0.0.1:5096' \
  -d '{"name":"Test User","email":"test@example.com","phone":"+971500000000","message":"hello","website":""}'

# Attribution
curl -sS -X POST 'http://127.0.0.1:5096/api/contact/' \
  -H 'content-type: application/json' -H 'origin: http://127.0.0.1:5096' \
  -d '{"name":"Ads User","email":"ads@example.com","phone":"+971500000001","message":"ads","gclid":"test","campaignid":"1","device":"m","website":""}'

# Internal (leads)
curl -sS -H 'Authorization: Bearer local-fleet-test-secret' \
  'http://127.0.0.1:5096/api/internal/leads/?limit=1'
```

Fleet smoke: `node scripts/fleet-local.mjs smoke connectfz`

**Note:** Content is scaffold stubs until live WordPress is imported. Production cutover is Phase 09 (server) — see `docs/13-go-live-server-handoff.md`.
