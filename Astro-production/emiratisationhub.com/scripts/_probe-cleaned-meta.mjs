import {readFileSync} from "fs";
const html = readFileSync("Astro-production/emiratisationhub.com/src/legacy/recruitment-mistakes.cleaned.html","utf8");
for (const k of ["og:image","article:published_time","article:modified_time","og:title"]) {
  const m = html.match(new RegExp(`(?:property|name)="${k}"[^>]*content="([^"]+)"|content="([^"]+)"[^>]*(?:property|name)="${k}"`));
  console.log("cleaned", k, m?.[1]||m?.[2]||"MISSING");
}
