import { NextResponse } from 'next/server';
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
  return NextResponse.json(spec);
}
