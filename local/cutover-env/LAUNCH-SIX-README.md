# Launch six — cutover package (Aug 2026)

Staged for Aaron / root on `178.105.150.67`.

## Domains

| Port | Domain | Unit | User |
|------|--------|------|------|
| 5084 | connecthr.ae | connecthr | site-connecthr |
| 5087 | connectfm.ae | connectfm | site-connectfm |
| 5088 | connectresources.sa | connectresources-sa | site-connectresources-sa |
| 5089 | iberiaeor.com | iberiaeor | site-iberiaeor |
| 5096 | connectfz.com | connectfz | site-connectfz |
| 5097 | royalvisa.ae | royalvisa | site-royalvisa |

## One command (root)

```bash
sudo bash /home/webdev/astro-cutover-env/ROOT-BOOTSTRAP-launch-six.sh
```

That will:

1. Rsync each `launch-six/<domain>/app/` → `/opt/Astro-production/<domain>/`
2. Create `site-*` users, install systemd units, install `.env` + `.env.prod`
3. Extend `site-ctl` ALLOWED with the six units
4. Kill interim nohup PIDs on 5084/5087/5088/5089/5096/5097
5. Install staged `Caddyfile.production` → `/etc/caddy/Caddyfile`, validate, reload
6. Enable/restart the six units + print loopback health

## After bootstrap

```bash
sudo site-ctl status connecthr connectfm connectresources-sa iberiaeor connectfz royalvisa
# Cloudflare: apex + www → 178.105.150.67, SSL = Full
# Then public smoke per docs/10-GO-LIVE-VERIFY-CHECKLIST.md
```

## Notes

- Royal Visa `PUBLIC_GTM_ID` is empty until marketing provides IDs.
- Do **not** wipe `.data/` if re-running (script preserves `.data/`).
- Env cleanup for staff/EOR/c-uae/kinza placeholders is a separate ask (existing nine).
