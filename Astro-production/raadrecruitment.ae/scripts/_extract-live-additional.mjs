import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const live = await (
  await fetch("/?nowprocket=1", { headers: { "User-Agent": "Mozilla/5.0" } })
).text();

// Prefer WP Additional CSS / customizer block containing stats
const styles = [...live.matchAll(/<style[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/style>|<style[^>]*>([\s\S]*?)<\/style>/gi)];
let extra = "";
for (const m of styles) {
  const id = m[1] || "";
  const body = m[2] || m[3] || "";
  if (/stats-number|stats-text|counter_suffix|wpa_|arrow_r|gradient_r/i.test(body) && body.length < 80000) {
    console.log("block", id || "(no id)", "len", body.length, "has stats", /stats-number/.test(body));
    if (/stats-number/.test(body) || /stats-text/.test(body)) {
      extra += `/* from live ${id || "style"} */\n` + body + "\n";
    }
  }
}

// If too big, extract only matching rules
if (extra.length > 30000) {
  const rules =
    extra.match(
      /[^{}]*\.(stats|counter|mycust|arrow_r|wpa)[^{}]*\{[^}]+\}/gi,
    ) || [];
  extra = rules.join("\n");
}

writeFileSync(join(ROOT, "public/css/live-additional-home.css"), extra);
console.log("wrote live-additional-home.css", extra.length);
console.log(extra.slice(0, 1500));
