/**
 * Types for Mailgun service
 */

export interface PasswordResetEmailData {
  recipientEmail: string;
  recipientName: string;
  appName: string;
  resetUrl: string;
  /** Minutes the link stays valid, said in the email. */
  expiresInMinutes: number;
  appUrl?: string;
  language?: 'es' | 'en';
}

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
