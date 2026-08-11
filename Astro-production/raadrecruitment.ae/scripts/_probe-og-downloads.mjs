import fs from "node:fs";
import path from "node:path";

const urls = [
  "https://raadrecruitment.ae/wp-content/uploads/2025/09/Purpose-and-Vision-Behind-the-Fazaa-Program-visual-selection-1-300x247.webp",
  "https://raadrecruitment.ae/wp-content/uploads/2025/09/Purpose-and-Vision-Behind-the-Fazaa-Program-visual-selection-1.webp",
  "https://raadrecruitment.ae/wp-content/uploads/2024/08/Understanding-Employee-Benefits-in-the-UAE-visual-selection-1-300x292.webp",
  "https://raadrecruitment.ae/wp-content/uploads/2024/08/Understanding-Employee-Benefits-in-the-UAE-visual-selection-1.webp",
  "https://raadrecruitment.ae/wp-content/uploads/2024/03/Leave-Emergency-768x432-1.webp",
  "https://raadrecruitment.ae/wp-content/uploads/2024/03/Leave-Emergency.webp",
];

function kind(buf) {
  const hex = buf.subarray(0, 12).toString("hex");
  const head = buf.subarray(0, 64).toString("utf8").toLowerCase();
  if (head.includes("<!doctype") || head.includes("<html")) return "html";
  if (hex.startsWith("ffd8")) return "jpeg";
  if (hex.startsWith("89504e47")) return "png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  return "other:" + hex;
}

for (const url of urls) {
  const r = await fetch(url, { headers: { "user-agent": "raad-check", accept: "image/*,*/*" } });
  const buf = Buffer.from(await r.arrayBuffer());
  console.log(r.status, kind(buf), buf.length, url.split("/").pop());
}

// Also try media search
for (const q of ["Fazaa Card", "Fazaa Program", "Employee Benefits UAE", "Emergency Leave"]) {
  const r = await fetch(
    "https://raadrecruitment.ae/wp-json/wp/v2/media?search=" + encodeURIComponent(q) + "&per_page=5",
  );
  const j = await r.json();
  console.log(
    "search",
    q,
    j.map((m) => ({ id: m.id, src: m.source_url?.split("/").pop(), mime: m.mime_type })),
  );
}
