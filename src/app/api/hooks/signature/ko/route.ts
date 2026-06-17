import { NextResponse } from 'next/server';
import { applySignatureStatusFromWebhook } from '@/lib/icommunity';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await applySignatureStatusFromWebhook('ko', body);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.log("webhook signature ko: ", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
} 