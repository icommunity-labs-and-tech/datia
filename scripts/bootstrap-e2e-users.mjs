import { randomUUID, createHash } from 'node:crypto';
import { PrismaClient } from '../src/generated/prisma-e2e/index.js';
import bcrypt from 'bcryptjs';
import { companyIdFor } from './lib/company.mjs';

const prisma = new PrismaClient();

const ORG_SLUG = 'datia-e2e';

const ISOLATED_ORG_SLUG = 'aislada-e2e';
const ISOLATED_ASSET_ID = 'e2e-isolated-item';
const DATIA_ORG_TOKEN = 'e2e-datia-org-token-do-not-use-in-prod';
const ISOLATED_ORG_TOKEN = 'e2e-isolated-org-token-do-not-use-in-prod';

const RESET_EMAIL = 'reset-e2e@datia.icommunitylabs.com';
const RESET_TOKEN = 'e2e-reset-token-known-value';

const INVITED_EMAIL = 'invited-e2e@datia.icommunitylabs.com';
const INVITATION_TOKEN = 'e2e-activation-token-known-value';

const USERS = [
  { email: 'admin@datia.icommunitylabs.com', password: 'admin123', name: 'Admin E2E', role: 'ADMIN' },
  // The account that operates the organization: no company, sees all of them (#20).
  { email: 'orgadmin@datia.icommunitylabs.com', password: 'orgadmin123', name: 'Org Admin E2E', role: 'ORG_ADMIN', organizationScope: true },
  { email: 'superadmin@datia.icommunitylabs.com', password: 'superadmin123', name: 'Super Admin E2E', role: 'SUPER_ADMIN' },
];

/** Demo assets so galleries and KPIs are not empty during e2e runs. */
const ITEMS = [
  'Turbina eólica T-100',
  'Panel solar PS-220',
  'Batería BESS-40',
  'Inversor INV-12',
];

async function bootstrapE2EUsers() {
  try {
    console.log('🔧 Seeding E2E data in SQLite...\n');
    const now = new Date();

    const org =
      (await prisma.organization.findUnique({ where: { slug: ORG_SLUG } })) ??
      (await prisma.organization.create({
        data: {
          id: randomUUID(),
          name: 'Datia E2E',
          slug: ORG_SLUG,
          verificationStatus: 'VERIFIED',
          updatedAt: now,
        },
      }));
    console.log(`✅ Organization: ${org.name} (${org.slug})`);
    const companyId = await companyIdFor(prisma, org.id);

    for (const { email, password, name, role, organizationScope } of USERS) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        console.log(`⚠️  User already exists: ${email}`);
        continue;
      }
      await prisma.user.create({
        data: {
          id: randomUUID(),
          email,
          password: await bcrypt.hash(password, 10),
          name,
          role,
          status: 'ACTIVE',
          organizationId: org.id,
          companyId: organizationScope ? null : companyId,
          updatedAt: now,
        },
      });
      console.log(`✅ Created ${role}: ${email} / ${password}`);
    }

    // An account with a recovery link already outstanding, so the e2e can walk the
    // reset flow (#36). The link is stored hashed, like the app does.
    const resetUser = await prisma.user.findUnique({ where: { email: RESET_EMAIL } });
    if (!resetUser) {
      const created = await prisma.user.create({
        data: {
          id: randomUUID(),
          email: RESET_EMAIL,
          password: await bcrypt.hash('antigua-123', 10),
          name: 'Reset E2E',
          role: 'ADMIN',
          status: 'ACTIVE',
          organizationId: org.id,
          companyId,
          updatedAt: now,
        },
      });
      await prisma.passwordResetToken.create({
        data: {
          id: randomUUID(),
          userId: created.id,
          tokenHash: createHash('sha256').update(RESET_TOKEN).digest('hex'),
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        },
      });
      console.log(`✅ Created ${RESET_EMAIL} with a recovery link`);
    }

    // A pending invitation already issued, so the e2e can walk the activation
    // flow (#38) without sending a real email — Mailgun isn't configured here,
    // and inviteAccount rolls back the whole invitation if the send fails.
    // Not the first admin of the company (admin@datia already is), so this
    // one gets the plain password-only activation form, not the KYC wizard.
    const invitedUser = await prisma.user.findUnique({ where: { email: INVITED_EMAIL } });
    if (!invitedUser) {
      await prisma.user.create({
        data: {
          id: randomUUID(),
          email: INVITED_EMAIL,
          password: null,
          name: 'Invited E2E',
          role: 'ADMIN',
          status: 'PENDING',
          organizationId: org.id,
          companyId,
          activationToken: INVITATION_TOKEN,
          activationExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          updatedAt: now,
        },
      });
      console.log(`✅ Created ${INVITED_EMAIL} with a pending activation link`);
    }

    for (const [index, name] of ITEMS.entries()) {
      const id = `e2e-item-${index}`;
      if (await prisma.asset.findUnique({ where: { id } })) continue;
      await prisma.asset.create({
        data: {
          id,
          name,
          description: 'Activo de demostración para pruebas end-to-end.',
          organizationId: org.id,
          companyId,
          updatedAt: now,
          // Posición en columnas propias desde #37; el mapa lee de aquí.
          latitude: 41.31 + index * 0.004,
          longitude: -1.55 + index * 0.004,
        },
      });
    }
    console.log(`✅ ${ITEMS.length} demo assets ready`);

    // Energy certification for the first asset, so the public report has
    // something to render in e2e runs.
    const sourceId = 'e2e-source-solar';
    if (!(await prisma.energySource.findUnique({ where: { id: sourceId } }))) {
      await prisma.energySource.create({
        data: {
          id: sourceId,
          assetId: 'e2e-item-0',
          name: 'Planta solar Ariza',
          energyCarrier: 'SOLAR_THERMAL',
          generationTechnology: 'photovoltaic',
          capacityKw: 2400,
          renewableShare: 92,
          countryOfOrigin: 'ES',
          guaranteeOfOriginId: 'GO-2026-0042',
          gridEmissionFactor: 0.158,
          updatedAt: now,
        },
      });

      for (let month = 0; month < 6; month++) {
        const kwh = 18000 + month * 2600;
        const consumption = await prisma.energyConsumption.create({
          data: {
            id: `e2e-consumption-${month}`,
            energySourceId: sourceId,
            periodStart: new Date(2026, month, 1),
            periodEnd: new Date(2026, month + 1, 0),
            consumptionKwh: kwh,
            lifecycleStage: 'USE',
            measurementStandard: 'IEC 61724',
          },
        });
        await prisma.emissionRecord.create({
          data: {
            id: `e2e-emission-${month}`,
            energyConsumptionId: consumption.id,
            co2eKg: (kwh * 0.158) / 10,
            scope: month % 2 ? 'SCOPE_2' : 'SCOPE_3',
            systemBoundary: 'CRADLE_TO_GATE',
            emissionFactor: 0.158,
            emissionFactorSource: 'IEA 2025',
            calculationMethodology: 'ISO 14067',
            gwpCharacterizationFactors: 'IPCC AR6',
            verificationStatus: 'VERIFIED',
            verifierBody: 'Bureau Veritas',
            verificationStandard: 'ISO 14064-3',
          },
        });
      }
      console.log('✅ energy certification ready for e2e-item-0');
    }

    // Notifications for the dashboard's bell (#28): two unread and one already
    // read, so the e2e can check the badge count, marking one as read by
    // clicking it, and marking the rest as read all at once.
    const admin = await prisma.user.findUnique({ where: { email: 'admin@datia.icommunitylabs.com' } });
    if (admin && !(await prisma.notification.findUnique({ where: { id: 'e2e-notification-unread-1' } }))) {
      await prisma.notification.create({
        data: {
          id: 'e2e-notification-unread-1',
          userId: admin.id,
          organizationId: org.id,
          type: 'SUCCESS',
          title: 'Verificación KYC completada',
          message: 'Tu empresa ya puede certificar activos.',
        },
      });
      await prisma.notification.create({
        data: {
          id: 'e2e-notification-unread-2',
          userId: admin.id,
          organizationId: org.id,
          type: 'WARNING',
          title: 'Un webhook ha dejado de responder',
          message: '«ERP» está fallando. La entrega se sigue reintentando.',
        },
      });
      await prisma.notification.create({
        data: {
          id: 'e2e-notification-read',
          userId: admin.id,
          organizationId: org.id,
          type: 'INFO',
          title: 'Tu mensaje de soporte ha sido leído',
          message: '«Duda sobre facturación»',
          read: true,
          readAt: now,
        },
      });
      console.log('✅ 3 notifications ready for admin@datia.icommunitylabs.com');
    }

    // A second, unrelated organisation with its own asset and API token, so
    // the e2e can prove isolation between organisations (#38) — not just that
    // each one's own dashboard/API works, which every other spec already
    // covers.
    const isolatedOrg =
      (await prisma.organization.findUnique({ where: { slug: ISOLATED_ORG_SLUG } })) ??
      (await prisma.organization.create({
        data: {
          id: randomUUID(),
          name: 'Aislada E2E',
          slug: ISOLATED_ORG_SLUG,
          verificationStatus: 'VERIFIED',
          updatedAt: now,
        },
      }));
    const isolatedCompanyId = await companyIdFor(prisma, isolatedOrg.id);

    if (!(await prisma.asset.findUnique({ where: { id: ISOLATED_ASSET_ID } }))) {
      await prisma.asset.create({
        data: {
          id: ISOLATED_ASSET_ID,
          name: 'Activo de otra organización',
          description: 'No debería ser visible desde Datia E2E, ni por API ni por dashboard.',
          organizationId: isolatedOrg.id,
          companyId: isolatedCompanyId,
          updatedAt: now,
        },
      });
    }

    const datiaTokenHash = createHash('sha256').update(DATIA_ORG_TOKEN).digest('hex');
    if (!(await prisma.apiToken.findUnique({ where: { tokenHash: datiaTokenHash } }))) {
      await prisma.apiToken.create({
        data: { id: randomUUID(), name: 'E2E token', tokenHash: datiaTokenHash, organizationId: org.id, companyId },
      });
    }
    const isolatedTokenHash = createHash('sha256').update(ISOLATED_ORG_TOKEN).digest('hex');
    if (!(await prisma.apiToken.findUnique({ where: { tokenHash: isolatedTokenHash } }))) {
      await prisma.apiToken.create({
        data: {
          id: randomUUID(),
          name: 'Isolated E2E token',
          tokenHash: isolatedTokenHash,
          organizationId: isolatedOrg.id,
          companyId: isolatedCompanyId,
        },
      });
    }
    console.log(`✅ Isolated organization: ${isolatedOrg.name} (${isolatedOrg.slug}), with its own asset and token`);

    console.log('\n🔑 E2E credentials:');
    for (const { email, password } of USERS) {
      console.log(`   ${email} / ${password}`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error seeding E2E data:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

bootstrapE2EUsers();
