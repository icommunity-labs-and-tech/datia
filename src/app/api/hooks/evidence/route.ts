import { NextRequest, NextResponse } from 'next/server';
import { applyCertification } from '@/lib/certification';

/**
 * iBS calls here when an evidence lands on chain (`evidence.certified`).
 *
 * This is the normal path by which a certification becomes proof: anchoring
 * returns an id in milliseconds and the transaction follows seconds later, so
 * the platform does not poll — iBS says when. Confirming it also verifies every
 * record the proof covers.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const evidenceId: string | undefined = body?.data?.evidence_id ?? body?.evidence_id;

    if (!evidenceId) {
      return NextResponse.json({ error: 'evidence_id missing' }, { status: 400 });
    }

    const applied = Boolean(await applyCertification(evidenceId));

    // Acknowledge either way: an evidence this instance does not know about is
    // not a delivery failure, and a retry would not change the outcome.
    return NextResponse.json({ success: true, applied });
  } catch (e) {
    console.error('evidence webhook error', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
