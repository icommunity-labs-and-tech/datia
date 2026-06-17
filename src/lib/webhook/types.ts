/**
 * Types for webhook service
 */

export type VerifyOptions = {
  signatureHeader: string; // header name e.g. X-Signature
  timestampHeader: string; // header name e.g. X-Timestamp
  maxSkewMs?: number; // default 5 min
};
