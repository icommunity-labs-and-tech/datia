import { NextRequest, NextResponse } from 'next/server';
import { requireSessionOrganization } from '@/lib/api/require-session';
import { searchAssets } from '@/actions/assets';

export async function GET(request: NextRequest) {
  const session = await requireSessionOrganization();
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    if (!q) {
      return NextResponse.json([]);
    }

    const assets = await searchAssets(q);
    return NextResponse.json(assets);
  } catch (error) {
    console.error('Error searching assets:', error);
    return NextResponse.json(
      { error: 'Error al buscar activos' },
      { status: 500 }
    );
  }
}


