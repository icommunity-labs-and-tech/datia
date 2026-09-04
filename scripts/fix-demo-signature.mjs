#!/usr/bin/env node
/**
 * Points the demo organisation at a signature that iBS actually knows.
 *
 * The stored `signatureID` was never issued by iBS: its format gives it away —
 * hexadecimal, where every real signature is base58 (`sig_XaaVAPiJygQWngmda4w5Xt`
 * against the stored `sig_7ec7744ffc344723826b`). With it, `POST /evidences`
 * fails with 404 before anchoring anything, so no certification has been real.
 *
 * This is a stopgap for the demo environment: it reuses an existing test
 * signature rather than completing a fresh KYC for the organisation. Evidence
 * signed with it is anchored publicly on Gnosis under that identity, so it
 * should not be presented as a certification by the Datia organisation itself.
 *
 * Run with: node scripts/fix-demo-signature.mjs
 */
import { PrismaClient } from '../src/generated/prisma/index.js';

const prisma = new PrismaClient();

const ORG_SLUG = 'datia';
const SIGNATURE_ID = 'sig_XaaVAPiJygQWngmda4w5Xt'; // «pruebakyc», estado success

async function main() {
  const before = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
    select: { nombre: true, signatureID: true, verificationStatus: true },
  });
  if (!before) throw new Error(`No existe la organización "${ORG_SLUG}"`);

  console.log(`  organización : ${before.nombre}`);
  console.log(`  antes        : ${before.signatureID} (${before.verificationStatus})`);

  if (before.signatureID === SIGNATURE_ID) {
    console.log('  sin cambios: ya apunta a esa firma');
    return;
  }

  const after = await prisma.organization.update({
    where: { slug: ORG_SLUG },
    data: {
      signatureID: SIGNATURE_ID,
      verificationStatus: 'VERIFIED',
      updatedAt: new Date(),
    },
    select: { signatureID: true, verificationStatus: true },
  });

  console.log(`  después      : ${after.signatureID} (${after.verificationStatus})`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
