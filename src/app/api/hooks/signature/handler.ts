import { NextResponse } from 'next/server';
import { applySignatureVerification } from '@/lib/kyc/signature-verification';

/**
 * Shared by `/ok` (`signature.verification.success`) and `/ko`
 * (`signature.verification.failed`).
 *
 * Neither route trusts the body or which of the two was called: both take only
 * the signature id and apply whatever iBS says about it. They used to write the
 * status straight from the request, so anyone who knew an organization's
 * signature could mark it verified or rejected.
 */
export async function handleSignatureWebhook(req: Request) {
  try {
    const body = await req.json();
    const signatureID: string | undefined = body?.data?.signature_id ?? body?.signature_id;

    if (!signatureID) {
      return NextResponse.json({ error: 'signature_id missing' }, { status: 400 });
    }

    const applied = await applySignatureVerification(signatureID);
    return NextResponse.json({ success: true, applied });
  } catch (e) {
    console.error('signature webhook error', e);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
