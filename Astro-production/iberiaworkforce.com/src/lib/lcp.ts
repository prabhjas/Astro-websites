import { getImage } from "astro:assets";

/** Shared LCP preload URL for service / about heroes. */
export async function heroLcpSrc(image?: ImageMetadata) {
  if (!image) return undefined;
  const result = await getImage({ src: image, width: 1440, format: "webp" });
  return result.src;
}
