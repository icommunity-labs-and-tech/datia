import JSZip from 'jszip';
import QRCode from 'qrcode';
import type { QrItemInput, QrZipResult } from '../qr/types';

export interface QrExportService {
  generateZipForItems(items: QrItemInput[]): Promise<QrZipResult>;
  generateVerifyZipForItems(items: QrItemInput[]): Promise<QrZipResult>;
}
import { getDynamicAppUrl } from '@/lib/env';

async function buildItemUrl(id: string): Promise<string> {
  const base = (await getDynamicAppUrl()).replace(/\/$/, '');
  return `${base}/customer/item/${encodeURIComponent(id)}`;
}

async function buildVerifyUrl(id: string): Promise<string> {
  const base = (await getDynamicAppUrl()).replace(/\/$/, '');
  return `${base}/customer/verify/${encodeURIComponent(id)}`;
}

export function createQrExportService(): QrExportService {
  return {
    async generateZipForItems(items: QrItemInput[]): Promise<QrZipResult> {
      try {
        const zip = new JSZip();

        for (const item of items) {
          const url = item.url || (await buildItemUrl(item.id));
          const pngBuffer = await QRCode.toBuffer(url, {
            type: 'png',
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 260,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });

          const safeName =
            (item.name || '')
              .toString()
              .trim()
              .replace(/[^a-zA-Z0-9_-]+/g, '_')
              .slice(0, 40) || 'item';

          const filename = `qr_item_${safeName}_${item.id}.png`;
          zip.file(filename, pngBuffer, { binary: true });
        }

        const zipBuffer = await zip.generateAsync({
          type: 'nodebuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });

        return {
          filename: 'items_qr.zip',
          contentType: 'application/zip',
          base64: zipBuffer.toString('base64'),
        };
      } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
      }
    },

    async generateVerifyZipForItems(items: QrItemInput[]): Promise<QrZipResult> {
      try {
        const zip = new JSZip();

        for (const item of items) {
          const url = await buildVerifyUrl(item.id);
          const pngBuffer = await QRCode.toBuffer(url, {
            type: 'png',
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 260,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });

          const safeName =
            (item.name || '')
              .toString()
              .trim()
              .replace(/[^a-zA-Z0-9_-]+/g, '_')
              .slice(0, 40) || 'item';

          const filename = `qr_verify_${safeName}_${item.id}.png`;
          zip.file(filename, pngBuffer, { binary: true });
        }

        const zipBuffer = await zip.generateAsync({
          type: 'nodebuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        });

        return {
          filename: 'items_verify_qr.zip',
          contentType: 'application/zip',
          base64: zipBuffer.toString('base64'),
        };
      } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
  };
}

export const qrExportService = createQrExportService();
