import { NextRequest, NextResponse } from 'next/server';
import { requireSessionOrganization } from '@/lib/api/require-session';
import { getItemsByCategory } from '@/actions/items';

export async function GET(request: NextRequest) {
  const session = await requireSessionOrganization();
  if (session instanceof NextResponse) return session;

  try {
    const { searchParams } = new URL(request.url);
    const categoryId = (searchParams.get('categoryId') || '').trim();
    if (!categoryId) {
      return NextResponse.json(
        { error: 'categoryId requerido' },
        { status: 400 }
      );
    }

    const items = await getItemsByCategory(categoryId);
    // Reducimos payload a lo necesario para el dropdown
    const minimal = items.map(i => ({
      id: i.id,
      name: i.name,
      description: i.description,
      imageUrl: i.imageUrl,
    }));
    return NextResponse.json(minimal);
  } catch (error) {
    console.error('Error fetching items by category:', error);
    return NextResponse.json(
      { error: 'Error al obtener items por categoría' },
      { status: 500 }
    );
  }
}


