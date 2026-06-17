import { NextResponse } from 'next/server';
import { getBackupStatus } from '@/actions/dashboard';

export async function GET() {
  try {
    const backupData = await getBackupStatus();
    return NextResponse.json(backupData);
  } catch (error) {
    console.error('Error fetching backup status:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado de respaldos' },
      { status: 500 }
    );
  }
}
