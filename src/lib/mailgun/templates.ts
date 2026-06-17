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

export function generateVerificationEmailHTML(data: {
  recipientName?: string;
  itemName: string;
  verificationUrl: string;
  appName: string;
  appUrl?: string;
}): string {
  const logoUrl = data.appUrl ? `${data.appUrl}/logo.webp` : '/logo.webp';
  const greeting = data.recipientName ? `Hola <strong style="color: #1a1a1a;">${data.recipientName}</strong>,` : 'Hola,';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación de Producto - ${data.appName}</title>
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
                Verificación de Producto
              </h1>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">
                ${greeting}
              </p>
              
              <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.6; color: #333333;">
                Te compartimos el enlace para verificar el producto <strong style="color: #667eea;">${data.itemName}</strong> en ${data.appName}.
              </p>
              
              <p style="margin: 0 0 32px; font-size: 16px; line-height: 1.6; color: #333333;">
                Al acceder a este enlace, se ejecutará automáticamente la verificación antifalsificación del producto.
              </p>
              
              <!-- Botón CTA -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${data.verificationUrl}" 
                       style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Verificar Producto
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Link alternativo -->
              <p style="margin: 32px 0 0; font-size: 14px; line-height: 1.6; color: #666666; text-align: center;">
                Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:<br>
                <a href="${data.verificationUrl}" style="color: #667eea; text-decoration: underline; word-break: break-all;">${data.verificationUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #666666; text-align: center;">
                Este es un email automático, por favor no respondas a este mensaje.<br>
                Si tienes alguna pregunta, contacta con el administrador de tu organización.
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

export function generateVerificationEmailText(data: {
  recipientName?: string;
  itemName: string;
  verificationUrl: string;
  appName: string;
}): string {
  const greeting = data.recipientName ? `Hola ${data.recipientName},` : 'Hola,';
  
  return `
Verificación de Producto - ${data.appName}

${greeting}

Te compartimos el enlace para verificar el producto "${data.itemName}" en ${data.appName}.

Al acceder a este enlace, se ejecutará automáticamente la verificación antifalsificación del producto.

Para verificar el producto, visita el siguiente enlace:

${data.verificationUrl}

Si tienes alguna pregunta, por favor contacta con el administrador de tu organización.

Saludos,
El equipo de ${data.appName}
  `.trim();
}
