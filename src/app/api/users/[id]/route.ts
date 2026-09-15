import { NextRequest, NextResponse } from 'next/server';
import { requireSessionOrganization } from '@/lib/api/require-session';
import { getUserById } from '@/actions/users';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSessionOrganization();
  if (session instanceof NextResponse) return session;

  try {
    const { id } = await params;
    const result = await getUserById(id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 404 }
      );
    }
    
    return NextResponse.json(result.user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Usuario no encontrado' },
      { status: 404 }
    );
  }
}
