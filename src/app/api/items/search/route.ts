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

    const items = await searchAssets(q);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error searching items:', error);
    return NextResponse.json(
      { error: 'Error al buscar items' },
      { status: 500 }
    );
  }
}


