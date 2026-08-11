/**
 * WordPress admin-ajax shim for IZI filter-screen car details.
 * Live: POST /wp-admin/admin-ajax.php action=get_custom_posttype_data
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-IZI-AdminAjax': '1',
    },
  });
}

async function readActionAndPostId(request: Request): Promise<{ action: string; postId: string }> {
  const url = new URL(request.url);
  let action = url.searchParams.get('action') || '';
  let postId = url.searchParams.get('post_id') || '';

  if (request.method === 'POST') {
    const ctype = (request.headers.get('content-type') || '').toLowerCase();
    try {
      if (ctype.includes('application/json')) {
        const body = (await request.json()) as Record<string, unknown>;
        action = String(body.action || action || '');
        postId = String(body.post_id || body.postId || postId || '');
      } else {
        const text = await request.text();
        const params = new URLSearchParams(text);
        action = params.get('action') || action;
        postId = params.get('post_id') || postId;
      }
    } catch {
      /* ignore body parse errors */
    }
  }

  return { action, postId: String(postId || '').trim() };
}

function loadCarPayload(postId: string): unknown | null {
  const id = postId.replace(/[^\d]/g, '');
  if (!id) return null;
  const file = join(process.cwd(), 'src/data/cars', `${id}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/** @returns Response when handled; null to fall through. */
export async function handleAdminAjaxRequest(request: Request): Promise<Response | null> {
  const { action, postId } = await readActionAndPostId(request);

  if (action === 'get_custom_posttype_data') {
    const payload = loadCarPayload(postId);
    if (payload) return json(payload);
    return json({ success: false, data: 'Post not found.' }, 404);
  }

  // Unknown WP ajax actions → empty 400 (mirrors WP "0" style for missing)
  if (action) {
    return new Response('0', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-IZI-AdminAjax': '1' },
    });
  }

  return json({ success: false, data: 'Missing action.' }, 400);
}
