import { NextResponse } from 'next/server';
import { getBackupStatusByUser } from '@/actions/states';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = Number(searchParams.get('months'));
    const months = Number.isFinite(raw) && raw > 0 ? raw : 1; // Default to 1 month
    
    const backupStatusData = await getBackupStatusByUser(months);
    return NextResponse.json(backupStatusData);
  } catch (error) {
    console.error('Error fetching backup status by user:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de respaldo por usuario' },
      { status: 500 }
    );
  }
}
