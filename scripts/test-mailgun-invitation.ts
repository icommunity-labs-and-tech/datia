/**
 * Script de prueba para enviar email de invitación usando Mailgun
 * Uso: npx tsx scripts/test-mailgun-invitation.ts
 */

// Cargar variables de entorno desde .env si existe
import { config } from 'dotenv';
config();

import { mailgunService } from '../src/lib/services/mailgun';

// Configurar variables de entorno si no están definidas
if (!process.env.MAILGUN_API_KEY) {
  process.env.MAILGUN_API_KEY = 'fc97eb228d0246cd94daff9d3cc63759-826eddfb-affbba41';
}
if (!process.env.MAILGUN_DOMAIN) {
  process.env.MAILGUN_DOMAIN = 'icommunity.io';
}
if (!process.env.MAILGUN_FROM_EMAIL) {
  process.env.MAILGUN_FROM_EMAIL = 'ibs@icommunity.io';
}

const TEST_EMAIL = 'pcumpian1@gmail.com';
const TEST_NAME = 'Pablo Cumpian';
const TEST_ORG = 'iCommunity';
const TEST_TOKEN = 'test-token-' + Date.now();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : process.env.APP_URL || 'https://certypass.icommunitylabs.com';
const ACTIVATION_URL = `${APP_URL}/auth/activate?token=${TEST_TOKEN}`;

async function testInvitationEmail() {
  console.log('🚀 Enviando email de prueba de invitación...');
  console.log(`📧 Destinatario: ${TEST_EMAIL}`);
  console.log(`🔗 URL de activación: ${ACTIVATION_URL}`);
  console.log('');
  console.log('📋 Configuración:');
  console.log(`   MAILGUN_API_KEY: ${process.env.MAILGUN_API_KEY?.substring(0, 20)}...`);
  console.log(`   MAILGUN_DOMAIN: ${process.env.MAILGUN_DOMAIN}`);
  console.log(`   MAILGUN_FROM_EMAIL: ${process.env.MAILGUN_FROM_EMAIL}`);
  console.log('');

  try {
    await mailgunService.sendInvitationEmail({
      recipientEmail: TEST_EMAIL,
      recipientName: TEST_NAME,
      organizationName: TEST_ORG,
      appName: 'certypass',
      activationToken: TEST_TOKEN,
      activationUrl: ACTIVATION_URL,
      appUrl: APP_URL,
    });
    console.log('✅ Email enviado exitosamente!');
    console.log(`📬 Revisa la bandeja de entrada de ${TEST_EMAIL}`);
  } catch (error: any) {
    console.error('❌ Error al enviar email:');
    console.error(error);
    if (error._tag === 'MailgunConfigError') {
      console.error('\n💡 Asegúrate de tener configuradas las variables de entorno:');
      console.error('   - MAILGUN_API_KEY');
      console.error('   - MAILGUN_DOMAIN');
    }
    process.exit(1);
  }
}

testInvitationEmail();

