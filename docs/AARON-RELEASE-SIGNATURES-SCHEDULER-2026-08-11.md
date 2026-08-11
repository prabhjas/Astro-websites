# Aaron — one new immutable release (signatures + Pipedrive scheduler)

**Date:** 2026-08-11  
**Do not run** `/home/webdev/staging/signatures/APPLY.sh` or `APPLY-NEXT6.sh`.  
**Do:** bake these files into a **new** immutable release (same way live 28 already run). Then CF-purge the URLs below.

Live Node only reads the attested release (`92d5bb1a2…` today). Copying into `/opt/Astro-production/` or mutating that release from staging will not stay clean.

Branch: `work/astro-sites` (git). Detail on the scheduler swap: [PIPEDRIVE-LINK-UPDATE-2026-08-11.md](PIPEDRIVE-LINK-UPDATE-2026-08-11.md).

---

## 1) Why one release (not APPLY.sh)

Two app changes must go live together:

| Change | Sites | Why a release |
|--------|-------|----------------|
| Email signature PNGs (last week + today) | connectfm, connectresources.sa, connecthr, connectfreelance, **+** kinzahr, c-uae, connecthr (new), spheavyrental | Static files must exist **inside** the release tree Node/`file_server` reads |
| Pipedrive scheduler swap | connectresources.ae, eormiddleast.com, peomiddleast.com | HTML/JSON already changed in git (232 files / 645 links). Needs **rebuild** of those three, then the new release |

Old: `…/scheduler/wODjrKiE/meeting-with-liam-doherty`  
New: `…/scheduler/lYRJ1mh0/meeting-with-connect-resources`

---

## 2) Signature PNGs to include (git paths → public URL)

### Last week (already in git / previously staged)

| Site | Public URL |
|------|------------|
| connectfm.ae | `https://connectfm.ae/wp-content/uploads/2025/02/CONNECT-FM-SIGNATURE-Sathiskumar.png` |
| connectresources.sa | `https://connectresources.sa/wp-content/uploads/2025/02/CONNECT-RESOURCES-SAUDI.png` |
| connecthr.ae | `https://connecthr.ae/wp-content/uploads/2024/10/CONNECT-HR-EMAIL-SIGNATURE-FALAK-scaled.jpg` |
| connectfreelance.ae | `https://connectfreelance.ae/wp-content/uploads/2025/03/CONNECT-FREELANCE-EMAIL-SIGNATURE-DALE-CARR.png` |
| | `…/2025/03/CONNECT-FREELANCE-EMAIL-SIGNATURE-WILSON-JAMES.png` (+ Jerryl / Naved in same folder) |
| | `…/2026/08/CONNECT-FREELANCE-EMAIL-SIGNATURE-JENITA-CAROLINE-MENEZES.png` |
| | `…/2026/08/CONNECT-FREELANCE-EMAIL-SIGNATURE-JOHANN-MAMADOR-MORALES.png` |
| | `…/2026/08/CONNECT-FREELANCE-EMAIL-SIGNATURE-RALPH-VINCENT-GONZAGA.png` |

### Today — four new (in git under `public/wp-content/uploads/2026/08/`)

| Site | File | Public URL |
|------|------|------------|
| kinzahr.com | `KINZA-HR-EMAIL-SIGNATURE-SHAIQA-TAHSEEN.png` | `https://kinzahr.com/wp-content/uploads/2026/08/KINZA-HR-EMAIL-SIGNATURE-SHAIQA-TAHSEEN.png` |
| c-uae.com | `C-UAE-EMAIL-SIGNATURE-NABEEL-ALTHAF.png` | `https://c-uae.com/wp-content/uploads/2026/08/C-UAE-EMAIL-SIGNATURE-NABEEL-ALTHAF.png` |
| connecthr.ae | `CONNECT-HR-EMAIL-SIGNATURE-SUBHATRISHA.png` | `https://connecthr.ae/wp-content/uploads/2026/08/CONNECT-HR-EMAIL-SIGNATURE-SUBHATRISHA.png` |
| spheavyrental.ae | `SP-HEAVY-EMAIL-SIGNATURE-NADEEM-KHAN.png` | `https://spheavyrental.ae/wp-content/uploads/2026/08/SP-HEAVY-EMAIL-SIGNATURE-NADEEM-KHAN.png` |

Repo paths:

```text
Astro-production/kinzahr.com/public/wp-content/uploads/2026/08/KINZA-HR-EMAIL-SIGNATURE-SHAIQA-TAHSEEN.png
Astro-production/c-uae.com/public/wp-content/uploads/2026/08/C-UAE-EMAIL-SIGNATURE-NABEEL-ALTHAF.png
Astro-production/connecthr.ae/public/wp-content/uploads/2026/08/CONNECT-HR-EMAIL-SIGNATURE-SUBHATRISHA.png
Astro-production/spheavyrental.ae/public/wp-content/uploads/2026/08/SP-HEAVY-EMAIL-SIGNATURE-NADEEM-KHAN.png
```

---

## 3) What we need from you (owner)

1. **New immutable release** from current `work/astro-sites` (after we push), including:
   - all signature PNGs above
   - rebuilt `connectresources` / `eormiddleast` / `peomiddleast` (scheduler)
2. Point the live 28 units at that release (your usual install — **not** `signatures/APPLY.sh`).
3. Cloudflare purge (or zone purge) for the signature URLs + any HTML that still has the old scheduler link cached.

### After cutover — loopback smoke

```bash
# new signatures (expect 200 on origin)
curl -sI -H 'Host: kinzahr.com' http://127.0.0.1:5091/wp-content/uploads/2026/08/KINZA-HR-EMAIL-SIGNATURE-SHAIQA-TAHSEEN.png | head -5
curl -sI -H 'Host: c-uae.com' http://127.0.0.1:5089/wp-content/uploads/2026/08/C-UAE-EMAIL-SIGNATURE-NABEEL-ALTHAF.png | head -5
curl -sI -H 'Host: connecthr.ae' http://127.0.0.1:5084/wp-content/uploads/2026/08/CONNECT-HR-EMAIL-SIGNATURE-SUBHATRISHA.png | head -5
curl -sI -H 'Host: spheavyrental.ae' http://127.0.0.1:5082/wp-content/uploads/2026/08/SP-HEAVY-EMAIL-SIGNATURE-NADEEM-KHAN.png | head -5

# scheduler (expect new slug, not wODjrKiE)
curl -sS -H 'Host: connectresources.ae' http://127.0.0.1:5086/schedule-a-call/ | grep -oE 'scheduler/[^"]+' | sort -u
```

Ports: confirm on host if a unit differs.

---

## 4) Not in this release

- Next-6 APPLY / Caddy reload
- nanoid / geo / CR memory bump (separate queue)
