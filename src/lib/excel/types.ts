/**
 * Types for Excel export service
 */

export interface ExcelItemInput {
  id: string;
  name?: string | null;
  description?: string | null;
  categoryName?: string | null;
  url: string;
}

export interface ExcelResult {
  filename: string;
  contentType: string;
  base64: string;
}
