import type { DashboardRole, DashboardSession } from './session';

/** Hierarchy for lead-ops roles. `seo` is intentionally excluded — it is capability-scoped. */
const ROLE_ORDER: Exclude<DashboardRole, 'seo'>[] = ['viewer', 'developer', 'super_admin'];

export function hasDashboardRole(
  session: DashboardSession | null,
  minimumRole: Exclude<DashboardRole, 'seo'>,
): boolean {
  if (!session || session.role === 'seo') return false;
  return ROLE_ORDER.indexOf(session.role) >= ROLE_ORDER.indexOf(minimumRole);
}

/** SEO write access: dedicated SEO users and super admins. */
export function canManageSeo(session: DashboardSession | null): boolean {
  return Boolean(session && (session.role === 'seo' || session.role === 'super_admin'));
}

/** Redirects write access: SEO users and super admins. */
export function canManageRedirects(session: DashboardSession | null): boolean {
  return Boolean(session && (session.role === 'seo' || session.role === 'super_admin'));
}

export function isSeoOnlyRole(session: DashboardSession | null): boolean {
  return session?.role === 'seo';
}

export function requireCsrf(session: DashboardSession | null, providedToken: string | null): boolean {
  if (!session || !providedToken) return false;
  return session.csrf === providedToken;
}
