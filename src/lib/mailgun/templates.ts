/**
 * Mailgun email templates
 */

// Traducciones para emails de invitación
const invitationTranslations = {
  es: {
    title: (appName: string) => `¡Bienvenido a ${appName}!`,
    greeting: (name: string) => `Hola <strong style="color: #1a1a1a;">${name}</strong>,`,
    invitedTo: (orgName: string, appName: string) =>
      `Has sido invitado a unirte a <strong style="color: #667eea;">${orgName}</strong> en ${appName}.`,
    activateButton: 'Activar mi cuenta',
    alternativeLink: 'Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:',
    footer: 'Este es un email automático, por favor no respondas a este mensaje.<br>Si tienes alguna pregunta, contacta con el administrador de tu organización.',
    // Text version
    textInvitedTo: (orgName: string, appName: string) =>
      `Has sido invitado a unirte a ${orgName} en ${appName}.`,
    textActivate: 'Para activar tu cuenta, visita el siguiente enlace:',
    textQuestion: 'Si tienes alguna pregunta, por favor contacta con el administrador de tu organización.',
    textSignature: (appName: string) => `Saludos,\nEl equipo de ${appName}`,
  },
  en: {
    title: (appName: string) => `Welcome to ${appName}!`,
    greeting: (name: string) => `Hello <strong style="color: #1a1a1a;">${name}</strong>,`,
    invitedTo: (orgName: string, appName: string) =>
      `You have been invited to join <strong style="color: #667eea;">${orgName}</strong> on ${appName}.`,
    activateButton: 'Activate my account',
    alternativeLink: 'If you cannot click the button, copy and paste this link in your browser:',
    footer: 'This is an automated email, please do not reply to this message.<br>If you have any questions, contact your organization administrator.',
    // Text version
    textInvitedTo: (orgName: string, appName: string) =>
      `You have been invited to join ${orgName} on ${appName}.`,
    textActivate: 'To activate your account, visit the following link:',
    textQuestion: 'If you have any questions, please contact your organization administrator.',
    textSignature: (appName: string) => `Best regards,\nThe ${appName} team`,
  },
};

export function generateInvitationEmailHTML(data: {
  recipientName: string;
  organizationName: string;
  appName: string;
  activationUrl: string;
  appUrl?: string;
  language?: 'es' | 'en';
}): string {
  const logoUrl = data.appUrl ? `${data.appUrl}/logo.webp` : '/logo.webp';
  const t = invitationTranslations[data.language || 'es'];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title(data.appName)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header con Logo -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <img src="${logoUrl}" alt="${data.appName}" style="max-width: 180px; height: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding: 40px 40px 30px;">
              <h1 style="margin: 0 0 20px; font-size: 28px; font-weight: 600; color: #1a1a1a; text-align: center;">
                ${t.title(data.appName)}
              </h1>

              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">
                ${t.greeting(data.recipientName)}
              </p>

              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #333333;">
                ${t.invitedTo(data.organizationName, data.appName)}
              </p>

              <!-- Botón CTA -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${data.activationUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      ${t.activateButton}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Link alternativo -->
              <p style="margin: 32px 0 0; font-size: 14px; line-height: 1.6; color: #666666; text-align: center;">
                ${t.alternativeLink}<br>
                <a href="${data.activationUrl}" style="color: #667eea; text-decoration: underline; word-break: break-all;">${data.activationUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #666666; text-align: center;">
                ${t.footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateInvitationEmailText(data: {
  recipientName: string;
  organizationName: string;
  appName: string;
  activationUrl: string;
  language?: 'es' | 'en';
}): string {
  const t = invitationTranslations[data.language || 'es'];
  const greeting = data.language === 'en' ? `Hello ${data.recipientName},` : `Hola ${data.recipientName},`;

  return `
${t.title(data.appName)}

${greeting}

${t.textInvitedTo(data.organizationName, data.appName)}

${t.textActivate}

${data.activationUrl}

${t.textQuestion}

${t.textSignature(data.appName)}
  `.trim();
}


// ── Recuperación de contraseña ───────────────────────────────────────────────

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const passwordResetTranslations = {
  es: {
    subject: (appName: string) => `Restablece tu contraseña de ${appName}`,
    title: 'Restablece tu contraseña',
    greeting: (name: string) => `Hola <strong style="color: #1a1a1a;">${name}</strong>,`,
    body: 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.',
    button: 'Elegir una contraseña nueva',
    expires: (minutes: number) => `El enlace es de un solo uso y caduca en ${minutes} minutos.`,
    ignore: 'Si no lo has pedido tú, ignora este correo: tu contraseña no cambia.',
    alternativeLink: 'Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:',
    footer: 'Este es un email automático, por favor no respondas a este mensaje.',
    textStart: 'Para elegir una contraseña nueva, visita el siguiente enlace:',
    textSignature: (appName: string) => `Saludos,\nEl equipo de ${appName}`,
  },
  en: {
    subject: (appName: string) => `Reset your ${appName} password`,
    title: 'Reset your password',
    greeting: (name: string) => `Hello <strong style="color: #1a1a1a;">${name}</strong>,`,
    body: 'We received a request to reset the password of your account.',
    button: 'Choose a new password',
    expires: (minutes: number) => `The link can be used once and expires in ${minutes} minutes.`,
    ignore: 'If you did not ask for this, ignore this email: your password does not change.',
    alternativeLink: 'If you cannot click the button, copy and paste this link in your browser:',
    footer: 'This is an automated email, please do not reply to this message.',
    textStart: 'To choose a new password, visit the following link:',
    textSignature: (appName: string) => `Best regards,\nThe ${appName} team`,
  },
};

export function passwordResetSubject(appName: string, language: 'es' | 'en' = 'es'): string {
  return passwordResetTranslations[language].subject(appName);
}

/** Names come from the user, so they are escaped before they reach the markup. */
export function generatePasswordResetEmailHTML(data: {
  recipientName: string;
  appName: string;
  resetUrl: string;
  expiresInMinutes: number;
  appUrl?: string;
  language?: 'es' | 'en';
}): string {
  const t = passwordResetTranslations[data.language || 'es'];
  const logoUrl = data.appUrl ? `${data.appUrl}/logo.webp` : '/logo.webp';
  const name = escapeHtml(data.recipientName);
  const url = escapeHtml(data.resetUrl);
  const app = escapeHtml(data.appName);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <img src="${logoUrl}" alt="${app}" style="max-width: 180px; height: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 40px 30px;">
              <h1 style="margin: 0 0 20px; font-size: 26px; font-weight: 600; color: #1a1a1a; text-align: center;">${t.title}</h1>
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">${t.greeting(name)}</p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">${t.body}</p>
              <p style="margin: 0 0 24px; text-align: center;">
                <a href="${url}" style="display: inline-block; padding: 14px 32px; background: #667eea; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">${t.button}</a>
              </p>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #555555;">${t.expires(data.expiresInMinutes)}</p>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #555555;">${t.ignore}</p>
              <p style="margin: 0 0 8px; font-size: 13px; color: #777777;">${t.alternativeLink}</p>
              <p style="margin: 0; font-size: 13px; word-break: break-all; color: #667eea;">${url}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px 30px; text-align: center; font-size: 12px; color: #999999;">${t.footer}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generatePasswordResetEmailText(data: {
  recipientName: string;
  appName: string;
  resetUrl: string;
  expiresInMinutes: number;
  language?: 'es' | 'en';
}): string {
  const t = passwordResetTranslations[data.language || 'es'];
  const plain = (html: string) => html.replace(/<[^>]+>/g, '');

  return [
    plain(t.greeting(data.recipientName)),
    '',
    t.body,
    '',
    t.textStart,
    data.resetUrl,
    '',
    t.expires(data.expiresInMinutes),
    t.ignore,
    '',
    t.textSignature(data.appName),
  ].join('\n');
}
