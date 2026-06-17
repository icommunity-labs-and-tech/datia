/**
 * Minimal environment helpers with lazy validation.
 * Avoids adding runtime dependencies while centralizing config.
 */

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
};

export function getAppUrl(): string {
  // Prefer environment variable
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }
  
  // Development fallback
  if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || '3000';
    return `http://localhost:${port}`;
  }
  
  // Production fallback - use Cloud Run default
  if (process.env.K_SERVICE) {
    const region = process.env.K_REVISION?.split('-')[0] || 'us-central1';
    const projectId = process.env.GOOGLE_CLOUD_PROJECT;
    const serviceName = process.env.K_SERVICE;
    
    if (projectId && serviceName) {
      return `https://${serviceName}-${projectId}.${region}.run.app`;
    }
  }
  
  throw new Error('NEXT_PUBLIC_APP_URL must be set in production or run on Cloud Run');
}

/**
 * Get the app URL dynamically from request headers when available,
 * falling back to getAppUrl() when headers are not accessible
 */
export async function getDynamicAppUrl(): Promise<string> {
  try {
    // Try to get URL from request headers first
    const { headers } = await import('next/headers');
    const hdrs = await headers();
    const host = hdrs.get('host');
    const protocol = hdrs.get('x-forwarded-proto') || 'https';
    
    if (host) {
      return `${protocol}://${host}`;
    }
  } catch {
    // Headers not available in this context, fall back to getAppUrl()
  }
  
  return getAppUrl();
}

export function getSmtpConfig(): SmtpConfig | null {
  // Email feature is currently disabled; keep the helper as a no-op to avoid breaking imports
  return null;
}
