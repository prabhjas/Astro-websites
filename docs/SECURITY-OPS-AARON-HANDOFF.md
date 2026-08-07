# Ops handoff — security audit P0 items we cannot finish in app code alone

Source: `Astro_Security_Audit_Report_2026-08-06.pdf`  
Companion: [SECURITY-AUDIT-REMEDIATION-2026-08-06.md](./SECURITY-AUDIT-REMEDIATION-2026-08-06.md)

These items need **server root / Cloudflare / git history rewrite**. Engineering prepared the app-side fixes locally; the table below is what “done” means and who can do it.

| ID | What we want | Why | Can we (webdev / Cursor) do it? | Who |
|----|--------------|-----|----------------------------------|-----|
| **P0-1 CA rotate** | Stop trusting the leaked Caddy local CA / origin keys; issue **new** certs on `178.105.150.67` | Private `.key` files were in git; anyone with history could forge trust | **No** — needs root on Astro host + Caddy reload | Aaron / root |
| **P0-1 History purge** | Remove key blobs from **all past commits** (`git filter-repo` / BFG) then force-push; everyone re-clones | Deleting files in a new commit does not erase history | **Prepare only** — running rewrite without a scheduled window breaks all clones | Aaron + repo admins |
| **P0-2 Unique secrets** | Each live site gets its own `INTERNAL_JOB_SECRET` (and Kinza `ENHANCED_RUN_SECRET`) in `.env.prod` | Shared secret = one leak opens many sites | **Partly** — we can generate values + SSH-update `.env.prod` if webdev can write them; must restart each unit; do **not** commit secrets | Engineering + Aaron if files are root-owned |
| **P0-4 Cloudflare-only origin** | Block public hits to origin IP; only Cloudflare (or Tunnel) reaches Node/Caddy | Direct IP bypasses CF WAF/SSL | **No** — host firewall / CF Tunnel / SSL mode is infra | Aaron / Cloudflare admin |
| **Caddy reload** | Install updated `caddy/Caddyfile.production` → `/etc/caddy/Caddyfile`, validate, reload | Headers, CSP-RO, cache rules live only after reload | **Partly** — we can SCP the file; `systemctl reload caddy` needs root/sudo | Aaron / root |
| **site-ctl + connectresourcesint** | Add unit to `site-ctl` ALLOWED list | Webdev cannot restart that site via site-ctl today | **No** without root allowlist edit | Aaron / root (ignore until you want that site managed) |

### Suggested owner sequence

1. Deploy app security batch (git push + rebuild/restart sites).  
2. Reload Caddy with new file (headers / CSP Report-Only / `/_astro` cache).  
3. Rotate per-site secrets + restart units.  
4. Firewall / CF Full (strict) or Tunnel.  
5. Schedule CA rotate + history purge window.

Engineering does **not** need to wait for (4)/(5) to ship app fixes, but the PDF checklist is incomplete until those land.
