import { getServerEnv } from '../../env/server';
import { verifyPassword } from './session';

export function dashboardAuthEnabled(): boolean {
  const env = getServerEnv();
  return Boolean(env.dashboardSessionSecret && env.dashboardUsers.length);
}

export function authenticateDashboardUser(email: string, password: string) {
  const env = getServerEnv();
  const user = env.dashboardUsers.find((row) => row.email === email.trim().toLowerCase());
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return { email: user.email, role: user.role };
}
