import { NextRequest, NextResponse } from 'next/server';
import { applyCertification } from '@/lib/energy/anchor-service';

/**
 * iBS calls here when an evidence lands on chain (`evidence.certified`).
 *
 * This is the normal path by which a state becomes proof: anchoring returns an
 * id in milliseconds and the transaction follows seconds later, so the platform
 * does not poll — iBS says when.
 *
 * The handler used to only flip `backed`, which left the emission the evidence
 * covers still pending and dropped the transaction hash. It now applies the same
 * certification the repair sweep does, so both paths leave identical state.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const evidenceID: string | undefined = body?.data?.evidence_id ?? body?.evidence_id;

    if (!evidenceID) {
      return NextResponse.json({ error: 'evidence_id missing' }, { status: 400 });
    }

    const applied = await applyCertification(evidenceID);

    // Acknowledge either way: an evidence this instance does not know about is
    // not a delivery failure, and a retry would not change the outcome.
    return NextResponse.json({ success: true, applied });
  } catch (e) {
    console.error('evidence webhook error', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
