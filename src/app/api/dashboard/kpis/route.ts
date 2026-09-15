import { NextResponse } from 'next/server';
import { requireSessionOrganization } from '@/lib/api/require-session';
import { getDashboardKPIs } from '@/actions/dashboard';

export async function GET() {
  const session = await requireSessionOrganization();
  if (session instanceof NextResponse) return session;

  try {
    const kpis = await getDashboardKPIs();
    return NextResponse.json(kpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: 'Error al obtener KPIs' },
      { status: 500 }
    );
  }
}
