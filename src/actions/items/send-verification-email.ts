'use server';

import { mailgunService } from '@/lib/services/mailgun';
import { getDynamicAppUrl } from '@/lib/env';
import { prisma } from '@/lib/prisma';

export interface SendVerificationEmailInput {
  itemId: string;
  recipientEmail: string;
  recipientName?: string;
}

export interface SendVerificationEmailResult {
  success: boolean;
  error?: string;
}

export async function sendVerificationEmail(
  input: SendVerificationEmailInput
): Promise<SendVerificationEmailResult> {
  try {
    // Validar email
    if (!input.recipientEmail || typeof input.recipientEmail !== 'string') {
      return {
        success: false,
        error: 'Email inválido',
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.recipientEmail.trim())) {
      return {
        success: false,
        error: 'Formato de email inválido',
      };
    }

    // Obtener el item
    const item = await prisma.item.findUnique({
      where: { id: input.itemId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!item) {
      return {
        success: false,
        error: 'Producto no encontrado',
      };
    }

    // Construir URL de verificación
    const appUrl = await getDynamicAppUrl();
    const verificationUrl = `${appUrl}/customer/verify/${encodeURIComponent(item.id)}`;

    // Enviar email
    await mailgunService.sendVerificationEmail({
      recipientEmail: input.recipientEmail.trim(),
      recipientName: input.recipientName?.trim(),
      itemName: item.name,
      itemId: item.id,
      verificationUrl,
      appName: 'certypass',
      appUrl,
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al enviar el email',
    };
  }
}
