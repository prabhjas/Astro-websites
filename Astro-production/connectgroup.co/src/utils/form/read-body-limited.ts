/** Read request body with a hard byte cap (audit: do not rely on Content-Length alone). */
export async function readRequestBodyLimited(
  request: Request,
  maxBytes: number,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; reason: 'too_large' }> {
  const buf = new Uint8Array(await request.arrayBuffer());
  if (buf.byteLength > maxBytes) return { ok: false, reason: 'too_large' };
  return { ok: true, bytes: buf };
}
