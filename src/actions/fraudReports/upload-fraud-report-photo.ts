'use server';

import { getStorage } from '@/lib/storage';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function uploadFraudReportPhoto(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const file = formData.get('photo') as File | null;

  if (!file || file.size === 0) return { error: 'No file provided' };
  if (!file.type.startsWith('image/')) return { error: 'File must be an image' };
  if (file.size > MAX_SIZE) return { error: 'File exceeds 10 MB limit' };

  try {
    const storage = getStorage();
    const result = await storage.saveImage(file, 'fraud-report');
    return { url: result.url };
  } catch (e) {
    console.error('[uploadFraudReportPhoto]', e);
    return { error: 'Upload failed' };
  }
}
