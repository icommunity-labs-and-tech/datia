import { NextRequest, NextResponse } from 'next/server';
import { requireSessionOrganization } from '@/lib/api/require-session';
import { getAsset } from '@/actions/assets';
import { decodeUrlParam } from '@/lib/api/decode-param';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSessionOrganization();
  if (session instanceof NextResponse) return session;

  try {
    const { id: rawId } = await params;
    const id = decodeUrlParam(rawId);
    const item = await getAsset(id);
    
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Item no encontrado' },
      { status: 404 }
    );
  }
}
