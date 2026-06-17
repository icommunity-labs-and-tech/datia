#!/usr/bin/env node

/**
 * Script: create-edge574-bat.mjs
 *
 * Creates the "ElevenEs Edge574 Blade Cell" item with a complete digital passport
 * for the demo user account (org slug: 'demo').
 *
 * Includes:
 *  - Category "Batteries"
 *  - 7 battery lifecycle-specific status types
 *  - Item with 12 EU Battery Passport fields
 *  - 6 realistic states (manufacturing → QC → certification → pack → vehicle → inspection)
 *  - Fake evidenceIDs (run create-real-evidence-edge574.mjs for real IBS evidence)
 */

import { PrismaClient } from '../src/generated/prisma/index.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ─── Helpers to build evidence JSON (deterministic format) ───────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔋 Creating digital passport: ElevenEs Edge574 Blade Cell\n');

  try {
    // 1. Find demo organisation
    const organization = await prisma.organization.findFirst({ where: { slug: 'demo' } });
    if (!organization) {
      throw new Error('Demo organisation not found (slug: "demo"). Run create-demo-org.mjs first.');
    }
    console.log(`✅ Demo organisation: ${organization.nombre} (${organization.id})\n`);

    // 2. Create/find "Batteries" category
    let category = await prisma.category.findFirst({
      where: { organizationId: organization.id, name: 'Batteries' },
    });

    if (!category) {
      const now = new Date();
      category = await prisma.category.create({
        data: {
          id: crypto.randomUUID(),
          organizationId: organization.id,
          name: 'Batteries',
          description: 'Cells, modules and electrochemical energy storage systems',
          itemTemplate: [],
          updatedAt: now,
        },
      });
      console.log(`✅ Category created: ${category.name} (${category.id})\n`);
    } else {
      console.log(`✅ Existing category: ${category.name} (${category.id})\n`);
    }

    // 3. Create/find 7 battery-specific status types
    console.log('📋 Creating battery status types...\n');

    const statusTypeDefs = [
      {
        name: 'Manufactured',
        description: 'Cell production record at factory',
        template: [
          { label: 'Location', name: 'location', type: 'geolocation' },
          { label: 'Manufacturer', name: 'manufacturer', type: 'text' },
          { label: 'Production Date', name: 'productionDate', type: 'date' },
          { label: 'Production Batch', name: 'batchNumber', type: 'text' },
          { label: 'Production Line', name: 'productionLine', type: 'text' },
          { label: 'Quality Inspector', name: 'qualityInspector', type: 'text' },
          { label: 'Notes', name: 'notes', type: 'text' },
        ],
      },
      {
        name: 'Quality Control',
        description: 'Quality and performance testing at factory',
        template: [
          { label: 'Test Date', name: 'testDate', type: 'date' },
          { label: 'Test Technician', name: 'testTechnician', type: 'text' },
          { label: 'Measured Capacity (Ah)', name: 'measuredCapacityAh', type: 'number' },
          { label: 'Internal Resistance (mΩ)', name: 'internalResistanceMilliohm', type: 'number' },
          { label: 'Voltage at Full Charge (V)', name: 'voltageAtFullCharge', type: 'number' },
          { label: 'Test Result', name: 'testResult', type: 'text' },
          { label: 'Notes', name: 'notes', type: 'text' },
        ],
      },
      {
        name: 'Certified',
        description: 'Regulatory and compliance certifications',
        template: [
          { label: 'Certification Body', name: 'certificationBody', type: 'text' },
          { label: 'Certification Date', name: 'certificationDate', type: 'date' },
          { label: 'Certified Standards', name: 'standardsCertified', type: 'text' },
          { label: 'Certificate Number', name: 'certificateNumber', type: 'text' },
          { label: 'Expiry Date', name: 'expiryDate', type: 'date' },
          { label: 'Notes', name: 'notes', type: 'text' },
        ],
      },
      {
        name: 'Integrated into Pack',
        description: 'Cell assembly into battery module or pack',
        template: [
          { label: 'Location', name: 'location', type: 'geolocation' },
          { label: 'Assembly Plant', name: 'assemblyPlant', type: 'text' },
          { label: 'Assembly Date', name: 'assemblyDate', type: 'date' },
          { label: 'Pack ID', name: 'packId', type: 'text' },
          { label: 'Pack Configuration', name: 'packConfiguration', type: 'text' },
          { label: 'Thermal Management System', name: 'thermalManagement', type: 'text' },
          { label: 'Assembled By', name: 'assembledBy', type: 'text' },
          { label: 'Notes', name: 'notes', type: 'text' },
        ],
      },
      {
        name: 'Installed in Vehicle',
        description: 'Battery pack installation in electric vehicle',
        template: [
          { label: 'Location', name: 'location', type: 'geolocation' },
          { label: 'Vehicle VIN', name: 'vehicleVin', type: 'text' },
          { label: 'Vehicle Model', name: 'vehicleModel', type: 'text' },
          { label: 'Installation Date', name: 'installationDate', type: 'date' },
          { label: 'Installed By', name: 'installedBy', type: 'text' },
          { label: 'Mileage at Installation', name: 'mileageAtInstallation', type: 'number' },
          { label: 'Warranty Start Date', name: 'warrantyStartDate', type: 'date' },
          { label: 'Notes', name: 'notes', type: 'text' },
        ],
      },
      {
        name: 'Field Inspection',
        description: 'Operational health inspection in service',
        template: [
          { label: 'Inspection Date', name: 'inspectionDate', type: 'date' },
          { label: 'Inspector', name: 'inspector', type: 'text' },
          { label: 'Mileage (km)', name: 'mileageKm', type: 'number' },
          { label: 'State of Health (%)', name: 'stateOfHealthPct', type: 'number' },
          { label: 'Measured Capacity (Ah)', name: 'measuredCapacityAh', type: 'number' },
          { label: 'Charge Cycles', name: 'chargeCycles', type: 'number' },
          { label: 'Detected Anomalies', name: 'anomalies', type: 'text' },
          { label: 'Notes', name: 'notes', type: 'text' },
        ],
      },
      {
        name: 'End of Life',
        description: 'Decommissioning, recycling or second-life reuse',
        template: [
          { label: 'Decommission Date', name: 'decommissionDate', type: 'date' },
          { label: 'Reason', name: 'reason', type: 'text' },
          { label: 'Recycler Company', name: 'recyclerName', type: 'text' },
          { label: 'Recycler Certification', name: 'recyclerCertification', type: 'text' },
          { label: 'Eligible for Second Life?', name: 'secondLifeEligible', type: 'text' },
          { label: 'Notes', name: 'notes', type: 'text' },
        ],
      },
    ];

    const statusTypes = {};
    const now = new Date();

    for (const def of statusTypeDefs) {
      let st = await prisma.statusType.findFirst({
        where: { organizationId: organization.id, name: def.name },
      });

      if (!st) {
        st = await prisma.statusType.create({
          data: {
            id: `status-bat-${def.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
            name: def.name,
            description: def.description,
            template: def.template,
            organizationId: organization.id,
            updatedAt: now,
          },
        });
        console.log(`  ✅ Created: ${st.name}`);
      } else {
        console.log(`  ⚡ Existing: ${st.name}`);
      }

      statusTypes[def.name] = st;
    }

    console.log();

    // 4. Create item edge574-bat-0001
    const itemId = 'edge574-bat-0001';
    let item = await prisma.item.findUnique({ where: { id: itemId } });

    // Base date: item was manufactured ~60 days ago
    const itemCreatedAt = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const itemTemplate = [
      { label: 'Manufacturer', name: 'manufacturer', type: 'text' },
      { label: 'Model', name: 'model', type: 'text' },
      { label: 'Serial Number', name: 'serialNumber', type: 'text' },
      { label: 'Chemistry', name: 'chemistry', type: 'text' },
      { label: 'Nominal Voltage (V)', name: 'nominalVoltageV', type: 'number' },
      { label: 'Nominal Capacity (Ah)', name: 'nominalCapacityAh', type: 'number' },
      { label: 'Dimensions (mm)', name: 'dimensionsMm', type: 'text' },
      { label: 'Operating Temperature Range', name: 'operatingTempRange', type: 'text' },
      { label: 'Estimated Cycle Life', name: 'cycleLifeKm', type: 'text' },
      { label: 'Production Batch', name: 'batchNumber', type: 'text' },
      { label: 'Manufacturing Plant', name: 'manufacturingPlant', type: 'text' },
      { label: 'Manufacturing Year', name: 'manufacturingYear', type: 'number' },
    ];

    const templateFields = {
      manufacturer: 'ElevenEs d.o.o.',
      model: 'Edge574 Blade Cell',
      serialNumber: 'ELE574-2025-B042-0187',
      chemistry: 'LFP – Lithium Iron Phosphate (LiFePO₄)',
      nominalVoltageV: 3.2,
      nominalCapacityAh: 144,
      dimensionsMm: '574 × 120 × 16 mm',
      operatingTempRange: '-30 °C to +60 °C (discharge) · 0 °C to +45 °C (charge)',
      cycleLifeKm: '≥ 500,000 km equivalent',
      batchNumber: 'B2025-574-042',
      manufacturingPlant: 'ElevenEs – Subotica, Serbia (Tolminska 35)',
      manufacturingYear: 2025,
    };

    const itemImageUrl =
      'https://www.electrive.com/media/2025/05/elevenes-battery-cell-edge574-blade-cell-2025.jpg';

    const itemDescription =
      'Ultra-fast charging lithium iron phosphate (LFP) prismatic blade cell for European electric mobility. Designed for CTP/CTB integration with a cycle life of over 500,000 km.';

    if (!item) {
      const fakeItemEvidenceID = `EVID-FAKE-ITEM-EDGE574-${Date.now()}`;

      const itemEvidenceData = buildItemDataObject({
        itemId,
        categoryId: category.id,
        name: 'ElevenEs Edge574 Blade Cell',
        description: itemDescription,
        createdAt: itemCreatedAt.toISOString(),
        imageUrls: [itemImageUrl],
        templateFields,
        itemTemplate,
      });

      item = await prisma.item.create({
        data: {
          id: itemId,
          name: 'ElevenEs Edge574 Blade Cell',
          description: itemDescription,
          organizationId: organization.id,
          imageUrl: itemImageUrl,
          itemTemplate,
          templateFields,
          evidenceID: fakeItemEvidenceID,
          evidenceDataJson: JSON.stringify(itemEvidenceData, null, 2),
          createdAt: itemCreatedAt,
          updatedAt: itemCreatedAt,
        },
      });

      // Link to "Batteries" category
      await prisma.itemCategory.create({
        data: { itemId: item.id, categoryId: category.id },
      });

      console.log(`✅ Item created: ${item.name} (${item.id})`);
      console.log(`   EvidenceID (fake): ${fakeItemEvidenceID}\n`);
    } else {
      console.log(`✅ Item already exists: ${item.name} (${item.id})\n`);
    }

    // 5. Create the 6 digital passport states
    console.log('📋 Creating digital passport states...\n');

    const statesDef = [
      // ── State 1: Manufactured ─────────────────────────────────────────────
      {
        statusTypeName: 'Manufactured',
        title: 'Manufactured in Subotica',
        description:
          'Edge574 cell production at ElevenEs facilities in Subotica, Serbia. LFP prismatic blade format with new electrolyte optimised for 10C charging.',
        daysAgo: 60,
        imageUrls: [
          'https://elevenes.com/wp-content/uploads/2025/05/Engineered-for-Excellence_Edge574_ElevenEs-1024x1024.png',
        ],
        templateConfig: {
          location: { lat: 46.1003, lng: 19.6682 }, // Subotica, Serbia
          manufacturer: 'ElevenEs d.o.o.',
          productionDate: '2025-01-03',
          batchNumber: 'B2025-574-042',
          productionLine: 'Line 3 – Blade Cell',
          qualityInspector: 'Dr. Ana Popović',
          notes:
            'Production completed without incidents. Cell identified with unique QR code ELE574-2025-B042-0187. Improved mechanical design with 15% DCIR reduction vs. previous generation.',
        },
      },
      // ── State 2: Quality Control ──────────────────────────────────────────
      {
        statusTypeName: 'Quality Control',
        title: 'Quality Control Testing',
        description:
          'Factory quality tests: capacity, internal resistance, voltage and UN38.3 transport test. Cell approved for shipment.',
        daysAgo: 57,
        imageUrls: [
          'https://elevenes.com/wp-content/uploads/2025/05/More-power-Less-space_Edge574_ElevenEs-1024x1024.png',
        ],
        templateConfig: {
          testDate: '2025-01-06',
          testTechnician: 'Eng. Nikola Jovanović',
          measuredCapacityAh: 145.3,
          internalResistanceMilliohm: 0.52,
          voltageAtFullCharge: 3.65,
          testResult: 'PASSED – Within specifications',
          notes:
            'Capacity at 100.9% of nominal (144 Ah). Internal resistance 0.52 mΩ within limits (< 0.6 mΩ). UN38.3 dangerous goods transport test passed. Energy density verified: 190 Wh/kg · 420 Wh/l.',
        },
      },
      // ── State 3: Certified ────────────────────────────────────────────────
      {
        statusTypeName: 'Certified',
        title: 'EU Regulatory Certification',
        description:
          'Conformity certification against international safety standards and EU Battery Regulation 2023/1542, which mandates a Digital Battery Passport from 2027.',
        daysAgo: 55,
        imageUrls: [],
        templateConfig: {
          certificationBody: 'TÜV Rheinland Group',
          certificationDate: '2025-01-08',
          standardsCertified: 'UN38.3:2023, IEC 62619:2022, EU Regulation 2023/1542 (Battery Passport), CE',
          certificateNumber: 'TUV-LFP-2025-0042-EU',
          expiryDate: '2030-01-08',
          notes:
            'Full certification for the European market. Compliance with EU Battery Regulation 2023/1542 verified. The EU Digital Battery Passport (EU DBP) has been generated and linked to this chain of custody record.',
        },
      },
      // ── State 4: Integrated into Pack ─────────────────────────────────────
      {
        statusTypeName: 'Integrated into Pack',
        title: 'Integration into 210-Cell Pack',
        description:
          'Cell assembly into a 210-unit pack at the Stellantis Zaragoza plant. Cell-to-pack (CTP) configuration with active liquid cooling.',
        daysAgo: 50,
        imageUrls: [
          'https://elevenes.com/wp-content/uploads/2025/05/Every-second-counts_Edge574_ElevenEs-1024x1024.png',
        ],
        templateConfig: {
          location: { lat: 41.6488, lng: -0.8891 }, // Zaragoza, Spain
          assemblyPlant: 'Stellantis – Zaragoza Plant, Spain',
          assemblyDate: '2025-01-13',
          packId: 'PACK-STLT-ZGZ-2025-00342',
          packConfiguration: '210 cells in CTP configuration – 672 V nominal / 30.24 kWh – 1 MW peak power',
          thermalManagement: 'Active liquid cooling – ethylene glycol/water 50/50',
          assembledBy: 'High-voltage assembly team – Section B, Shift 1',
          notes:
            'Pack assembled under EU-DBP-v2 protocol. All cells individually traced. Formation test completed: pack capacity 30.18 kWh (99.8% nominal). Homologated under ECE R100 Rev.3.',
        },
      },
      // ── State 5: Installed in Vehicle ─────────────────────────────────────
      {
        statusTypeName: 'Installed in Vehicle',
        title: 'Installed in Electric Vehicle',
        description:
          'Battery pack installation in Citroën ë-C4 X (2025). Final customer delivery with 8-year warranty activation.',
        daysAgo: 45,
        imageUrls: [],
        templateConfig: {
          location: { lat: 40.3911, lng: -3.6527 }, // Madrid Vallecas
          vehicleVin: 'VF7NHMKZ1NW012345',
          vehicleModel: 'Citroën ë-C4 X (2025) – 210 kW AWD',
          installationDate: '2025-01-18',
          installedBy: 'Authorised Stellantis Dealer – Madrid Vallecas',
          mileageAtInstallation: 0,
          warrantyStartDate: '2025-01-18',
          notes:
            'Vehicle delivered to final customer. Battery warranty: 8 years / 160,000 km per EU Directive 2019/1. Welcome charge completed: 10 → 80% in 11 min 47 s at 26 °C ambient.',
        },
      },
      // ── State 6: Field Inspection ─────────────────────────────────────────
      {
        statusTypeName: 'Field Inspection',
        title: 'First Field Inspection',
        description:
          'Operational health inspection (SOH) at authorised workshop after 12,450 km and 47 charge cycles. Excellent condition.',
        daysAgo: 15,
        imageUrls: [
          'https://elevenes.com/wp-content/uploads/2025/05/500000-Kilometers-Strong_Edge574_ElevenEs-1024x1024.png',
        ],
        templateConfig: {
          inspectionDate: '2025-02-17',
          inspector: 'Citroën Authorised Workshop – Madrid Centro (Technician Javier Morales)',
          mileageKm: 12450,
          stateOfHealthPct: 97.2,
          measuredCapacityAh: 141.2,
          chargeCycles: 47,
          anomalies: 'None',
          notes:
            'SOH 97.2% after 12,450 km and 47 full cycles. Capacity 141.2 Ah (98.1% of QC measured value). Degradation within normal parameters for this stage. Next inspection recommended at 50,000 km or 12 months. Charge time 10→80%: 12 min 23 s (nominal 12 min).',
        },
      },
    ];

    const createdStates = [];

    for (let i = 0; i < statesDef.length; i++) {
      const def = statesDef[i];
      const statusType = statusTypes[def.statusTypeName];
      const stateCreatedAt = new Date(now.getTime() - def.daysAgo * 24 * 60 * 60 * 1000);

      // Check if already exists
      const existing = await prisma.state.findFirst({
        where: { itemId: item.id, title: def.title },
      });

      if (existing) {
        console.log(`  ⏭️  State "${def.title}" already exists, skipping...`);
        continue;
      }

      const stateId = `state-${item.id}-${i}-${Date.now()}`;
      const fakeStateEvidenceID = `EVID-FAKE-STATE-EDGE574-${i}-${Date.now()}`;

      const stateEvidenceData = buildIssueDataObject({
        id: stateId,
        itemId: item.id,
        title: def.title,
        description: def.description,
        createdAt: stateCreatedAt.toISOString(),
        templateConfig: def.templateConfig,
        imageUrls: def.imageUrls,
        itemEvidenceID: item.evidenceID || null,
        itemName: item.name,
        itemCreatedAt: item.createdAt.toISOString(),
      });

      const state = await prisma.state.create({
        data: {
          id: stateId,
          itemId: item.id,
          statusTypeId: statusType.id,
          title: def.title,
          description: def.description,
          evidenceID: fakeStateEvidenceID,
          backed: false,
          imageUrls: def.imageUrls,
          templateConfig: def.templateConfig,
          issueDataJson: JSON.stringify(stateEvidenceData, null, 2),
          createdAt: stateCreatedAt,
        },
      });

      createdStates.push(state);
      console.log(`  ✅ State ${i + 1}/6: "${def.title}"`);
    }

    console.log(`\n🎉 Done!`);
    console.log(`\n📋 Summary:`);
    console.log(`   - Organisation: ${organization.nombre} (${organization.slug})`);
    console.log(`   - Category: ${category.name} (${category.id})`);
    console.log(`   - Item ID: ${item.id}`);
    console.log(`   - Item: ${item.name}`);
    console.log(`   - States created: ${createdStates.length}`);
    console.log(`\n🔗 URLs:`);
    console.log(`   - Dashboard: /dashboard/items/${item.id}`);
    console.log(`   - Public passport: /customer/item/${item.id}`);
    console.log(`\n⚡ Next step: run create-real-evidence-edge574.mjs to replace`);
    console.log(`   fake evidenceIDs with real IBS evidence.`);
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Error during execution:', e);
  process.exit(1);
});
