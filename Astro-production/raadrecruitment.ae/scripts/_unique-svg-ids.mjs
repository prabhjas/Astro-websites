import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../public/wp-content/uploads/2023/05");
for (const f of readdirSync(dir).filter((x) => x.startsWith("icon-") && x.endsWith(".svg"))) {
  let s = readFileSync(join(dir, f), "utf8");
  const id = f.replace(/[^a-z0-9]/gi, "");
  s = s.replaceAll('id="g"', `id="${id}"`).replaceAll("url(#g)", `url(#${id})`);
  writeFileSync(join(dir, f), s);
  console.log("unique ids", f, id);
}
