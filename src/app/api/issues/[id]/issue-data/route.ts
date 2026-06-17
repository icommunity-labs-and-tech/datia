import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildIssueDataObject } from '@/lib/evidenceUtils';
import * as crypto from 'crypto';

export async function GET(_req: NextRequest, { params }: any) {
  const { id } = await params;
  const issue = await prisma.state.findUnique({
    where: { id },
    select: { id: true, title: true, description: true, createdAt: true, imageUrls: true, templateConfig: true, itemId: true, issueDataJson: true },
  });
  if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 });

  // If we have the exact stored bytes, return them verbatim; else rebuild
  let jsonBuffer: Buffer;
  if (issue.issueDataJson && issue.issueDataJson.length > 0) {
    jsonBuffer = Buffer.from(issue.issueDataJson, 'utf8');
  } else {
    const issueData = buildIssueDataObject({
      id: issue.id,
      itemId: issue.itemId,
      title: issue.title,
      description: issue.description,
      createdAt: issue.createdAt.toISOString(), // Convert Date to ISO string
      templateConfig: issue.templateConfig,
      imageUrls: (issue.imageUrls as string[]) || [],
    });
    const jsonString = JSON.stringify(issueData, null, 2);
    jsonBuffer = Buffer.from(jsonString, 'utf8');
  }
  
  // Minimal debug
  console.log('[issue-data] Buffer length:', jsonBuffer.length);

  return new NextResponse(new Uint8Array(jsonBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename=metadata_${issue.id}.json`,
      'Content-Length': jsonBuffer.length.toString(),
      'X-Checksum-SHA512-Base64': crypto.createHash('sha512').update(jsonBuffer).digest('base64'),
      'Cache-Control': 'no-cache',
    },
  });
}
