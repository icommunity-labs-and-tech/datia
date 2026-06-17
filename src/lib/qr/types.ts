/**
 * Types for QR export service
 */

export interface QrItemInput {
  id: string;
  name?: string | null;
  url: string;
}

export interface QrZipResult {
  filename: string;
  contentType: string;
  base64: string;
}
