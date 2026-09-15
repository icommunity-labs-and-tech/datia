import { NextRequest, NextResponse } from 'next/server';
import { requireSessionOrganization } from '@/lib/api/require-session';
import { getState } from '@/actions/states';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSessionOrganization();
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const state = await getState(id);
    
    return NextResponse.json(state);
  } catch (error) {
    console.error('Error fetching state:', error);
    return NextResponse.json(
      { error: 'Estado no encontrado' },
      { status: 404 }
    );
  }
}
