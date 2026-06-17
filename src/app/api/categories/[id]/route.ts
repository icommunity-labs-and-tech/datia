import { NextRequest, NextResponse } from 'next/server';
import { getCategory } from '@/actions/categories';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await getCategory(id);
    
    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Categoría no encontrada' },
      { status: 404 }
    );
  }
}
