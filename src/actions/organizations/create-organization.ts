"use server";

import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/auth/tenant";
import { sendInvitationEmail } from "./helpers";
import { icommunityService } from "@/infrastructure/icommunity/ICommunityServiceImpl";
import crypto from "crypto";

export interface CreateOrganizationInput {
  // Datos de la organización
  nombre: string;

  // Datos del primer administrador
  adminName: string;
  adminEmail: string;
  adminPhone?: string;

  // Idioma del email de invitación
  language?: 'es' | 'en';
}

/**
 * Genera un slug a partir del nombre
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9]+/g, '-') // Reemplazar caracteres especiales con guiones
    .replace(/^-+|-+$/g, ''); // Eliminar guiones al inicio/fin
}

/**
 * Genera un slug único verificando colisiones
 */
async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    // Si existe, añadir un sufijo numérico
    slug = `${baseSlug}-${counter}`;
    counter++;

    // Prevenir bucle infinito (muy improbable)
    if (counter > 100) {
      slug = `${baseSlug}-${Date.now()}`;
      break;
    }
  }

  return slug;
}

export interface CreateOrganizationResult {
  success: boolean;
  organization?: {
    id: string;
    nombre: string;
    slug: string;
  };
  admin?: {
    id: string;
    email: string;
    activationToken: string;
  };
  kycURL?: string | null;
  error?: string;
}

/**
 * Crea una nueva organización con su primer administrador
 * Solo accesible por SUPER_ADMIN
 */
export async function createOrganizationWithAdmin(
  input: CreateOrganizationInput
): Promise<CreateOrganizationResult> {
  try {
    // Verificar que sea SUPER_ADMIN
    const superAdmin = await isSuperAdmin();
    
    if (!superAdmin) {
      throw new Error("Solo SUPER_ADMIN puede crear organizaciones");
    }

    // Generar slug único automáticamente
    const slug = await generateUniqueSlug(input.nombre);

    // Validar que el email no exista
    const existingUser = await prisma.user.findUnique({
      where: { email: input.adminEmail },
    });
    
    if (existingUser) {
      return {
        success: false,
        error: `El email "${input.adminEmail}" ya está registrado`,
      };
    }
    
    // Generar token de activación
    const activationToken = crypto.randomBytes(32).toString("hex");
    const activationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
    
    // Crear firma en iCommunity para la organización con webhooks configurados
    let signatureID: string | null = null;
    let kycURL: string | null = null;
    try {
      // Obtener la URL base de la aplicación para los webhooks
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : process.env.APP_URL || 'http://localhost:3000';
      
      const okUrl = `${baseUrl}/api/hooks/signature/ok`;
      const koUrl = `${baseUrl}/api/hooks/signature/ko`;
      
      const signatureResult = await icommunityService.createSignature(input.nombre, okUrl, koUrl);
      signatureID = signatureResult.signature_id;
      kycURL = signatureResult.url || null;
    } catch (error) {
      console.error("Error creating signature for organization:", error);
      // Continuar sin firma - se puede crear después
    }
    
    // Crear organización y admin en una transacción
    // Si falla el email después, se eliminará todo
    const result = await prisma.$transaction(async (tx) => {
      // Crear organización con KYC
      const now = new Date();
      const organization = await tx.organization.create({
        data: {
          id: crypto.randomUUID(),
          nombre: input.nombre,
          slug: slug,
          activa: true,
          signatureID: signatureID,
          kycURL: kycURL,
          verificationStatus: signatureID ? 'WAITING' : 'NOT_VERIFIED',
          updatedAt: now,
        },
      });
      
      // Crear primer admin (PENDING, sin password aún)
      const admin = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: organization.id,
          email: input.adminEmail,
          name: input.adminName,
          phone: input.adminPhone,
          role: "ADMIN",
          status: "PENDING",
          password: null, // Se establecerá cuando active la cuenta
          activationToken,
          activationExpiresAt,
          updatedAt: now,
        },
      });
      
      return { organization, admin };
    });

    // Enviar email de activación al admin
    // Si falla, eliminar la organización y admin creados (rollback manual)
    try {
      await sendInvitationEmail({
        recipientEmail: result.admin.email,
        recipientName: input.adminName,
        organizationName: result.organization.nombre,
        activationToken,
        language: input.language,
      });
    } catch (emailError) {
      // Si falla el email, eliminar todo lo creado (rollback manual)
      await prisma.$transaction(async (tx) => {
        await tx.user.delete({ where: { id: result.admin.id } });
        await tx.organization.delete({ where: { id: result.organization.id } });
      });
      
      throw new Error(
        `Error al enviar el email de invitación: ${emailError instanceof Error ? emailError.message : 'Error desconocido'}. ` +
        `La organización no se ha creado. Por favor, verifica la configuración de Mailgun e intenta nuevamente.`
      );
    }
    
    return {
      success: true,
      organization: {
        id: result.organization.id,
        nombre: result.organization.nombre,
        slug: result.organization.slug,
      },
      admin: {
        id: result.admin.id,
        email: result.admin.email,
        activationToken: result.admin.activationToken!,
      },
      kycURL: kycURL,
    };
  } catch (error) {
    console.error("Error creating organization:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al crear la organización",
    };
  }
}


