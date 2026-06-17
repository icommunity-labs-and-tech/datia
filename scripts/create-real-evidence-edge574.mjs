#!/usr/bin/env node

/**
 * Script: create-real-evidence-edge574.mjs
 *
 * Sustituye los fake evidenceIDs del item "edge574-bat-0001" por evidencias
 * reales subidas a IBS (iCommunity Blockchain Service).
 *
 * Prerequisito: ejecutar create-edge574-bat.mjs primero.
 * Prerequisito: variable de entorno IBS_TOKEN configurada.
 * Prerequisito: la organización demo debe tener signatureID y verificationStatus VERIFIED.
 *
 * Implementación autocontenida (sin imports de TypeScript) para ejecutarse con node.
 */

import { PrismaClient } from '../src/generated/prisma/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── Cargar variables de entorno desde .env ─────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Archivo no encontrado, continuar
  }
}

// Cargar variables de entorno (.env primero, luego .env.local sobreescribe)
loadEnvFile(join(rootDir, '.env'));
loadEnvFile(join(rootDir, '.env.local'));

const prisma = new PrismaClient();

// ─── Configuración IBS ───────────────────────────────────────────────────────

const IBS_BASE_URL = 'https://api.icommunitylabs.com/v2';

function getIbsToken() {
  const token = process.env.IBS_TOKEN;
  if (!token) {
    throw new Error('IBS_TOKEN no configurado. Asegúrate de tenerlo en .env o en las variables de entorno.');
  }
  return token;
}

// ─── Helpers de construcción de evidencias ───────────────────────────────────

function buildItemDataObject(input) {
  const { itemId, categoryId, name, description, createdAt, imageUrls = [], templateFields, itemTemplate } = input;
  const result = { type: 'item_creation', itemId, categoryId, name, description, createdAt, imageUrls };
  if (templateFields) result.templateFields = templateFields;
  if (itemTemplate) result.itemTemplate = itemTemplate;
  return result;
}

function buildIssueDataObject(input) {
  const { id, itemId, title, description, createdAt, templateConfig, imageUrls = [], itemEvidenceID, itemName, itemCreatedAt } = input;
  const result = { description, imageUrls };
  if (id) result.id = id;
  if (itemId) result.itemId = itemId;
  if (title) result.title = title;
  if (createdAt) result.createdAt = createdAt;
  if (templateConfig) result.templateConfig = templateConfig;
  if (itemEvidenceID !== undefined) result.itemEvidenceID = itemEvidenceID;
  if (itemName) result.itemName = itemName;
  if (itemCreatedAt) result.itemCreatedAt = itemCreatedAt;
  return result;
}

function detectImageExt(contentType) {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('gif')) return 'gif';
  return 'jpg';
}

async function fetchImageWithRetry(url, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const contentType = response.headers.get('content-type') || '';
      const ext = detectImageExt(contentType);
      const arrayBuffer = await response.arrayBuffer();
      return { ext, base64: Buffer.from(arrayBuffer).toString('base64') };
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError || new Error(`Failed to fetch image after ${maxRetries} retries: ${url}`);
}

async function buildEvidenceFiles(input, isItemCreation) {
  const files = [];
  let imageIndex = 0;

  // Procesar imágenes
  for (const url of (input.imageUrls || [])) {
    try {
      console.log(`      📸 Descargando imagen: ${url.split('/').pop()}`);
      const { ext, base64 } = await fetchImageWithRetry(url);
      files.push({ name: `issue_image_${++imageIndex}.${ext}`, file: base64 });
    } catch (error) {
      console.warn(`      ⚠️  No se pudo descargar imagen ${url}: ${error.message}`);
    }
  }

  // Construir JSON de evidencia
  let json;
  let fileName;

  if (isItemCreation) {
    json = buildItemDataObject(input.metadata);
    fileName = 'item_data.json';
  } else {
    json = buildIssueDataObject({
      id: input.metadata.id,
      itemId: input.metadata.itemId,
      title: input.title,
      description: input.description,
      createdAt: input.metadata.createdAt,
      templateConfig: input.metadata.templateConfig,
      imageUrls: input.imageUrls || [],
      itemEvidenceID: input.metadata.itemEvidenceID,
      itemName: input.metadata.itemName,
      itemCreatedAt: input.metadata.itemCreatedAt,
    });
    fileName = 'issue_data.json';
  }

  const jsonBase64 = Buffer.from(JSON.stringify(json, null, 2), 'utf8').toString('base64');
  files.push({ name: fileName, file: jsonBase64 });

  return { files, jsonContent: JSON.stringify(json, null, 2) };
}

// ─── Llamada IBS con retry ───────────────────────────────────────────────────

async function callIbsCreateEvidence(signatureID, title, files, maxRetries = 3) {
  const token = getIbsToken();
  const payload = {
    payload: { title, files },
    signatures: [{ id: signatureID }],
  };

  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`${IBS_BASE_URL}/evidences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      let body;
      try { body = await res.json(); } catch { body = undefined; }

      if (!res.ok) {
        throw new Error(`IBS API error ${res.status}: ${JSON.stringify(body)}`);
      }

      const evidenceId = body?.evidence_id || body?.id || '';
      if (!evidenceId) {
        throw new Error(`IBS no devolvió evidence_id. Respuesta: ${JSON.stringify(body)}`);
      }

      return { evidenceId, body };
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 200;
        console.warn(`      ⚠️  Intento ${attempt + 1} fallido, reintentando en ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError || new Error('Error llamando a IBS después de reintentos');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔋 Creando evidencias IBS reales para edge574-bat-0001...\n');

  try {
    // Verificar token IBS antes de empezar
    getIbsToken();
    console.log('✅ IBS_TOKEN configurado\n');

    const itemId = 'edge574-bat-0001';

    // 1. Obtener el item con su organización y estados
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        Organization: {
          select: { id: true, nombre: true, signatureID: true, verificationStatus: true },
        },
        ItemCategory: { include: { Category: true } },
        State: {
          include: { StatusType: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!item) {
      throw new Error(`Item ${itemId} no encontrado. Ejecuta create-edge574-bat.mjs primero.`);
    }

    console.log(`✅ Item encontrado: ${item.name}`);
    console.log(`   Organización: ${item.Organization.nombre}`);
    console.log(`   SignatureID: ${item.Organization.signatureID || 'NO DISPONIBLE'}`);
    console.log(`   Estado verificación: ${item.Organization.verificationStatus}\n`);

    if (!item.Organization.signatureID) {
      throw new Error('La organización no tiene signatureID. Debe completar el proceso KYC primero.');
    }

    if (item.Organization.verificationStatus !== 'VERIFIED') {
      console.warn(`⚠️  Advertencia: La organización no está verificada (${item.Organization.verificationStatus})`);
      console.warn('   Las evidencias se crearán pero pueden no ser válidas.\n');
    }

    const signatureID = item.Organization.signatureID;
    const category = item.ItemCategory[0]?.Category;
    if (!category) {
      throw new Error('El item no tiene categoría asociada.');
    }

    // 2. Crear evidencia IBS real para el item
    console.log('📝 Creando evidencia IBS real para el item...');

    const itemEvidenceInput = {
      title: `Creación de Item: ${item.name}`,
      description: item.description || '',
      imageUrls: item.imageUrl ? [item.imageUrl] : [],
      metadata: {
        type: 'item_creation',
        itemId: item.id,
        categoryId: category.id,
        name: item.name,
        description: item.description || '',
        createdAt: item.createdAt.toISOString(),
        imageUrls: item.imageUrl ? [item.imageUrl] : [],
        templateFields: item.templateFields,
        itemTemplate: item.itemTemplate,
      },
    };

    const { files: itemFiles, jsonContent: itemJsonContent } = await buildEvidenceFiles(itemEvidenceInput, true);
    const { evidenceId: itemEvidenceID } = await callIbsCreateEvidence(signatureID, itemEvidenceInput.title, itemFiles);

    await prisma.item.update({
      where: { id: item.id },
      data: { evidenceID: itemEvidenceID, evidenceDataJson: itemJsonContent },
    });

    console.log(`✅ Evidencia del item creada: ${itemEvidenceID}\n`);

    // 3. Crear evidencias IBS reales para cada estado
    console.log(`📋 Creando evidencias IBS reales para ${item.State.length} estados...\n`);

    let successCount = 0;

    for (let i = 0; i < item.State.length; i++) {
      const state = item.State[i];
      console.log(`   [${i + 1}/${item.State.length}] "${state.title}"`);

      try {
        const stateImageUrls = Array.isArray(state.imageUrls)
          ? state.imageUrls.filter((url) => typeof url === 'string')
          : [];

        const stateEvidenceInput = {
          title: state.title,
          description: state.description,
          imageUrls: stateImageUrls,
          metadata: {
            id: state.id,
            itemId: item.id,
            statusTypeId: state.statusTypeId,
            statusTypeName: state.StatusType?.name || '',
            createdAt: state.createdAt.toISOString(),
            templateConfig: state.templateConfig,
            // Cadena de custodia
            itemEvidenceID: itemEvidenceID,
            itemName: item.name,
            itemCreatedAt: item.createdAt.toISOString(),
          },
        };

        const { files: stateFiles, jsonContent: stateJsonContent } = await buildEvidenceFiles(stateEvidenceInput, false);
        const { evidenceId: stateEvidenceID } = await callIbsCreateEvidence(signatureID, state.title, stateFiles);

        await prisma.state.update({
          where: { id: state.id },
          data: { evidenceID: stateEvidenceID, issueDataJson: stateJsonContent },
        });

        console.log(`      ✅ Evidencia IBS: ${stateEvidenceID}`);
        successCount++;
      } catch (error) {
        console.error(`      ❌ Error: ${error.message}`);
        // Continuar con el siguiente estado aunque falle uno
      }
    }

    console.log(`\n🎉 ¡Completado! Evidencias IBS reales creadas para ${itemId}`);
    console.log(`\n📋 Resumen:`);
    console.log(`   - Item EvidenceID (IBS): ${itemEvidenceID}`);
    console.log(`   - Estados actualizados con evidencias reales: ${successCount}/${item.State.length}`);
    console.log(`\n🔗 Verificar en:`);
    console.log(`   - Pasaporte público: /customer/item/${itemId}`);
    console.log(`   - Dashboard: /dashboard/items/${itemId}`);
  } catch (error) {
    console.error('❌ Error:', error.message || error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Error durante la ejecución:', e);
  process.exit(1);
});
