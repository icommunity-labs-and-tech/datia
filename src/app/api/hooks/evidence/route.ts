import { NextRequest, NextResponse } from 'next/server';
import { applyEvidenceCertifiedWebhook } from '@/lib/icommunity';

// Webhook simplificado: llegarán solo eventos evidence.certified
// Body esperado según spec pública: body.data.evidence_id y body.data.certification_timestamp
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await applyEvidenceCertifiedWebhook(body);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('evidence webhook error', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}


