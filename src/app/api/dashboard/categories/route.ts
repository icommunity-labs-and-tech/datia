import { NextResponse } from 'next/server';
import { getCategoryDistribution } from '@/actions/dashboard';

export async function GET() {
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
