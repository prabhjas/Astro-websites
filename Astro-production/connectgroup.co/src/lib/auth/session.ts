import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { getServerEnv } from '../../env/server';

export type DashboardRole = 'super_admin' | 'developer' | 'viewer' | 'seo';

export type DashboardSession = {
  email: string;
  role: DashboardRole;
  exp: number;
  csrf: string;
};

const SESSION_COOKIE = 'cg_dashboard_session';

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createPasswordHash(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, salt, hash] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

export function createDashboardSession(email: string, role: DashboardRole): string {
  const env = getServerEnv();
  if (!env.dashboardSessionSecret) throw new Error('Missing DASHBOARD_SESSION_SECRET');
  const payload: DashboardSession = {
    email,
    role,
    exp: Date.now() + env.dashboardSessionTtlMinutes * 60 * 1000,
    csrf: randomBytes(16).toString('hex'),
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded, env.dashboardSessionSecret)}`;
}

export function readDashboardSession(cookies: AstroCookies): DashboardSession | null {
  const env = getServerEnv();
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token || !env.dashboardSessionSecret) return null;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = sign(encoded, env.dashboardSessionSecret);
  if (signature !== expected) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as DashboardSession;
    if (!payload?.email || !payload?.role || !payload?.exp || !payload?.csrf) return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setDashboardSessionCookie(cookies: AstroCookies, token: string): void {
  cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: true,
    maxAge: getServerEnv().dashboardSessionTtlMinutes * 60,
  });
}

export function clearDashboardSessionCookie(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}
