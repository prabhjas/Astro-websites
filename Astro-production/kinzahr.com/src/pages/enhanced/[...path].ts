import type { APIRoute } from 'astro';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

export const prerender = false;

function safePhpBasename(raw: string): string | null {
  const name = basename(String(raw || '').replace(/\\/g, '/'));
  if (!/^[a-zA-Z0-9._-]+\.php$/.test(name)) return null;
  return name;
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  return host === '127.0.0.1' || host === 'localhost' || host === '::1';
}

function authorised(request: Request, secret: string): boolean {
  const url = new URL(request.url);
  // Local manual hits (old WordPress workflow): no key needed on loopback.
  if (isLoopbackHost(url.hostname)) return true;
  if (!secret) return false;
  const key = url.searchParams.get('key') || request.headers.get('x-enhanced-key') || '';
  return key === secret;
}

function runPhp(scriptPath: string, env: NodeJS.ProcessEnv): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolvePromise) => {
    const child = spawn('php', [scriptPath], {
      env,
      cwd: process.cwd(),
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (err) => {
      resolvePromise({ code: 127, stdout, stderr: `${stderr}\n${err.message}`.trim() });
    });
    child.on('close', (code) => {
      resolvePromise({ code: code ?? 1, stdout, stderr });
    });
  });
}

/** Run a live Enhanced conversion PHP script (Pipedrive → Google Ads offline conversions). */
export const GET: APIRoute = async ({ params, request }) => {
  const secret =
    process.env.ENHANCED_RUN_SECRET?.trim() ||
    process.env.INTERNAL_JOB_SECRET?.trim() ||
    '';

  if (!authorised(request, secret)) {
    return new Response('Unauthorized', { status: 401, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const rawPath = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  const fileName = safePhpBasename(rawPath);
  if (!fileName) {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  const liveRoot = resolve(process.cwd(), process.env.INTERNAL_ENHANCED_LIVE_DIR?.trim() || '.data/enhanced-live');
  const trackedRoot = resolve(process.cwd(), 'enhanced');
  const livePath = join(liveRoot, fileName);
  const trackedPath = join(trackedRoot, fileName);
  const scriptPath = existsSync(livePath) ? livePath : trackedPath;

  if (
    !existsSync(scriptPath) ||
    (!scriptPath.startsWith(`${liveRoot}/`) &&
      scriptPath !== liveRoot &&
      !scriptPath.startsWith(`${trackedRoot}/`) &&
      scriptPath !== trackedRoot)
  ) {
    return new Response(`Enhanced script not found: ${fileName}`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const result = await runPhp(scriptPath, process.env);
  const body = [result.stdout, result.stderr ? `\n<!-- stderr -->\n${result.stderr}` : ''].join('');
  return new Response(body || '(no output)', {
    status: result.code === 0 ? 200 : 500,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
