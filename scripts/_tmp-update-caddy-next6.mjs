#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const caddyPath = join(root, "caddy/Caddyfile.production");
let text = readFileSync(caddyPath, "utf8");

const oldHosts =
  "http://www.connectbusinesscenter.com, http://www.movey.ae {";
const newHosts =
  "http://www.connectbusinesscenter.com, http://www.movey.ae, http://www.mbs-consultancy.com, http://www.connectzone.ae, http://www.emiratisationhub.com, http://www.alburaq.ae {";
if (!text.includes("http://www.emiratisationhub.com")) {
  if (!text.includes(oldHosts)) throw new Error("host list anchor missing");
  text = text.replace(oldHosts, newHosts);
}

const redirAnchor = `\t@movey host www.movey.ae
\tredir @movey https://movey.ae{uri} permanent
}`;
const redirExtra = `\t@movey host www.movey.ae
\tredir @movey https://movey.ae{uri} permanent

\t@mbs host www.mbs-consultancy.com
\tredir @mbs https://mbs-consultancy.com{uri} permanent

\t@connectzone host www.connectzone.ae
\tredir @connectzone https://connectzone.ae{uri} permanent

\t@emiratisationhub host www.emiratisationhub.com
\tredir @emiratisationhub https://emiratisationhub.com{uri} permanent

\t@alburaq host www.alburaq.ae
\tredir @alburaq https://alburaq.ae{uri} permanent
}`;
if (!text.includes("@emiratisationhub host")) {
  if (!text.includes(redirAnchor)) throw new Error("movey redir anchor missing");
  text = text.replace(redirAnchor, redirExtra);
}

function siteBlock(domain, unit, port) {
  return `
# ${domain} -> ${unit}.service (PORT ${port}) — git template only until owner cutover
${domain}, www.${domain} {
	tls internal
	encode zstd gzip

	@noncanonical host www.${domain}
	redir @noncanonical https://${domain}{uri} permanent

	reverse_proxy 127.0.0.1:${port}

	@static path_regexp static \\.(css|js|woff|woff2|webp|jpg|jpeg|png|gif|svg|ico|avif|ttf|otf)$
	header @static Cache-Control "public, max-age=31536000, immutable"
	header {
		-Server
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options nosniff
		X-Frame-Options SAMEORIGIN
		Referrer-Policy strict-origin-when-cross-origin
	}
	log {
		output file /var/log/caddy/${domain}-access.log {
			roll_size 100MiB
			roll_keep 14
		}
		format json
	}
}
`;
}

const sites = [
  ["mbs-consultancy.com", "mbs-consultancy", 5099],
  ["connectzone.ae", "connectzone", 5101],
  ["emiratisationhub.com", "emiratisationhub", 5107],
  ["alburaq.ae", "alburaq", 5120],
];

for (const [domain, unit, port] of sites) {
  const marker = `${domain}, www.${domain} {`;
  if (!text.includes(marker)) {
    text = `${text.trimEnd()}\n${siteBlock(domain, unit, port)}`;
  }
}

writeFileSync(caddyPath, text.endsWith("\n") ? text : `${text}\n`);
console.log("updated", caddyPath);

for (const [domain, , port] of sites) {
  const ok = text.includes(`reverse_proxy 127.0.0.1:${port}`);
  console.log(domain, ok ? "OK" : "MISSING", port);
}

function writeDeploySnippet(domain, unit, port) {
  const body = `# ${domain} -> 127.0.0.1:${port} (systemd: ${unit}.service)
#
# PRODUCTION STANDARD (single /etc/caddy/Caddyfile — see caddy/Caddyfile.production).
# This file is the site block to keep in sync with the live fleet Caddyfile.
#
# When deploying / adding this site on the server you MUST also:
#   1. Ensure the shared one-hop HTTP alt-host block lists http://www.${domain}
#      and redirects to https://${domain}{uri}
#   2. Match PUBLIC_SITE_URL=https://${domain}
#   3. Cloudflare SSL = Full (not Flexible / not Full strict with tls internal)
#   4. sudo -u caddy caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
#
# Local laptop: do NOT run this Caddy block — use fleet-local on :${port} only.
# Docs: docs/CONNECT-CADDY-DEPLOYMENT.md

${domain}, www.${domain} {
	tls internal
	encode zstd gzip

	@noncanonical host www.${domain}
	redir @noncanonical https://${domain}{uri} permanent

	reverse_proxy 127.0.0.1:${port}

	@static path_regexp static \\.(css|js|woff|woff2|webp|jpg|jpeg|png|gif|svg|ico|avif|ttf|otf)$
	header @static Cache-Control "public, max-age=31536000, immutable"
	header {
		-Server
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options nosniff
		X-Frame-Options SAMEORIGIN
		Referrer-Policy strict-origin-when-cross-origin
	}
	log {
		output file /var/log/caddy/${domain}-access.log {
			roll_size 100MiB
			roll_keep 14
		}
		format json
	}
}
`;
  const out = join(root, `Astro-production/${domain}/deploy/${domain}.caddy`);
  writeFileSync(out, body);
  console.log("deploy snippet", out);
}

writeDeploySnippet("mbs-consultancy.com", "mbs-consultancy", 5099);
writeDeploySnippet("connectzone.ae", "connectzone", 5101);
