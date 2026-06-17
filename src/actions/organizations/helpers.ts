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
 * Envía un email de invitación usando Mailgun
 * Lanza error si falla - debe ser parte de la transacción lógica
 */
export async function sendInvitationEmail(params: SendInvitationEmailParams): Promise<void> {
  const { recipientEmail, recipientName, organizationName, activationToken, language = 'es' } = params;

  // Construir URL de activación desde el host de la request
  const appUrl = await getDynamicAppUrl();
  const activationUrl = `${appUrl}/auth/activate?token=${activationToken}`;

  // Si falla el email, lanzar error para que se revierta la transacción
  await mailgunService.sendInvitationEmail({
    recipientEmail,
    recipientName,
    organizationName,
    appName: 'CertyPass',
    activationToken,
    activationUrl,
    appUrl: appUrl,
    language,
  });
}

