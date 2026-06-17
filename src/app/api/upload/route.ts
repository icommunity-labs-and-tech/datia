import { NextRequest, NextResponse } from 'next/server';
import { uploadImageAction } from '@/actions/upload/uploadImage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const result = await uploadImageAction(formData);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ imageUrl: result.imageUrl });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
