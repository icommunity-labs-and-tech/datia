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
    const asset = await getAsset(id);
    
    return NextResponse.json(asset);
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { error: 'Activo no encontrado' },
      { status: 404 }
    );
  }
}
