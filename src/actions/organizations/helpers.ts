/**
 * Helper functions for organization-related server actions
 */

import { mailgunService } from '@/lib/services/mailgun';
import { getDynamicAppUrl } from '@/lib/env';

export interface SendInvitationEmailParams {
  recipientEmail: string;
  recipientName: string;
  organizationName: string;
  activationToken: string;
  language?: 'es' | 'en';
}

/**
 * La URL de activación es la misma que lleva el email: quien llama la necesita
 * también cuando el envío falla, para ofrecerla a mano (ver `sendInvitationEmail`).
 */
export async function buildActivationUrl(activationToken: string): Promise<string> {
  const appUrl = await getDynamicAppUrl();
  return `${appUrl}/auth/activate?token=${activationToken}`;
}

/**
 * Envía un email de invitación usando Mailgun.
 * Lanza error si falla: quien llama decide si eso bloquea la operación o no.
 */
export async function sendInvitationEmail(params: SendInvitationEmailParams): Promise<void> {
  const { recipientEmail, recipientName, organizationName, activationToken, language = 'es' } = params;

  const appUrl = await getDynamicAppUrl();
  const activationUrl = await buildActivationUrl(activationToken);

  await mailgunService.sendInvitationEmail({
    recipientEmail,
    recipientName,
    organizationName,
    appName: 'Datia',
    activationToken,
    activationUrl,
    appUrl: appUrl,
    language,
  });
}

