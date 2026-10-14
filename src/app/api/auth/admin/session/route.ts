import { NextResponse } from 'next/server';
import { currentSuperAdmin } from '@/lib/auth/superadmin/identity';

/**
 * Who is signed in to the platform panel. In production this is entirely
 * IAP's own verified identity, not a cookie this route reads directly (#20
 * follow-up) — `currentSuperAdmin` is where that distinction lives.
 */
export async function GET() {
  try {
    const user = await currentSuperAdmin();
    return NextResponse.json({ user });
  } catch (error) {
    console.error('[superadmin/session] error:', error);
    return NextResponse.json({ user: null });
  }
}
