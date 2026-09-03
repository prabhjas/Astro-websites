import { createHash, createHmac } from 'node:crypto';

/**
 * Request signing for the Flow lead-intake API.
 *
 * Flow verifies an HMAC-SHA256 over a canonical string:
 *
 *   v1:<unix-seconds>:<METHOD>:<path with query>:<sha256 hex of the exact body>
 *
 * The digest is over the **bytes actually sent**. Serialise the envelope once,
 * sign that string, then hand the same string to fetch as the body — letting an
 * HTTP client re-encode between signing and sending is the one way this breaks,
 * and it fails as `signature_invalid` with nothing in the request looking wrong.
 */

export const FLOW_SIGNATURE_HEADER = 'X-Flow-Signature';
export const FLOW_TIMESTAMP_HEADER = 'X-Flow-Timestamp';
export const FLOW_SIGNATURE_VERSION = 'v1';

export type FlowSignedRequest = {
  /** Unix seconds, as sent in X-Flow-Timestamp. */
  timestamp: string;
  /** Header value, already prefixed: `v1=<hex>`. */
  signature: string;
  /** The canonical string that was signed. Kept for tests and failure diagnosis. */
  signedString: string;
  /** SHA-256 of the body, hex. */
  bodyDigest: string;
};

export function sha256Hex(body: string): string {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

/**
 * Build the canonical string. Exported so a test can assert its exact shape
 * rather than only asserting that two implementations agree with each other.
 */
export function buildFlowSignedString(
  timestamp: string,
  method: string,
  pathWithQuery: string,
  bodyDigest: string,
): string {
  return [FLOW_SIGNATURE_VERSION, timestamp, method.toUpperCase(), pathWithQuery, bodyDigest].join(':');
}

export function signFlowRequest(options: {
  secret: string;
  method: string;
  /** Path including any query string, without scheme or host. */
  pathWithQuery: string;
  /** The exact body string that will be sent. Empty string for GET. */
  body?: string;
  /** Unix seconds. Injectable so tests are deterministic. */
  nowSeconds?: number;
}): FlowSignedRequest {
  const { secret, method, pathWithQuery } = options;
  if (!secret) throw new TypeError('Flow signing secret is required');
  if (!pathWithQuery.startsWith('/')) {
    throw new TypeError('pathWithQuery must be a path, not an absolute URL');
  }

  const body = options.body ?? '';
  const timestamp = String(options.nowSeconds ?? Math.floor(Date.now() / 1000));
  const bodyDigest = sha256Hex(body);
  const signedString = buildFlowSignedString(timestamp, method, pathWithQuery, bodyDigest);
  const mac = createHmac('sha256', secret).update(signedString, 'utf8').digest('hex');

  return {
    timestamp,
    signature: `${FLOW_SIGNATURE_VERSION}=${mac}`,
    signedString,
    bodyDigest,
  };
}

/** Headers to merge into the outbound request. */
export function flowSigningHeaders(signed: FlowSignedRequest): Record<string, string> {
  return {
    [FLOW_TIMESTAMP_HEADER]: signed.timestamp,
    [FLOW_SIGNATURE_HEADER]: signed.signature,
  };
}
