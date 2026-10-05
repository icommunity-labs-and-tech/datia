import { prisma } from "@/lib/prisma";
import type { TenantContext } from "@/lib/auth/tenant";
import { defaultCompanyId } from "@/lib/company";
import { sendInvitationEmail } from "./helpers";
import crypto from "crypto";
import { isDashboardRole, isOrganizationRole } from '@/lib/auth/roles';

export interface InviteUserInput {
  email: string;
  name: string;
  role: "ADMIN";
  phone?: string;
  /**
   * The company the account joins. Only the organization's own account may
   * choose it; anyone else invites into their own company.
   */
  companyId?: string;
  /** Language of the invitation email. */
  language?: 'es' | 'en';
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
 * Invita a un nuevo usuario a la organización, en nombre de `tenant`.
 *
 * El actor lo decide quien llama a partir de una sesión ya verificada: la del
 * dashboard (`inviteUser`) o la de la cuenta de la organización (acciones de
 * empresas). Nunca viene del cliente.
 */
export async function inviteAccount(
  tenant: Pick<TenantContext, "organizationId" | "companyId" | "userRole" | "userId">,
  input: InviteUserInput
): Promise<InviteUserResult> {
  try {
    // The value is typed, but it comes from a client: only a company account can
    // be invited from here, never a higher role.
    if (input.role !== "ADMIN") {
      throw new Error("Rol no válido");
    }

    // Solo ADMIN puede invitar
    if (!isDashboardRole(tenant.userRole) && !isOrganizationRole(tenant.userRole) && tenant.userRole !== "SUPER_ADMIN") {
      throw new Error("Solo administradores pueden invitar usuarios");
    }
    
    // Requerir organizationId
    if (!tenant.organizationId) {
      throw new Error("No se puede determinar la organización");
    }
    
    // El email es único en todo el sistema. Si la cuenta es de otra organización
    // no se revela: la respuesta es la misma que si la invitación se hubiera enviado.
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
      select: { organizationId: true },
    });

    if (existingUser?.organizationId === tenant.organizationId) {
      return {
        success: false,
        error: `El email "${input.email}" ya está registrado`,
      };
    }

    if (existingUser) {
      return { success: true };
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

    let companyId: string;
    if (input.companyId) {
      if (!isOrganizationRole(tenant.userRole)) {
        throw new Error("Solo la cuenta de la organización puede elegir la empresa");
      }
      // Scoped to the organization: a company id from another one matches nothing.
      const company = await prisma.company.findFirst({
        where: { id: input.companyId, organizationId: tenant.organizationId! },
        select: { id: true },
      });
      if (!company) throw new Error("Empresa no encontrada");
      companyId = company.id;
    } else {
      // The invited account joins the inviter's company.
      companyId = tenant.companyId ?? (await defaultCompanyId(tenant.organizationId!));
    }

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
        language: input.language,
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






