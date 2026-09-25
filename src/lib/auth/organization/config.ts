import { superadminAuthConfig } from '../superadmin/config';

/**
 * The session of the account that operates an organization (#20).
 *
 * It is its own session, with its own cookie, issuer and audience, and the
 * superadmin verifier refuses it: a token of one kind never opens the other's
 * panel or its platform-wide actions. It shares the superadmin panel's secret,
 * which production already sets, rather than asking for a new one.
 */
export const organizationAuthConfig = {
  cookieName: 'organization-auth-token',
  get jwtSecret() { return superadminAuthConfig.jwtSecret; },
  sessionDuration: 60 * 60 * 8, // 8 horas
} as const;

export const ORGANIZATION_REQUIRED_ROLE = 'ORG_ADMIN' as const;
