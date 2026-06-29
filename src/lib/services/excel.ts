import ExcelJS from 'exceljs';
import QRCode from 'qrcode';
import type { ExcelItemInput, ExcelResult } from '../excel/types';

export interface ExcelExportService {
  generateExcelWithQRCodes(items: ExcelItemInput[]): Promise<ExcelResult>;
}
import { getDynamicAppUrl } from '@/lib/env';

async function buildItemUrl(id: string): Promise<string> {
  const base = (await getDynamicAppUrl()).replace(/\/$/, '');
  return `${base}/customer/item/${encodeURIComponent(id)}`;
}

export function createExcelExportService(): ExcelExportService {
  return {
    async generateExcelWithQRCodes(items: ExcelItemInput[]): Promise<ExcelResult> {
      try {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Items');

        // Configurar columnas
        worksheet.columns = [
          { header: 'ID', key: 'id', width: 20 },
          { header: 'Nombre', key: 'name', width: 30 },
          { header: 'Descripción', key: 'description', width: 40 },
          { header: 'Categoría', key: 'categoryName', width: 20 },
          { header: 'QR', key: 'qr', width: 20 },
        ];

        // Estilo para el header
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        };
        headerRow.height = 20;

        // Procesar cada item
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const rowNumber = i + 2; // Fila 2 es la primera fila de datos (fila 1 es el header)
          const row = worksheet.addRow({
            id: item.id,
            name: item.name || '',
            description: item.description || '',
            categoryName: item.categoryName || '',
            qr: '', // La imagen se añade después
          });

          // Generar QR como buffer PNG
          const url = item.url || (await buildItemUrl(item.id));
          const qrBuffer = await QRCode.toBuffer(url, {
            type: 'png',
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 200, // Tamaño adecuado para Excel
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });

          // Añadir imagen al workbook
          const imageId = workbook.addImage({
            buffer: qrBuffer as any,
            extension: 'png',
          });

          // Ajustar altura de la fila para que el QR se vea bien
          row.height = 120;

          // Añadir la imagen a la columna E (índice 4, 0-indexed)
          // rowNumber es 1-indexed, así que rowNumber - 1 para el offset desde el header
          worksheet.addImage(imageId, {
            tl: { col: 4, row: rowNumber - 1 }, // col 4 = columna E (0-indexed)
            ext: { width: 120, height: 120 },
          });
        }

        // Generar buffer del Excel
        const buffer = await workbook.xlsx.writeBuffer();

        return {
          filename: 'items_con_qr.xlsx',
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          base64: Buffer.from(buffer).toString('base64'),
        };
      } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
  };
}

export const excelExportService = createExcelExportService();
