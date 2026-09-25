"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { defaultCompanyId } from "@/lib/company";
import { sendInvitationEmail } from "./helpers";
import crypto from "crypto";
import { isDashboardRole } from '@/lib/auth/roles';

export interface InviteUserInput {
  email: string;
  name: string;
  role: "ADMIN";
  phone?: string;
}

export interface InviteUserResult {
  success: boolean;
  invitation?: {
    id: string;
    email: string;
    token: string;
  };
  error?: string;
}

/**
 * Invita a un nuevo usuario a la organización
 * Solo accesible por ADMIN de la organización
 */
export async function inviteUser(
  input: InviteUserInput
): Promise<InviteUserResult> {
  try {
    // Obtener contexto del tenant
    const tenant = await getCurrentTenant();
    
    // Solo ADMIN puede invitar
    if (!isDashboardRole(tenant.userRole) && tenant.userRole !== "SUPER_ADMIN") {
      throw new Error("Solo administradores pueden invitar usuarios");
    }
    
    // Requerir organizationId
    if (!tenant.organizationId) {
      throw new Error("No se puede determinar la organización");
    }
    
    // Validar que el email no exista
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });
    
    if (existingUser) {
      return {
        success: false,
        error: `El email "${input.email}" ya está registrado`,
      };
    }
    
    // Validar que no haya una invitación pendiente
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email: input.email,
        organizationId: tenant.organizationId!,
        acceptedAt: null,
      },
    });
    
    if (existingInvitation) {
      return {
        success: false,
        error: `Ya existe una invitación pendiente para "${input.email}"`,
      };
    }
    
    // Generar token de activación
    const activationToken = crypto.randomBytes(32).toString("hex");
    const activationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días
    
    // Obtener nombre de la organización
    const organization = await prisma.organization.findUnique({
      where: { id: tenant.organizationId! },
      select: { name: true },
    });

    if (!organization) {
      return {
        success: false,
        error: "Organización no encontrada",
      };
    }

    // The invited account joins the inviter's company.
    const companyId = tenant.companyId ?? (await defaultCompanyId(tenant.organizationId!));

    // Crear usuario e invitación en una transacción
    // Si falla el email después, se eliminará todo
    const result = await prisma.$transaction(async (tx) => {
      // Crear usuario PENDING
      const now = new Date();
      const user = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: tenant.organizationId!,
          companyId,
          email: input.email,
          name: input.name,
          phone: input.phone,
          role: input.role,
          status: "PENDING",
          password: null,
          activationToken,
          activationExpiresAt,
          updatedAt: now,
        },
      });
      
      // Crear registro de invitación
      const invitation = await tx.invitation.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: tenant.organizationId!,
          email: input.email,
          role: input.role,
          token: activationToken,
          expiresAt: activationExpiresAt,
          createdBy: tenant.userId,
        },
      });
      
      return { user, invitation };
    });

    // Enviar email de invitación
    // Si falla, eliminar el usuario y la invitación creados (rollback manual)
    try {
      await sendInvitationEmail({
        recipientEmail: result.user.email,
        recipientName: input.name,
        organizationName: organization.name,
        activationToken,
      });
    } catch (emailError) {
      // Si falla el email, eliminar todo lo creado (rollback manual)
      await prisma.$transaction(async (tx) => {
        await tx.invitation.delete({ where: { id: result.invitation.id } });
        await tx.user.delete({ where: { id: result.user.id } });
      });
      
      throw new Error(
        `Error al enviar el email de invitación: ${emailError instanceof Error ? emailError.message : 'Error desconocido'}. ` +
        `La invitación no se ha creado. Por favor, verifica la configuración de Mailgun e intenta nuevamente.`
      );
    }
    
    return {
      success: true,
      invitation: {
        id: result.invitation.id,
        email: result.invitation.email,
        token: result.invitation.token,
      },
    };
  } catch (error) {
    console.error("Error inviting user:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al invitar usuario",
    };
  }
}






