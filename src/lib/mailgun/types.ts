/**
 * Types for Mailgun service
 */

export interface InvitationEmailData {
  recipientEmail: string;
  recipientName: string;
  organizationName: string;
  appName: string; // Nombre de la aplicación (ej: "Datia")
  activationToken: string;
  activationUrl: string;
  appUrl?: string; // URL base de la aplicación para recursos (logo, etc.)
  language?: 'es' | 'en'; // Idioma del email (default: 'es')
}

export interface VerificationEmailData {
  recipientEmail: string;
  recipientName?: string;
  itemName: string;
  itemId: string;
  verificationUrl: string;
  appName: string;
  appUrl?: string;
}
