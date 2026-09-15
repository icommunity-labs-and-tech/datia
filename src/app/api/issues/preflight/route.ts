import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '@/lib/storage';
import { MAX_EVIDENCE_BYTES } from '@/lib/evidenceUtils';
import { getDynamicAppUrl } from '@/lib/env';
import { requireOrganizationId, TenantContextNotFoundError } from '@/lib/auth/tenant';

const LIMIT_BYTES = MAX_EVIDENCE_BYTES;

async function getSizeFromUrl(url: string): Promise<number> {
  const storage = getStorage();
  // Ensure absolute URL (supports already-absolute URLs)
  const baseUrl = await getDynamicAppUrl();
  const absolute = /^https?:\/\//i.test(url) ? url : url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
  const n = await storage.getSize(absolute);
  return n ?? 0;
}

export async function POST(req: NextRequest) {
  // Only the dashboard asks for this estimate. Without a session anyone could make
  // the server send requests to URLs of their choosing.
  try {
    await requireOrganizationId();
  } catch (e) {
    if (e instanceof TenantContextNotFoundError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    throw e;
  }

  try {
    const { imageUrls = [], description = '' } = await req.json();
    const items: { url: string; bytes: number }[] = [];
    let total = Buffer.from(description, 'utf8').byteLength; // will be embedded into issue_data.json

    for (const u of imageUrls as string[]) {
      const bytes = await getSizeFromUrl(u);
      items.push({ url: u, bytes });
      total += bytes;
    }

    return NextResponse.json({
      limitBytes: LIMIT_BYTES,
      totalBytes: total,
      items,
      overLimit: total > LIMIT_BYTES,
    });
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
}


