import { NextRequest, NextResponse } from 'next/server';
import { getItem } from '@/actions/items';
import { decodeUrlParam } from '@/lib/api/decode-param';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = decodeUrlParam(rawId);
    const item = await getItem(id);
    
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Item no encontrado' },
      { status: 404 }
    );
  }
}
