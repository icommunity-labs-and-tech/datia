import { NextRequest, NextResponse } from 'next/server';
import { createFraudReport } from '@/actions/fraudReports/create-fraud-report';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { itemId, acquiredAt, latitude, longitude, locationName, comments, imageUrls } = body;

    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    const result = await createFraudReport({
      itemId,
      acquiredAt: typeof acquiredAt === 'string' ? acquiredAt : undefined,
      latitude: typeof latitude === 'number' ? latitude : undefined,
      longitude: typeof longitude === 'number' ? longitude : undefined,
      locationName: typeof locationName === 'string' ? locationName : undefined,
      comments: typeof comments === 'string' ? comments : undefined,
      imageUrls: Array.isArray(imageUrls) ? imageUrls.filter((u: unknown) => typeof u === 'string') : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ reportId: result.reportId }, { status: 201 });
  } catch (e) {
    console.error('[POST /api/customer/fraud-report] Error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
