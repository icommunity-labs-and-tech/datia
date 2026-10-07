import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(manualOpenApiSpec);
}

const manualOpenApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Datia API',
    version: '1.0.0',
    description: 'RESTful API for Datia platform',
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_URL || '/api/v1',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'API Token authentication using Bearer token',
      },
    },
  },
  tags: [
    {
      name: 'Assets',
      description: 'Operations related to assets management',
    },
    {
      name: 'Events',
      description: 'Operations related to event logs',
    },
    {
      name: 'Energy',
      description: 'Energy sources and consumption records (ESPR-aligned)',
    },
    {
      name: 'Emissions',
      description: 'CO₂ emission records and DPP certification (ISO 14067 / GHG Protocol)',
    },
  ],
  paths: {
    '/assets': {
      get: {
        summary: 'List all assets',
        description: 'Retrieves a list of all assets in the system. Requires a valid API token.',
        operationId: 'listAssets',
        tags: ['Assets'],
        security: [{ BearerAuth: [] }],
            parameters: [
              {
                name: 'q',
                in: 'query',
                schema: { type: 'string' },
                description: 'Search query to filter assets by name or ID (optional)',
              },
              {
                name: 'cursor',
                in: 'query',
                schema: { type: 'string' },
                description: 'Cursor for pagination (ID of the last asset from previous page)',
                example: 'ASSET-001',
              },
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                description: 'Maximum number of assets to return',
                example: 20,
              },
            ],
            responses: {
              '200': {
                description: 'List of assets retrieved successfully (paginated)',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', example: 'ASSET-001' },
                              name: { type: 'string', example: 'Solar Panel 300W' },
                              description: { type: 'string', example: 'High efficiency solar panel' },
                              imageUrl: { type: 'string', nullable: true },
                              createdAt: { type: 'string', format: 'date-time' },
                            },
                          },
                        },
                        nextCursor: {
                          type: 'string',
                          nullable: true,
                          description: 'ID of the last asset in this page, use this as cursor for next page',
                          example: 'ASSET-020',
                        },
                        hasNextPage: {
                          type: 'boolean',
                          description: 'Whether there are more assets available',
                          example: true,
                        },
                      },
                    },
                  },
                },
              },
          '401': {
            description: 'Unauthorized - invalid or missing API token',
          },
        },
      },
      post: {
        summary: 'Create a new asset',
        description: 'Creates a new asset in the system. Requires a valid API token.',
        operationId: 'createAsset',
        tags: ['Assets'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id', 'name', 'description'],
                properties: {
                  id: {
                    type: 'string',
                    description: 'Unique identifier for the asset',
                    example: 'ASSET-001',
                  },
                  name: {
                    type: 'string',
                    description: 'Name of the asset',
                    example: 'Solar Panel 300W',
                  },
                  description: {
                    type: 'string',
                    description: 'Description of the asset',
                    example: 'High efficiency solar panel',
                  },
                  imageUrl: {
                    type: 'string',
                    format: 'uri',
                    description: 'URL of the asset image',
                    example: 'https://example.com/image.jpg',
                  },
                  latitude: {
                    type: 'number',
                    minimum: -90,
                    maximum: 90,
                    description: 'Where the asset is. Without a position it stays off the map.',
                    example: 40.4168,
                  },
                  longitude: {
                    type: 'number',
                    minimum: -180,
                    maximum: 180,
                    example: -3.7038,
                  },
                },
              },
              examples: {
                basic: {
                  value: {
                    id: 'ASSET-001',
                    name: 'Solar Panel 300W',
                    description: 'High efficiency solar panel',
                    latitude: 40.4168,
                    longitude: -3.7038,
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Asset created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    imageUrl: { type: 'string', nullable: true },
                  },
                },
                example: {
                  id: 'ASSET-001',
                  name: 'Solar Panel 300W',
                  description: 'High efficiency solar panel',
                  imageUrl: null,
                },
              },
            },
          },
          '400': {
            description: 'Bad request - validation error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    code: { type: 'string' },
                  },
                },
                example: {
                  error: 'Field "name" is required and must be a non-empty string',
                  code: 'VALIDATION_ERROR',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized - invalid or missing API token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    code: { type: 'string' },
                  },
                },
                example: {
                  error: 'Unauthorized',
                  code: 'INVALID_TOKEN',
                },
              },
            },
          },
          '409': {
            description: 'Conflict - asset with this ID already exists',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    code: { type: 'string' },
                  },
                },
                example: {
                  error: 'El ID "ASSET-001" ya existe. Por favor, elige un ID diferente.',
                  code: 'ITEM_EXISTS',
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    code: { type: 'string' },
                  },
                },
                example: {
                  error: 'Internal server error',
                  code: 'INTERNAL_ERROR',
                },
              },
            },
          },
        },
      },
    },
    '/assets/{id}': {
      get: {
        summary: 'Get a asset by ID',
        description: 'Retrieves detailed information about a specific asset. Requires a valid API token.',
        operationId: 'getAssetById',
        tags: ['Assets'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Asset ID',
            schema: { type: 'string' },
            example: 'ASSET-001',
          },
        ],
        responses: {
          '200': {
            description: 'Asset retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    imageUrl: { type: 'string', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized - invalid or missing API token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    code: { type: 'string' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Asset not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/events': {
      get: {
        summary: 'List all events',
        description: 'Retrieves a list of all events in the system with pagination. Requires a valid API token.',
        operationId: 'listEvents',
        tags: ['Events'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'cursor',
            in: 'query',
            schema: { type: 'string' },
            description: 'Cursor for pagination (ID of the last event from previous page)',
            example: 'event-001',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Maximum number of events to return',
            example: 20,
          },
          {
            name: 'eventType',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter events by event type (optional)',
            example: 'asset.created',
          },
          {
            name: 'entityType',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter events by entity type (optional)',
            example: 'Asset',
          },
          {
            name: 'entityId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter events by entity ID (optional)',
            example: 'ASSET-001',
          },
        ],
        responses: {
          '200': {
            description: 'List of events retrieved successfully (paginated)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          organizationId: { type: 'string' },
                          eventType: { type: 'string' },
                          entityType: { type: 'string' },
                          entityId: { type: 'string' },
                          data: { type: 'object' },
                          createdAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    nextCursor: {
                      type: 'string',
                      nullable: true,
                      description: 'ID of the last event in this page, use this as cursor for next page',
                      example: 'event-020',
                    },
                    hasNextPage: {
                      type: 'boolean',
                      description: 'Whether there are more events available',
                      example: true,
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized - invalid or missing API token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    code: { type: 'string' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
          },
        },
      },
    },
    '/events/{id}': {
      get: {
        summary: 'Get an event by ID',
        description: 'Retrieves detailed information about a specific event. Requires a valid API token.',
        operationId: 'getEventById',
        tags: ['Events'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique identifier of the event',
            example: 'event-001',
          },
        ],
        responses: {
          '200': {
            description: 'Event retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    organizationId: { type: 'string' },
                    eventType: { type: 'string' },
                    entityType: { type: 'string' },
                    entityId: { type: 'string' },
                    data: { type: 'object' },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized - invalid or missing API token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    code: { type: 'string' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Event not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Internal server error',
          },
        },
      },
    },

    // ── Energy Sources ────────────────────────────────────────────────────────
    '/energy/source': {
      get: {
        summary: 'List energy sources',
        tags: ['Energy'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'cursor', schema: { type: 'string' }, description: 'Pagination cursor' },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          '200': { description: 'Paginated list of energy sources' },
          '401': { description: 'Unauthorized' },
        },
      },
      post: {
        summary: 'Register an energy source',
        description: 'Links a physical energy source (solar panel, grid connection, etc.) to an asset.',
        tags: ['Energy'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'energyCarrier', 'assetId'],
                properties: {
                  name: { type: 'string', example: 'Panel solar cubierta norte' },
                  energyCarrier: { type: 'string', enum: ['ELECTRICITY', 'NATURAL_GAS', 'HYDROGEN', 'SOLAR_THERMAL', 'DISTRICT_HEATING', 'DISTRICT_COOLING', 'BIOMASS', 'OIL', 'COAL', 'OTHER'], example: 'ELECTRICITY' },
                  generationTechnology: { type: 'string', example: 'photovoltaic' },
                  capacityKw: { type: 'number', example: 10.5 },
                  location: { type: 'string', example: 'Cubierta edificio A' },
                  installationDate: { type: 'string', format: 'date-time' },
                  renewableShare: { type: 'number', minimum: 0, maximum: 100, example: 100 },
                  guaranteeOfOriginId: { type: 'string', example: 'GO-ES-2024-001' },
                  countryOfOrigin: { type: 'string', example: 'ES', description: 'ISO 3166-1 alpha-2' },
                  gridEmissionFactor: { type: 'number', example: 207, description: 'gCO2eq/kWh' },
                  assetId: { type: 'string', description: 'ID of the asset this source belongs to' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Energy source created' },
          '400': { description: 'Invalid input' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Asset not found or not owned by your organization' },
          '422': { description: 'Validation error or sandbox mode' },
        },
      },
    },
    '/energy/source/{id}': {
      get: {
        summary: 'Get an energy source by ID',
        tags: ['Energy'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Energy source record' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Not found' },
        },
      },
    },

    // ── Energy Consumption ────────────────────────────────────────────────────
    '/energy/consumption': {
      get: {
        summary: 'List energy consumption records',
        tags: ['Energy'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'cursor', schema: { type: 'string' } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: { '200': { description: 'Paginated list' }, '401': { description: 'Unauthorized' } },
      },
      post: {
        summary: 'Record energy consumption',
        description: 'Records energy consumed from a registered source during a period. consumptionMj is auto-derived from kWh if omitted.',
        tags: ['Energy'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['energySourceId', 'periodStart', 'periodEnd', 'consumptionKwh', 'lifecycleStage'],
                properties: {
                  energySourceId: { type: 'string' },
                  periodStart: { type: 'string', format: 'date-time' },
                  periodEnd: { type: 'string', format: 'date-time' },
                  consumptionKwh: { type: 'number', example: 312.5 },
                  consumptionMj: { type: 'number', description: 'Auto-derived if omitted (kWh × 3.6)' },
                  lifecycleStage: { type: 'string', enum: ['MANUFACTURING', 'TRANSPORT', 'USE', 'MAINTENANCE', 'END_OF_LIFE'], example: 'USE' },
                  measurementStandard: { type: 'string', example: 'EN 50598' },
                  operatingConditions: { type: 'object', additionalProperties: true },
                  costAmount: { type: 'number', example: 62.5 },
                  currency: { type: 'string', example: 'EUR', description: 'ISO 4217' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Consumption record created' },
          '400': { description: 'Invalid input' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'EnergySource not found or not owned by your organization' },
          '422': { description: 'Validation error or sandbox mode' },
        },
      },
    },
    '/energy/consumption/{id}': {
      get: {
        summary: 'Get a consumption record by ID',
        tags: ['Energy'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Consumption record' }, '401': { description: 'Unauthorized' }, '404': { description: 'Not found' } },
      },
    },

    // ── Emissions ─────────────────────────────────────────────────────────────
    '/emissions': {
      get: {
        summary: 'List emission records',
        tags: ['Emissions'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'cursor', schema: { type: 'string' } },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: { '200': { description: 'Paginated list. Each record includes `certification`: `null` until the emission is anchored, then `{ status: ISSUED | CERTIFIED, hash, checkerUrl, blockExplorerUrl, certifiedAt }`. `status` becomes CERTIFIED when iBS confirms the transaction on chain.' }, '401': { description: 'Unauthorized' } },
      },
      post: {
        summary: 'Register a CO₂ emission record',
        description: 'Records a CO₂ equivalent emission derived from an energy consumption record (ISO 14067 / GHG Protocol).',
        tags: ['Emissions'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['energyConsumptionId', 'co2eKg', 'scope', 'systemBoundary'],
                properties: {
                  energyConsumptionId: { type: 'string' },
                  co2eKg: { type: 'number', example: 64.7 },
                  scope: { type: 'string', enum: ['SCOPE_1', 'SCOPE_2', 'SCOPE_3'], example: 'SCOPE_2' },
                  systemBoundary: { type: 'string', enum: ['CRADLE_TO_GATE', 'CRADLE_TO_GRAVE', 'GATE_TO_GATE', 'CRADLE_TO_CRADLE'], example: 'CRADLE_TO_GATE' },
                  emissionFactor: { type: 'number', example: 0.207 },
                  emissionFactorSource: { type: 'string', example: 'IEA 2023' },
                  calculationMethodology: { type: 'string', example: 'ISO 14067' },
                  gwpCharacterizationFactors: { type: 'string', example: 'IPCC AR6' },
                  functionalUnit: { type: 'string', example: '1 kWh delivered' },
                  verifierBody: { type: 'string', example: 'Bureau Veritas' },
                  verificationStandard: { type: 'string', example: 'ISO 14064-3' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Emission record created. `data.certification` is null until iBS issues the proof (then ISSUED), and CERTIFIED once it is on chain.' },
          '400': { description: 'Invalid input' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'EnergyConsumption not found or not owned by your organization' },
          '422': { description: 'Validation error or sandbox mode' },
        },
      },
    },
    '/emissions/{id}': {
      get: {
        summary: 'Get an emission record by ID',
        tags: ['Emissions'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Emission record. Each record includes `certification`: `null` until the emission is anchored, then `{ status: ISSUED | CERTIFIED, hash, checkerUrl, blockExplorerUrl, certifiedAt }`. `status` becomes CERTIFIED when iBS confirms the transaction on chain.' }, '401': { description: 'Unauthorized' }, '404': { description: 'Not found' } },
      },
    },
    '/emissions/{id}/certify': {
      post: {
        summary: 'Anchor an emission that has no proof yet',
        description: 'Emissions are anchored as they are written, so this is only needed for one left without proof — because iBS was unreachable, or the account had not finished identity verification (KYC). It issues the proof; the emission becomes VERIFIED once iBS confirms it on chain (`evidence.certified`). Requires a completed identity verification (KYC).',
        tags: ['Emissions'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '201': { description: 'Proof issued. Returns the certification, certified once iBS confirms it on chain.' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Emission record not found' },
          '409': { description: 'The emission already has a certification' },
          '422': { description: 'Identity verification (KYC) is not complete' },
          '502': { description: 'iBS rejected the evidence. The emission stays without proof.' },
        },
      },
    },
    '/emissions/{id}/verify': {
      get: {
        summary: 'Verify an emission against its proof on chain',
        description: 'iBS publishes the checksum of the certified data, never the data itself, so this compares checksums: the one iBS publishes against the one recorded when the proof was issued. Then it compares the certified figures with the record as it stands today, which surfaces a figure changed after being certified.',
        tags: ['Emissions'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Report: `verified`, `proof.intact`, the certified data and any discrepancies' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Emission record not found' },
          '409': { description: 'The proof predates checksum recording and cannot be verified automatically' },
          '422': { description: 'The emission has no certified proof yet' },
          '502': { description: 'iBS could not be read, or publishes no checksum' },
        },
      },
    },
  },
};

