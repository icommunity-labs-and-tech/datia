import { NextResponse } from 'next/server';
import { listStatusTypes } from '@/actions/statusTypes/list';
import { requireOrganizationId } from '@/lib/auth/tenant';

interface TemplateField {
  name: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'image' | 'geolocation';
  required?: boolean;
  options?: string[];
}

function fieldToJsonSchema(field: TemplateField): Record<string, unknown> {
  switch (field.type) {
    case 'number':
      return { type: 'number', example: 0 };
    case 'email':
      return { type: 'string', format: 'email', example: 'user@example.com' };
    case 'date':
      return { type: 'string', format: 'date', example: new Date().toISOString().split('T')[0] };
    case 'select':
      return { type: 'string', enum: field.options ?? [], example: field.options?.[0] ?? '' };
    case 'image':
      return { type: 'string', description: 'Image URL or base64-encoded image', example: 'https://example.com/image.jpg' };
    case 'geolocation':
      return {
        type: 'object',
        properties: {
          lat: { type: 'number', description: 'Latitude' },
          lng: { type: 'number', description: 'Longitude' },
        },
        required: ['lat', 'lng'],
        example: { lat: 40.4168, lng: -3.7038 },
      };
    default:
      return { type: 'string', example: `${field.name}_value` };
  }
}

function fieldExampleValue(field: TemplateField): unknown {
  switch (field.type) {
    case 'number': return 0;
    case 'email': return 'user@example.com';
    case 'date': return new Date().toISOString().split('T')[0];
    case 'select': return field.options?.[0] ?? '';
    case 'image': return 'https://example.com/image.jpg';
    case 'geolocation': return { lat: 40.4168, lng: -3.7038 };
    default: return `${field.name}_value`;
  }
}

export async function GET(request: Request) {
  try {
    await requireOrganizationId();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = new URL(request.url).origin;
  const baseSpecRes = await fetch(`${baseUrl}/api/openapi.json`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spec: Record<string, any> = await baseSpecRes.json();
  const statusTypes = await listStatusTypes();

  const statusTypeSchemas = statusTypes.map((st) => {
    const fields: TemplateField[] = Array.isArray(st.template) ? st.template : [];
    const templateProperties: Record<string, unknown> = {};
    const requiredFields: string[] = [];
    const templateExample: Record<string, unknown> = {};

    for (const field of fields) {
      templateProperties[field.name] = fieldToJsonSchema(field);
      templateExample[field.name] = fieldExampleValue(field);
      if (field.required) requiredFields.push(field.name);
    }

    return {
      title: st.name,
      ...(st.description ? { description: st.description } : {}),
      type: 'object',
      required: ['statusTypeId', 'templateConfig'],
      properties: {
        statusTypeId: {
          type: 'string',
          enum: [st.id],
          description: `Status type: "${st.name}"`,
          example: st.id,
        },
        templateConfig: {
          type: 'object',
          ...(requiredFields.length > 0 ? { required: requiredFields } : {}),
          properties: templateProperties,
          ...(Object.keys(templateProperties).length === 0 ? { additionalProperties: true } : {}),
        },
      },
      example: {
        statusTypeId: st.id,
        templateConfig: templateExample,
      },
    };
  });

  if (!spec.paths) spec.paths = {};

  spec.paths['/products/{id}/states'] = {
    post: {
      tags: ['Products'],
      summary: 'Create a state for a product',
      description:
        'Creates a new state for the specified product. Select a status type from the options below — each one defines the exact fields required in `templateConfig`.',
      operationId: 'createState',
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Product ID',
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema:
              statusTypeSchemas.length > 0
                ? { oneOf: statusTypeSchemas }
                : {
                    type: 'object',
                    description:
                      'No status types configured for this organization. Create status types from the dashboard first.',
                    required: ['statusTypeId', 'templateConfig'],
                    properties: {
                      statusTypeId: { type: 'string' },
                      templateConfig: { type: 'object', additionalProperties: true },
                    },
                  },
          },
        },
      },
      responses: {
        '201': {
          description: 'State created successfully',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  statusTypeId: { type: 'string' },
                  itemId: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        '401': { description: 'Unauthorized — missing or invalid Bearer token' },
        '404': { description: 'Product or status type not found' },
        '422': { description: 'Validation error — missing required templateConfig fields' },
      },
    },
  };

  return NextResponse.json(spec);
}
