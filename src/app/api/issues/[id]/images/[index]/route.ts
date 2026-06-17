import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { detectImageExt } from '@/lib/evidenceUtils';
import { getDynamicAppUrl } from '@/lib/env';

export async function GET(_req: NextRequest, { params }: any) {
  const { id, index } = await params;
  const imageIndex = parseInt(index as string, 10);
  
  const issue = await prisma.state.findUnique({
    where: { id },
    select: { imageUrls: true },
  });
  if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });

  const imageUrls = (issue.imageUrls as string[]) || [];
  if (imageIndex < 1 || imageIndex > imageUrls.length) {
    return NextResponse.json({ error: 'Image index out of range' }, { status: 404 });
  }

  const imageUrl = imageUrls[imageIndex - 1];
  if (!imageUrl) {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }

  try {
    // Resolve base URL for relative image paths
    const baseUrl = await getDynamicAppUrl();
    const toAbsoluteUrl = (url: string): string => {
      if (!url) return url;
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      return `${baseUrl}/${url}`;
    };

    const absoluteUrl = toAbsoluteUrl(imageUrl);
    const res = await fetch(absoluteUrl);
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 404 });
    }

    const ct = res.headers.get('content-type') || '';
    const ext = detectImageExt(ct);
    const imageBuffer = Buffer.from(await res.arrayBuffer());

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': ct,
        'Content-Disposition': `attachment; filename=issue_image_${imageIndex}.${ext}`,
        'Content-Length': imageBuffer.length.toString(),
        'X-Checksum-SHA512-Base64': require('crypto').createHash('sha512').update(imageBuffer).digest('base64'),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}
