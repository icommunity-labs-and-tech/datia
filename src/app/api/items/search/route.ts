import { NextRequest, NextResponse } from 'next/server';
import { searchItems } from '@/actions/items';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    if (!q) {
      return NextResponse.json([]);
    }

    const items = await searchItems(q);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error searching items:', error);
    return NextResponse.json(
      { error: 'Error al buscar items' },
      { status: 500 }
    );
  }
}


