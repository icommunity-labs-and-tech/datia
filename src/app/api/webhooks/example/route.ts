import { NextRequest, NextResponse } from 'next/server';
import { webhookService } from '@/lib/services/webhook';
import { savedEventsForTest } from './test-utils';

// Example webhook: updates a mock repository (for integration testing)
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const headers = Object.fromEntries(req.headers.entries());

    const schema = { parse: (x: any) => x }; // accept any for example
    const { event } = await webhookService.verifyAndParse({
      headers,
      rawBody,
      schema,
      secretEnv: 'WEBHOOK_EXAMPLE_SECRET',
      opts: { signatureHeader: 'x-signature', timestampHeader: 'x-timestamp' }
    });

    // idempotency by event.id if present
    if (event?.id) {
      await webhookService.ensureIdempotent(String(event.id));
    }

    // simulate persistence for example route
    savedEventsForTest.push(event);
    
    return NextResponse.json({ ok: true, event });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}


