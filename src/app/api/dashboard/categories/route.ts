import { NextResponse } from 'next/server';
import { requireSessionOrganization } from '@/lib/api/require-session';
import { getCategoryDistribution } from '@/actions/dashboard';

export async function GET() {
  const session = await requireSessionOrganization();
  if (session instanceof NextResponse) return session;

  try {
    const categoryData = await getCategoryDistribution();
    return NextResponse.json(categoryData);
  } catch (error) {
    console.error('Error fetching category distribution:', error);
    return NextResponse.json(
      { error: 'Error al obtener distribución por categorías' },
      { status: 500 }
    );
  }
}
