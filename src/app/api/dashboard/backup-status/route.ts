import { NextResponse } from 'next/server';
import { requireSessionOrganization } from '@/lib/api/require-session';
import { getBackupStatus } from '@/actions/dashboard';

export async function GET() {
  const session = await requireSessionOrganization();
  if (session instanceof NextResponse) return session;

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
