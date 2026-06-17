import { NextResponse } from 'next/server';
import { getSwaggerSpec } from '@/lib/swagger/config';

export async function GET() {
  try {
    // Try to generate spec from JSDoc comments
    const openApiSpec = getSwaggerSpec() as any;
    // Log paths found for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Swagger spec paths found:', Object.keys(openApiSpec.paths || {}));
    }
    return NextResponse.json(openApiSpec);
  } catch (error) {
    console.error('Error generating Swagger spec from JSDoc:', error);
    // Fallback to manual spec if JSDoc parsing fails
    return NextResponse.json(manualOpenApiSpec);
  }
}

// Manual spec as fallback - can be removed once all endpoints are documented with JSDoc
const manualOpenApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'certypass API',
    version: '1.0.0',
    description: 'RESTful API for certypass platform',
  },
  servers: [
    {
      url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
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
      name: 'Products',
      description: 'Operations related to products management',
    },
    {
      name: 'States',
      description: 'Operations related to product states',
    },
    {
      name: 'Categories',
      description: 'Operations related to categories management',
    },
    {
      name: 'Events',
      description: 'Operations related to event logs',
    },
    {
      name: 'FraudReports',
      description: 'Operations related to fraud report management',
    },
    {
      name: 'Energy',
      description: 'Energy sources and consumption records (ESPR-aligned)',
    },
    {
      name: 'Emissions',
      description: 'CO₂ emission records and DPP certification (ISO 14067 / GHG Protocol)',
    },
    {
      name: 'Maintenance',
      description: 'Maintenance events on hardware assets',
    },
  ],
  paths: {
    '/products': {
      get: {
        summary: 'List all products',
        description: 'Retrieves a list of all products in the system. Requires a valid API token.',
        operationId: 'listProducts',
        tags: ['Products'],
        security: [{ BearerAuth: [] }],
            parameters: [
              {
                name: 'categoryId',
                in: 'query',
                schema: { type: 'string' },
                description: 'Filter products by category ID (optional)',
              },
              {
                name: 'q',
                in: 'query',
                schema: { type: 'string' },
                description: 'Search query to filter products by name or ID (optional)',
              },
              {
                name: 'cursor',
                in: 'query',
                schema: { type: 'string' },
                description: 'Cursor for pagination (ID of the last product from previous page)',
                example: 'PROD-001',
              },
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                description: 'Maximum number of products to return',
                example: 20,
              },
            ],
            responses: {
              '200': {
                description: 'List of products retrieved successfully (paginated)',
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
                              id: { type: 'string', example: 'PROD-001' },
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
                          description: 'ID of the last product in this page, use this as cursor for next page',
                          example: 'PROD-020',
                        },
                        hasNextPage: {
                          type: 'boolean',
                          description: 'Whether there are more products available',
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
        summary: 'Create a new product',
        description: 'Creates a new product in the system. Requires a valid API token.',
        operationId: 'createProduct',
        tags: ['Products'],
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
                    description: 'Unique identifier for the product',
                    example: 'PROD-001',
                  },
                  name: {
                    type: 'string',
                    description: 'Name of the product',
                    example: 'Solar Panel 300W',
                  },
                  description: {
                    type: 'string',
                    description: 'Description of the product',
                    example: 'High efficiency solar panel',
                  },
                  categoryIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of category IDs',
                    example: ['cat-001'],
                  },
                  imageUrl: {
                    type: 'string',
                    format: 'uri',
                    description: 'URL of the product image',
                    example: 'https://example.com/image.jpg',
                  },
                  templateFields: {
                    type: 'object',
                    description: 'Additional template fields',
                    additionalProperties: true,
                  },
                  itemTemplate: {
                    type: 'array',
                    description: 'Product template configuration',
                    items: { type: 'object' },
                  },
                },
              },
              examples: {
                basic: {
                  value: {
                    id: 'PROD-001',
                    name: 'Solar Panel 300W',
                    description: 'High efficiency solar panel',
                    categoryIds: ['cat-001'],
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Product created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    imageUrl: { type: 'string', nullable: true },
                    itemTemplate: { type: 'array', nullable: true },
                  },
                },
                example: {
                  id: 'PROD-001',
                  name: 'Solar Panel 300W',
                  description: 'High efficiency solar panel',
                  imageUrl: null,
                  itemTemplate: [],
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
            description: 'Conflict - product with this ID already exists',
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
                  error: 'El ID "ITEM-001" ya existe. Por favor, elige un ID diferente.',
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
    '/products/{id}': {
      get: {
        summary: 'Get a product by ID',
        description: 'Retrieves detailed information about a specific product. Requires a valid API token.',
        operationId: 'getProductById',
        tags: ['Products'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Product ID',
            schema: { type: 'string' },
            example: 'PROD-001',
          },
        ],
        responses: {
          '200': {
            description: 'Product retrieved successfully',
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
                    states: {
                      type: 'array',
                      items: { type: 'object' },
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
          '404': {
            description: 'Product not found',
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
    '/products/{id}/states': {
      post: {
        summary: 'Add a state to a product',
        description: 'Adds a new state to a product. Select a status type from the options — each one defines the exact fields required in `templateConfig`.',
        operationId: 'createProductState',
        tags: ['Products'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Product ID',
            schema: { type: 'string' },
            example: 'PROD-001',
          },
        ],
        responses: {
          '501': {
            description: 'Not Implemented',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    code: { type: 'string' },
                    message: { type: 'string' },
                    details: { type: 'object' },
                  },
                },
                example: {
                  error: 'Not Implemented',
                  code: 'NOT_IMPLEMENTED',
                  message: 'State creation API is not yet implemented. This requires dynamic template validation based on StatusType configuration.',
                  details: {
                    itemId: 'PROD-001',
                    note: 'The templateConfig structure is dynamic and depends on the StatusType.template field.',
                  },
                },
              },
            },
          },
        },
      },
    },
    '/states': {
      get: {
        summary: 'List all states',
        description: 'Retrieves a list of all states in the system. Requires a valid API token.',
        operationId: 'listStates',
        tags: ['States'],
        security: [{ BearerAuth: [] }],
            parameters: [
              {
                name: 'itemId',
                in: 'query',
                schema: { type: 'string' },
                description: 'Filter states by product ID (optional)',
                example: 'PROD-001',
              },
              {
                name: 'cursor',
                in: 'query',
                schema: { type: 'string' },
                description: 'Cursor for pagination (ID of the last state from previous page)',
                example: 'state-001',
              },
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                description: 'Maximum number of states to return',
                example: 20,
              },
            ],
            responses: {
              '200': {
                description: 'List of states retrieved successfully (paginated)',
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
                              title: { type: 'string' },
                              description: { type: 'string' },
                              statusTypeId: { type: 'string' },
                              itemId: { type: 'string' },
                              createdAt: { type: 'string', format: 'date-time' },
                              evidenceID: { type: 'string', nullable: true },
                              backed: { type: 'boolean', nullable: true },
                            },
                          },
                        },
                        nextCursor: {
                          type: 'string',
                          nullable: true,
                          description: 'ID of the last state in this page, use this as cursor for next page',
                          example: 'state-020',
                        },
                        hasNextPage: {
                          type: 'boolean',
                          description: 'Whether there are more states available',
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
        },
      },
    },
    '/states/{id}': {
      get: {
        summary: 'Get a state by ID',
        description: 'Retrieves detailed information about a specific state. Requires a valid API token.',
        operationId: 'getStateById',
        tags: ['States'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'State ID',
            example: 'state-001',
          },
        ],
        responses: {
          '200': {
            description: 'State retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    statusTypeId: { type: 'string' },
                    itemId: { type: 'string' },
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
            description: 'State not found',
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
    '/categories': {
      get: {
        summary: 'List all categories',
        description: 'Retrieves a list of all categories in the system with pagination. Requires a valid API token.',
        operationId: 'listCategories',
        tags: ['Categories'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'cursor',
            in: 'query',
            schema: { type: 'string' },
            description: 'Cursor for pagination (ID of the last category from previous page)',
            example: 'category-001',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Maximum number of categories to return',
            example: 20,
          },
        ],
        responses: {
          '200': {
            description: 'List of categories retrieved successfully (paginated)',
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
                          name: { type: 'string' },
                          description: { type: 'string' },
                          itemTemplate: { type: 'array' },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    nextCursor: {
                      type: 'string',
                      nullable: true,
                      description: 'ID of the last category in this page, use this as cursor for next page',
                      example: 'category-020',
                    },
                    hasNextPage: {
                      type: 'boolean',
                      description: 'Whether there are more categories available',
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
    '/categories/{id}': {
      get: {
        summary: 'Get a category by ID',
        description: 'Retrieves detailed information about a specific category. Requires a valid API token.',
        operationId: 'getCategoryById',
        tags: ['Categories'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique identifier of the category',
            example: 'category-001',
          },
        ],
        responses: {
          '200': {
            description: 'Category retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    itemTemplate: { type: 'array' },
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
            description: 'Category not found',
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
    '/categories/{id}/products/{productId}': {
      post: {
        summary: 'Attach a product to a category',
        description: 'Adds a product to a category. Requires a valid API token.',
        operationId: 'attachProductToCategory',
        tags: ['Categories'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique identifier of the category',
            example: 'category-001',
          },
          {
            name: 'productId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique identifier of the product',
            example: 'PROD-001',
          },
        ],
        responses: {
          '200': {
            description: 'Product attached to category successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
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
            description: 'Category or product not found',
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
      delete: {
        summary: 'Detach a product from a category',
        description: 'Removes a product from a category. Requires a valid API token.',
        operationId: 'detachProductFromCategory',
        tags: ['Categories'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique identifier of the category',
            example: 'category-001',
          },
          {
            name: 'productId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Unique identifier of the product',
            example: 'PROD-001',
          },
        ],
        responses: {
          '200': {
            description: 'Product detached from category successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
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
            description: 'Category or product not found',
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
            example: 'product.created',
          },
          {
            name: 'entityType',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter events by entity type (optional)',
            example: 'Product',
          },
          {
            name: 'entityId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter events by entity ID (optional)',
            example: 'PROD-001',
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
    '/fraud-reports': {
      get: {
        summary: 'List fraud reports',
        description: 'Retrieves a list of fraud reports for the organization. Optionally filter by status or product ID. Requires a valid API token.',
        operationId: 'listFraudReports',
        tags: ['FraudReports'],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'] },
            description: 'Filter reports by status (optional)',
            example: 'PENDING',
          },
          {
            name: 'itemId',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter reports by product ID (optional)',
            example: 'PROD-001',
          },
        ],
        responses: {
          '200': {
            description: 'List of fraud reports retrieved successfully',
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
                          id: { type: 'string', example: 'clxyz123' },
                          itemId: { type: 'string', example: 'PROD-001' },
                          item: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              name: { type: 'string' },
                              imageUrl: { type: 'string', nullable: true },
                            },
                          },
                          status: { type: 'string', enum: ['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'] },
                          acquiredAt: { type: 'string', nullable: true },
                          locationName: { type: 'string', nullable: true },
                          latitude: { type: 'number', nullable: true },
                          longitude: { type: 'number', nullable: true },
                          comments: { type: 'string', nullable: true },
                          createdAt: { type: 'string', format: 'date-time' },
                          updatedAt: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    total: { type: 'integer', example: 12 },
                  },
                },
              },
            },
          },
          '400': { description: 'Bad request - invalid filter value' },
          '401': { description: 'Unauthorized - invalid or missing API token' },
          '500': { description: 'Internal server error' },
        },
      },
      post: {
        summary: 'Create a fraud report',
        description: 'Creates a new fraud report for an item. Requires a valid API token. Typically submitted from the Digital Passport app when a user reports a counterfeit item.',
        operationId: 'createFraudReport',
        tags: ['FraudReports'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['itemId'],
                properties: {
                  itemId: { type: 'string', description: 'ID of the product being reported as fraudulent', example: 'PROD-001' },
                  acquiredAt: { type: 'string', description: 'Date when the product was acquired (optional)', example: '2024-01-15' },
                  latitude: { type: 'number', description: 'Latitude of the reported location (optional)', example: 40.4168 },
                  longitude: { type: 'number', description: 'Longitude of the reported location (optional)', example: -3.7038 },
                  locationName: { type: 'string', description: 'Human-readable name of the location (optional)', example: 'Madrid, España' },
                  comments: { type: 'string', description: 'Additional comments (optional)', example: 'Purchased at a street market' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Fraud report created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    itemId: { type: 'string' },
                    organizationId: { type: 'string' },
                    status: { type: 'string', enum: ['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'], example: 'PENDING' },
                    acquiredAt: { type: 'string', nullable: true },
                    locationName: { type: 'string', nullable: true },
                    latitude: { type: 'number', nullable: true },
                    longitude: { type: 'number', nullable: true },
                    comments: { type: 'string', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': { description: 'Bad request - missing required fields' },
          '401': { description: 'Unauthorized - invalid or missing API token' },
          '500': { description: 'Internal server error' },
        },
      },
    },
    '/fraud-reports/{id}': {
      get: {
        summary: 'Get a fraud report by ID',
        description: 'Retrieves detailed information about a specific fraud report. Requires a valid API token.',
        operationId: 'getFraudReportById',
        tags: ['FraudReports'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Fraud report ID', example: 'clxyz123' },
        ],
        responses: {
          '200': {
            description: 'Fraud report retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    itemId: { type: 'string' },
                    item: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        imageUrl: { type: 'string', nullable: true },
                      },
                    },
                    status: { type: 'string', enum: ['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'] },
                    acquiredAt: { type: 'string', nullable: true },
                    locationName: { type: 'string', nullable: true },
                    latitude: { type: 'number', nullable: true },
                    longitude: { type: 'number', nullable: true },
                    comments: { type: 'string', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized - invalid or missing API token' },
          '404': { description: 'Fraud report not found' },
          '500': { description: 'Internal server error' },
        },
      },
      patch: {
        summary: 'Update a fraud report status',
        description: 'Updates the status of a specific fraud report. Requires a valid API token.',
        operationId: 'updateFraudReportStatus',
        tags: ['FraudReports'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Fraud report ID', example: 'clxyz123' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'], example: 'CONFIRMED' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Fraud report status updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    status: { type: 'string', enum: ['PENDING', 'UNDER_REVIEW', 'CONFIRMED', 'DISMISSED'] },
                    updatedAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '400': { description: 'Bad request - invalid status value' },
          '401': { description: 'Unauthorized - invalid or missing API token' },
          '404': { description: 'Fraud report not found' },
          '500': { description: 'Internal server error' },
        },
      },
      delete: {
        summary: 'Delete a fraud report',
        description: 'Permanently deletes a fraud report. Requires a valid API token.',
        operationId: 'deleteFraudReport',
        tags: ['FraudReports'],
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' }, description: 'Fraud report ID', example: 'clxyz123' },
        ],
        responses: {
          '204': { description: 'Fraud report deleted successfully' },
          '401': { description: 'Unauthorized - invalid or missing API token' },
          '404': { description: 'Fraud report not found' },
          '500': { description: 'Internal server error' },
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
        description: 'Links a physical energy source (solar panel, grid connection, etc.) to a hardware Item.',
        tags: ['Energy'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'energyCarrier', 'itemId'],
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
                  itemId: { type: 'string', description: 'ID of the hardware Item this source belongs to' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Energy source created' },
          '400': { description: 'Invalid input' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Item not found or not owned by your organization' },
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
        responses: { '200': { description: 'Paginated list' }, '401': { description: 'Unauthorized' } },
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
          '201': { description: 'Emission record created' },
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
        responses: { '200': { description: 'Emission record' }, '401': { description: 'Unauthorized' }, '404': { description: 'Not found' } },
      },
    },
    '/emissions/{id}/certify': {
      post: {
        summary: 'Certify an emission record',
        description: 'Marks an emission record as verified and creates blockchain-anchored evidence on the hardware Item\'s digital passport. Requires the organization to have a valid signatureID (KYC completed).',
        tags: ['Emissions'],
        security: [{ BearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['verifierBody'],
                properties: {
                  verifierBody: { type: 'string', example: 'Bureau Veritas' },
                  verificationStandard: { type: 'string', example: 'ISO 14064-3', default: 'ISO 14064-3' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Emission certified. Returns evidenceID and stateId anchored to blockchain.' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Emission record not found' },
          '409': { description: 'Already certified' },
          '422': { description: 'Organization KYC incomplete' },
          '502': { description: 'Blockchain evidence creation failed. Emission remains PENDING.' },
        },
      },
    },

    // ── Maintenance ───────────────────────────────────────────────────────────
    '/maintenance/event': {
      post: {
        summary: 'Register a maintenance event',
        description: 'Creates a lifecycle State on a hardware Item to record a maintenance action (preventive, corrective, etc.).',
        tags: ['Maintenance'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['itemId', 'statusTypeId', 'title'],
                properties: {
                  itemId: { type: 'string', description: 'ID of the hardware Item' },
                  statusTypeId: { type: 'string', description: 'ID of the maintenance StatusType' },
                  title: { type: 'string', example: 'Revisión anual preventiva' },
                  description: { type: 'string', example: 'Limpieza de módulos y revisión de conexiones' },
                  metadata: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Maintenance state created' },
          '400': { description: 'Invalid input' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Item or StatusType not found' },
        },
      },
    },
  },
};

