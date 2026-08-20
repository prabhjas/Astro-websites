import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "src", "data");
const POSTS_PATH = path.join(DATA_DIR, "posts.json");
const AUTHORS_PATH = path.join(DATA_DIR, "authors.json");
const SITE_PATH = path.join(DATA_DIR, "site.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeAuthorPath(slug) {
  return `/author/${slug}/`;
}

function getSchemaGraphs(post) {
  const graphs = [];
  if (post?.seo?.schema?.["@graph"] && Array.isArray(post.seo.schema["@graph"])) {
    graphs.push(post.seo.schema["@graph"]);
  }
  if (Array.isArray(post?.seo?.schemas)) {
    for (const schema of post.seo.schemas) {
      if (schema?.["@graph"] && Array.isArray(schema["@graph"])) {
        graphs.push(schema["@graph"]);
      }
    }
  }
  return graphs;
}

function parseSlugFromAuthorUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const marker = "/author/";
  const idx = raw.indexOf(marker);
  if (idx === -1) return "";
  const tail = raw.slice(idx + marker.length).replace(/^\/+|\/+$/g, "");
  return tail.split("/")[0] || "";
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

async function fetchUsersFromWp(siteOrigin) {
  const endpoint = `${siteOrigin.replace(/\/$/, "")}/wp-json/wp/v2/users?per_page=100&_fields=id,name,slug,description,avatar_urls,url,link`;
  try {
    const res = await fetch(endpoint);
    if (!res.ok) {
      return { users: [], error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      return { users: [], error: "Invalid users payload" };
    }
    return { users: data, error: "" };
  } catch (err) {
    return { users: [], error: err instanceof Error ? err.message : String(err) };
  }
}

function makeEmptyAuthor(id) {
  return {
    id,
    name: "",
    slug: "",
    path: "",
    description: "",
    avatar: "",
  };
}

function mergeAuthor(target, patch) {
  target.name = firstNonEmpty(target.name, patch.name);
  target.slug = firstNonEmpty(target.slug, patch.slug);
  target.description = firstNonEmpty(target.description, patch.description);
  target.avatar = firstNonEmpty(target.avatar, patch.avatar);
  if (!target.path && target.slug) {
    target.path = normalizeAuthorPath(target.slug);
  }
}

async function main() {
  const posts = readJson(POSTS_PATH);
  const site = readJson(SITE_PATH);
  const siteOrigin = site?.url || "https://emiratiguard.com";

  const { users, error } = await fetchUsersFromWp(siteOrigin);
  if (error) {
    console.warn(`[repair-authors] WP users API unavailable: ${error}`);
  } else {
    console.log(`[repair-authors] WP users API returned ${users.length} users`);
  }

  const byId = new Map();

  for (const user of users) {
    const id = Number(user?.id);
    if (!Number.isFinite(id)) continue;
    const slug = firstNonEmpty(user?.slug);
    byId.set(id, {
      id,
      name: firstNonEmpty(user?.name),
      slug,
      path: slug ? normalizeAuthorPath(slug) : "",
      description: firstNonEmpty(user?.description),
      avatar: firstNonEmpty(user?.avatar_urls?.["96"], user?.avatar_urls?.["48"], user?.avatar_urls?.["24"]),
    });
  }

  for (const post of posts) {
    const authorId = Number(post?.author);
    if (!Number.isFinite(authorId)) continue;
    if (!byId.has(authorId)) byId.set(authorId, makeEmptyAuthor(authorId));

    const current = byId.get(authorId);
    const graphs = getSchemaGraphs(post);
    for (const graph of graphs) {
      const articleNode = graph.find((n) => n?.["@type"] === "Article");
      const personNodes = graph.filter((n) => n?.["@type"] === "Person");

      const articleAuthor = articleNode?.author || {};
      const articleAuthorId = articleAuthor?.["@id"] || "";
      const byIdPerson =
        articleAuthorId && personNodes.find((p) => p?.["@id"] === articleAuthorId);
      const byUrlPerson =
        personNodes.find((p) => String(p?.url || "").includes("/author/"));
      const personNode = byIdPerson || byUrlPerson || personNodes[0] || {};

      const authorUrl = firstNonEmpty(personNode?.url);
      const inferredSlug = firstNonEmpty(
        parseSlugFromAuthorUrl(authorUrl),
        post?.authorSlug,
      );

      mergeAuthor(current, {
        name: firstNonEmpty(post?.authorName, articleAuthor?.name, personNode?.name),
        slug: inferredSlug,
        description: firstNonEmpty(personNode?.description),
        avatar: firstNonEmpty(
          personNode?.image?.url,
          personNode?.image?.contentUrl,
          personNode?.image?.["@id"],
        ),
      });
    }

    if (!current.slug) {
      const generated = slugify(current.name) || `author-${authorId}`;
      current.slug = generated;
      current.path = normalizeAuthorPath(generated);
    }
  }

  const authorEntries = [...byId.values()]
    .map((author) => {
      const slug = author.slug || slugify(author.name) || `author-${author.id}`;
      return {
        id: Number(author.id),
        name: firstNonEmpty(author.name) || `Author ${author.id}`,
        slug,
        path: normalizeAuthorPath(slug),
        description: firstNonEmpty(author.description),
        avatar: firstNonEmpty(author.avatar),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const authorById = new Map(authorEntries.map((a) => [a.id, a]));
  for (const post of posts) {
    const author = authorById.get(Number(post.author));
    if (!author) continue;
    post.authorName = author.name;
    post.authorSlug = author.slug;
  }

  writeJson(AUTHORS_PATH, authorEntries);
  writeJson(POSTS_PATH, posts);

  console.log(`[repair-authors] Wrote ${authorEntries.length} authors`);
  console.log(
    `[repair-authors] Backfilled authorName/authorSlug on ${posts.length} posts`,
  );
}

main().catch((err) => {
  console.error("[repair-authors] Failed:", err);
  process.exit(1);
});

