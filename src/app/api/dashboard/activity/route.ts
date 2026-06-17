import { NextResponse } from 'next/server';
import { getMonthlyActivity } from '@/actions/dashboard';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '12');
    
    const activityData = await getMonthlyActivity(months);
    return NextResponse.json(activityData);
  } catch (error) {
    console.error('Error fetching activity data:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de actividad' },
      { status: 500 }
    );
  }
}
