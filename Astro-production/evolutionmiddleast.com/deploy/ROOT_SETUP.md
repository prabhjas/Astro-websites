# Root / ops setup — evolutionmiddleast.com

App tree: `/opt/Astro-production/evolutionmiddleast.com`  
Unit name: `evolutionmiddleast` · PORT **5080**  
Fleet contract: `docs/CONNECT-ASTRO-FLEET-STANDARD.md` · execution: `docs/15-platform-work-plan.md`

Templates in this folder are the **target** Tier 1 shape. Applying them needs root and must be coordinated with the other three sites (same day for Caddy split / users).

## 1. Site unix user (Tier 1)

```bash
groupadd --system site-evolutionmiddleast
useradd --system --gid site-evolutionmiddleast --home-dir /opt/Astro-production/evolutionmiddleast.com \
  --shell /usr/sbin/nologin site-evolutionmiddleast
# Ownership so the service can read code + write .data (adjust as needed)
chown -R site-evolutionmiddleast:site-evolutionmiddleast /opt/Astro-production/evolutionmiddleast.com/.data
# .env.prod must be readable by the service user (mode 600, group or ACL as you prefer)
```

## 2. Install / upgrade systemd unit

```bash
cp /opt/Astro-production/evolutionmiddleast.com/deploy/evolutionmiddleast.service /etc/systemd/system/
systemctl daemon-reload
systemctl restart evolutionmiddleast
systemctl show evolutionmiddleast -p User,MemoryMax,ExecStart --no-pager
```

Confirm `User=site-evolutionmiddleast` and `MemoryMax=268435456` (256M). Smoke:

```bash
curl -sS http://127.0.0.1:5080/api/health
sudo site-ctl restart evolutionmiddleast   # if site-ctl still allowed for webdev
```

## 3. Caddy (prefer sites.d)

```bash
# After fleet Caddy split:
cp deploy/Caddyfile.snippet /etc/caddy/sites.d/evolutionmiddleast.com.caddy
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Ensure access log directory exists and is writable by caddy.

## 4. Env

- Edit `.env.prod` only: secrets, `INTERNAL_JOB_SECRET`, Pipedrive, paths.
- **Do not** put `HOST`/`PORT` in `.env.prod` (unit sets them).
- LF line endings only; `chmod 600`.

## Port map (fleet)

| Site | PORT |
|------|------|
| evolutionmiddleast | 5080 |
| cbss | 5081 |
| spheavyrental | 5082 |
| iberiaworkforce | confirm on host |
