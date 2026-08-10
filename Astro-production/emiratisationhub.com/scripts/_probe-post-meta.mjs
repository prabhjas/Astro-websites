const html = await (await fetch("/recruitment-mistakes/")).text();
for (const k of ["og:image","article:published_time","article:modified_time","og:title"]) {
  const m = html.match(new RegExp(`(?:property|name)="${k}"[^>]*content="([^"]+)"|content="([^"]+)"[^>]*(?:property|name)="${k}"`));
  console.log(k, m?.[1]||m?.[2]||"MISSING");
}
const schema = html.match(/application\/ld\+json[^>]*>([\s\S]*?)<\/script>/);
if (schema) {
  try {
    const j = JSON.parse(schema[1]);
    const flat = Array.isArray(j) ? j : [j, ...(j["@graph"]||[])];
    for (const n of flat) {
      if (n["@type"]==="Article" || n["@type"]==="BlogPosting") {
        console.log("schema", {image:n.image, datePublished:n.datePublished, dateModified:n.dateModified});
      }
    }
  } catch(e){ console.log("schema parse fail", e.message); }
}
