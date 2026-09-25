import type { AuthResult } from './shared/types';
import { authenticateUser, createAuthError } from './shared/utils';
import { signSuperAdminJWT } from './superadmin/jwt';
import { superadminAuthConfig } from './superadmin/config';
import { signOrganizationJWT } from './organization/jwt';
import { organizationAuthConfig } from './organization/config';

export interface PanelLoginResult extends AuthResult {
  /** Which session was issued, and so which cookie carries it. */
  kind?: 'superadmin' | 'organization';
  cookie?: { name: string; maxAge: number };
}

/**
 * Login of the panel that both platform and organization accounts use: the
 * password is checked once and the role decides which session is issued. Any
 * other role answers exactly like a wrong password, so the response does not
 * reveal that the password was good for an account that cannot come in here.
 */
export async function authenticatePanel(email: string, password: string): Promise<PanelLoginResult> {
  const user = await authenticateUser(email, password);
  if (!user) return createAuthError('Credenciales inválidas');

  const summary = { id: user.id, email: user.email, name: user.name, role: user.role };

  if (user.role === 'SUPER_ADMIN') {
    const token = await signSuperAdminJWT({ ...user, context: 'superadmin' });
    return {
      success: true,
      kind: 'superadmin',
      user: summary,
      token,
      cookie: { name: superadminAuthConfig.cookieName, maxAge: superadminAuthConfig.sessionDuration },
    };
  }

  // It operates an organization: without one there is nothing to operate.
  if (user.role === 'ORG_ADMIN' && user.organizationId) {
    const token = await signOrganizationJWT({ ...user, context: 'organization' });
    return {
      success: true,
      kind: 'organization',
      user: summary,
      token,
      cookie: { name: organizationAuthConfig.cookieName, maxAge: organizationAuthConfig.sessionDuration },
    };
  }

  return createAuthError('Credenciales inválidas');
}
