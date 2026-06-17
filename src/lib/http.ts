import { getDynamicAppUrl } from './env';

export async function getBaseUrl(): Promise<string> {
  return getDynamicAppUrl();
}

export function toAbsoluteUrl(url: string, baseUrl: string): string {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${baseUrl}${url}`;
  return `${baseUrl}/${url}`;
}


