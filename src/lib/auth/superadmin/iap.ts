import { createRemoteJWKSet, jwtVerify } from 'jose';

const IAP_ISSUER = 'https://cloud.google.com/iap';
const IAP_JWKS_URL = 'https://www.gstatic.com/iap/verify/public_key-jwk';

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  jwks ??= createRemoteJWKSet(new URL(IAP_JWKS_URL));
  return jwks;
}

/**
 * The email IAP already verified before this request ever reached the app —
 * or null if the assertion is missing, malformed, expired, or not actually
 * signed by Google IAP for this exact backend service.
 *
 * The audience ties the token to one specific IAP-protected resource
 * (`/projects/<number>/global/backendServices/<id>`); a JWT minted for a
 * different one is refused even if it is otherwise a genuine IAP assertion,
 * so this never trusts a header unless Google signed it for this backend.
 */
export async function verifiedIapEmail(assertion: string | null | undefined): Promise<string | null> {
  if (!assertion) return null;
  const audience = process.env.IAP_AUDIENCE;
  if (!audience) {
    console.error('[iap] IAP_AUDIENCE is not set — refusing to trust any assertion');
    return null;
  }

  try {
    const { payload } = await jwtVerify(assertion, getJwks(), { issuer: IAP_ISSUER, audience });
    // IAP's own claim is "google.com/iap" style; `email` carries the
    // verified identity, already stripped of the `accounts.google.com:`
    // prefix the older X-Goog-Authenticated-User-Email header used.
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}
