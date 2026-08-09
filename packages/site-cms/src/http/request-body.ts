export type LimitedRequestBody =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; reason: 'too_large' };

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body exceeds configured limit');
    this.name = 'RequestBodyTooLargeError';
  }
}

export function isRequestBodyTooLargeError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current instanceof Error; depth += 1) {
    if (current instanceof RequestBodyTooLargeError || current.name === 'RequestBodyTooLargeError') return true;
    current = (current as Error & { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Wrap a request with a counting stream so its eventual JSON/FormData parser
 * receives each chunk only once. This is preferable for large bodies where a
 * read-then-replay strategy would retain several full-size copies at once.
 */
export function requestWithLimitedBody(request: Request, maxBytes: number): Request {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new RangeError('maxBytes must be a non-negative safe integer');
  }

  const declaredLength = request.headers.get('content-length')?.trim();
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > maxBytes) {
    throw new RequestBodyTooLargeError();
  }
  if (!request.body) return new Request(request);

  let totalBytes = 0;
  const limitedBody = request.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) throw new RequestBodyTooLargeError();
      controller.enqueue(chunk);
    },
  }));

  return new Request(request, {
    body: limitedBody,
    // Undici requires this for a streaming request body; browsers ignore it.
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}

/**
 * Read a request body while enforcing the limit as chunks arrive. This avoids
 * buffering an untrusted body in full when Content-Length is missing or false.
 */
export async function readRequestBodyLimited(request: Request, maxBytes: number): Promise<LimitedRequestBody> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new RangeError('maxBytes must be a non-negative safe integer');
  }

  if (!request.body) return { ok: true, bytes: new Uint8Array() };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value?.byteLength) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('Request body exceeds configured limit').catch(() => undefined);
        return { ok: false, reason: 'too_large' };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}

/** Recreate a consumed request so existing JSON/FormData parsing is preserved. */
export function replayRequestWithBody(request: Request, bytes: Uint8Array): Request {
  const headers = new Headers(request.headers);
  headers.set('content-length', String(bytes.byteLength));
  const body =
    bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
      ? (bytes.buffer as ArrayBuffer)
      : (bytes.slice().buffer as ArrayBuffer);

  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : body,
  });
}
