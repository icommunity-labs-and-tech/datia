import type { InvitationEmailData, PasswordResetEmailData } from '../mailgun/types';
import { MailgunConfigError, MailgunHTTPError } from '../mailgun/errors';
import {
  generateInvitationEmailHTML,
  generateInvitationEmailText,
  generatePasswordResetEmailHTML,
  generatePasswordResetEmailText,
  passwordResetSubject,
} from '../mailgun/templates';

export interface MailgunService {
  sendInvitationEmail(data: InvitationEmailData): Promise<void>;
  sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void>;
}
import Mailgun from 'mailgun.js';
import FormData from 'form-data';

function getConfig() {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const fromEmail = process.env.MAILGUN_FROM_EMAIL || 'ibs@icommunity.io';
  const fromName = process.env.MAILGUN_FROM_NAME || 'Datia';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!apiKey) {
    throw new MailgunConfigError('MAILGUN_API_KEY is not configured');
  }
  if (!domain) {
    throw new MailgunConfigError('MAILGUN_DOMAIN is not configured');
  }

  return { apiKey, domain, fromEmail, fromName, appUrl };
}

async function sendEmail(
  domain: string,
  apiKey: string,
  fromEmail: string,
  fromName: string,
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const mailgun = new Mailgun(FormData);
  
  // Mailgun tiene dos regiones: US y EU
  // Por defecto usamos EU (api.eu.mailgun.net) ya que icommunity.io está en EU
  // Se puede sobrescribir con MAILGUN_URL si es necesario
  const mailgunUrl = process.env.MAILGUN_URL || 'https://api.eu.mailgun.net';
  
  const client = mailgun.client({ 
    username: 'api', 
    key: apiKey,
    url: mailgunUrl
  });

  try {
    await client.messages.create(domain, {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
      text,
    });
  } catch (error: any) {
    // Mailgun SDK throws errors with status property
    const status = error?.status || error?.statusCode || 500;
    const message = error?.message || String(error);
    const response = error?.response || error?.body || error;

    throw new MailgunHTTPError('sendInvitationEmail', `Mailgun API error ${status}: ${message}`, status, response);
  }
}

async function sendEmailWithRetry(
  domain: string,
  apiKey: string,
  fromEmail: string,
  fromName: string,
  to: string,
  subject: string,
  html: string,
  text: string,
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await sendEmail(domain, apiKey, fromEmail, fromName, to, subject, html, text);
      return; // Success
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // Exponential backoff: 200ms, 400ms, 800ms
      const delay = Math.pow(2, attempt) * 200;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Failed to send email');
}

export function createMailgunService(): MailgunService {
  return {
    async sendInvitationEmail(data: InvitationEmailData): Promise<void> {
      try {
        const config = getConfig();
        
        const html = generateInvitationEmailHTML({
          recipientName: data.recipientName,
          organizationName: data.organizationName,
          appName: data.appName,
          activationUrl: data.activationUrl,
          appUrl: data.appUrl,
          language: data.language,
        });

        const text = generateInvitationEmailText({
          recipientName: data.recipientName,
          organizationName: data.organizationName,
          appName: data.appName,
          activationUrl: data.activationUrl,
          language: data.language,
        });

        const subject = data.language === 'en'
          ? `Invitation to ${data.organizationName} on ${data.appName}`
          : `Invitación a ${data.organizationName} en ${data.appName}`;

        await sendEmailWithRetry(
          config.domain,
          config.apiKey,
          config.fromEmail,
          config.fromName,
          data.recipientEmail,
          subject,
          html,
          text
        );
      } catch (error) {
        if (error instanceof MailgunConfigError || error instanceof MailgunHTTPError) {
          throw error;
        }
        throw new MailgunHTTPError('sendInvitationEmail', `Unexpected error: ${error}`);
      }
    },

    async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
      try {
        const config = getConfig();
        const shared = {
          recipientName: data.recipientName,
          appName: data.appName,
          resetUrl: data.resetUrl,
          expiresInMinutes: data.expiresInMinutes,
          language: data.language,
        };

        await sendEmailWithRetry(
          config.domain,
          config.apiKey,
          config.fromEmail,
          config.fromName,
          data.recipientEmail,
          passwordResetSubject(data.appName, data.language),
          generatePasswordResetEmailHTML({ ...shared, appUrl: data.appUrl }),
          generatePasswordResetEmailText(shared)
        );
      } catch (error) {
        if (error instanceof MailgunConfigError || error instanceof MailgunHTTPError) {
          throw error;
        }
        throw new MailgunHTTPError('sendInvitationEmail', `Unexpected error: ${error}`);
      }
    },
  };
}

export const mailgunService = createMailgunService();
