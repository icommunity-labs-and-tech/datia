import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import JSZip from 'jszip';
import { buildIssueDataObject, detectImageExt } from '@/lib/evidenceUtils';
import { getDynamicAppUrl } from '@/lib/env';

export async function GET(_req: NextRequest, { params }: any) {
  const { id } = await params;
  const issue = await prisma.state.findUnique({
    where: { id },
    select: { id: true, title: true, description: true, createdAt: true, imageUrls: true, templateConfig: true, itemId: true },
  });
  if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });

  const zip = new JSZip();

  // JSON metadata
  const issueData = buildIssueDataObject({
    id: issue.id,
    itemId: issue.itemId,
    title: issue.title,
    description: issue.description,
    createdAt: issue.createdAt,
    templateConfig: issue.templateConfig,
    imageUrls: (issue.imageUrls as string[]) || [],
  });
  // Write JSON as UTF-8 bytes to preserve exact content (no BOM)
  const issueJsonBuffer = Buffer.from(JSON.stringify(issueData, null, 2), 'utf8');
  zip.file('issue_data.json', issueJsonBuffer, { binary: true, createFolders: false });

  // Resolve base URL for relative image paths
  const baseUrl = await getDynamicAppUrl();
  const toAbsoluteUrl = (url: string): string => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('/')) return `${baseUrl}${url}`;
    return `${baseUrl}/${url}`;
  };

  // Images
  const urls = ((issue.imageUrls as string[]) || []).filter(Boolean).map(toAbsoluteUrl);
  let index = 1;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      const ext = detectImageExt(ct);
      const buf = Buffer.from(await res.arrayBuffer());
      zip.file(`images/issue_image_${index}.${ext}`, buf);
      index++;
    } catch {}
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=issue_${issue.id}.zip`,
    },
  });
}


