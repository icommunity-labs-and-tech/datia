import { ApiReference } from '@scalar/nextjs-api-reference';
import { requireScope } from '@/lib/auth/tenant';
import { listApiTokens } from '@/actions/api-tokens/list';
import { createApiTokenServiceImpl } from '@/domain/api-tokens/ApiTokenServiceImpl';
import { apiTokenRepositoryFilesystem } from '@/infrastructure/filesystem/repositories/ApiTokenRepositoryFilesystem';
import { prisma } from '@/lib/prisma';
import { scopeWhere, type Scope } from '@/lib/scope';

const DOCS_PREVIEW_TOKEN_NAME = 'Docs Preview (auto)';

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

function buildQuickStartDescription(
  recentItems: { id: string; name: string }[],
  tokenNames: string[],
  docsTokenProvisioned: boolean,
): string {
  const exampleItemId = recentItems[0]?.id ?? '{asset-id}';

  const tokenSection = docsTokenProvisioned
    ? `A temporary token (\`${DOCS_PREVIEW_TOKEN_NAME}\`) has been **pre-filled** for you — valid for 1 hour.\n\nIt is already set in the **Authorize** panel (🔑). You can start sending requests immediately.`
    : tokenNames.length > 0
      ? `Your API tokens:\n${tokenNames.map((n) => `- \`${n}\``).join('\n')}\n\nCopy a token value from **Developer → API Tokens** in the dashboard and paste it in the **Authorize** panel (🔑).`
      : `No API tokens yet. Go to **Developer → API Tokens** in the dashboard to create one.`;

  const itemSection =
    recentItems.length > 0
      ? `Your most recent assets:\n${recentItems.map((i) => `- \`${i.id}\` — ${i.name}`).join('\n')}`
      : `No assets yet. Create one with **POST /assets** or in the dashboard first.`;

  return `## Quick Start

Everything you need to make your first API call.

### 1. Authentication

${tokenSection}

### 2. Browse your assets

${itemSection}

The asset ID \`${exampleItemId}\` is pre-filled as the example in path parameters below.

### 3. Record energy data

Register an energy source for an asset with **POST /energy/source**, then record its consumption with **POST /energy/consumption**. Every endpoint in the reference below shows its request body with an example.

---

`;
}

/**
 * Creates a short-lived docs preview token stored ONLY in the filesystem.
 * Never touches the real apiToken table.
 *
 * Rotation: existing tokens for this org+name are deleted before creating
 * a new one, so there is always at most one active preview token per org.
 * The plaintext is only available at creation time — inject it directly into Scalar.
 */
async function provisionDocsToken(scope: Scope): Promise<string | null> {
  try {
    // Rotate: delete any stale preview tokens for this org from the filesystem store
    const existing = await apiTokenRepositoryFilesystem.findByOrganization(scope);
    await Promise.all(
      existing
        .filter((t) => t.name === DOCS_PREVIEW_TOKEN_NAME)
        .map((t) => apiTokenRepositoryFilesystem.delete(t.id, scope))
    );

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const apiTokenService = createApiTokenServiceImpl({ apiTokenRepository: apiTokenRepositoryFilesystem });
    const result = await apiTokenService.createToken({
      name: DOCS_PREVIEW_TOKEN_NAME,
      organizationId: scope.organizationId,
      companyId: scope.companyId,
      expiresAt,
    });

    return result.token; // plaintext — only available here
  } catch (err) {
    console.error('[api/v1/docs] Could not provision docs preview token:', err);
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function injectItemIdExamples(paths: Record<string, any>, exampleItemId: string): void {
  for (const [path, pathItem] of Object.entries(paths)) {
    if (!path.includes('{id}')) continue;
    for (const operation of Object.values(pathItem as Record<string, unknown>)) {
      if (typeof operation !== 'object' || !operation) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const op = operation as Record<string, any>;
      if (!Array.isArray(op.parameters)) continue;
      for (const param of op.parameters) {
        if (param.name === 'id' && param.in === 'path') {
          param.example = exampleItemId;
        }
      }
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildPersonalizedSpec(baseUrl: string, scope: Scope, docsToken: string | null): Promise<Record<string, any>> {
  const [baseSpecRes, recentItemsRaw, tokenResult] = await Promise.all([
    fetch(`${baseUrl}/api/openapi.json`),
    prisma.asset.findMany({
      where: scopeWhere(scope),
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, name: true },
    }),
    listApiTokens().catch(() => ({ success: false as const, data: [] })),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const spec: Record<string, any> = await baseSpecRes.json();

  const recentItems = recentItemsRaw.map((i) => ({ id: i.id, name: i.name }));
  const tokenNames = (tokenResult.success ? tokenResult.data : [])
    .filter((t) => t.name !== DOCS_PREVIEW_TOKEN_NAME)
    .map((t) => t.name);
  const exampleItemId = recentItems[0]?.id ?? 'PROD_ID';

  // ── Servers ───────────────────────────────────────────────────────────────
  // /api/v1-sandbox is a URL alias (rewritten to /api/v1 by Next.js).
  // Sandbox mode is activated by the auth token, not the URL — the separate
  // path just makes it easy to configure external clients for sandbox testing.
  const prodUrl = process.env.NEXT_PUBLIC_API_URL || `${baseUrl}/api/v1`;
  const sandboxUrl = prodUrl.replace(/\/api\/v1$/, '/api/v1-sandbox');
  spec.servers = [
    { url: prodUrl, description: 'Production' },
    { url: sandboxUrl, description: 'Sandbox' },
  ];

  // ── Quick Start guide in info.description ────────────────────────────────
  const quickStart = buildQuickStartDescription(recentItems, tokenNames, docsToken !== null);
  spec.info = {
    ...spec.info,
    description: quickStart + (spec.info?.description ?? ''),
  };

  // ── Inject real item ID into path parameter examples ─────────────────────
  if (spec.paths) {
    injectItemIdExamples(spec.paths, exampleItemId);
  }

  return spec;
}

const customCss = `
  /* ── Brand accent ─────────────────────────────────── */
  :root,
  .light-mode,
  .dark-mode {
    --scalar-color-accent: #0d6efd;
  }

  /* ── Light mode: clean white with blue undertone ───── */
  .light-mode {
    --scalar-background-accent: rgba(13, 110, 253, 0.06);
    --scalar-border-color: rgba(13, 110, 253, 0.10);
  }

  /* ── Sidebar: gradient header matching the dashboard ── */
  .sidebar .sidebar-heading,
  .t-doc__sidebar .sidebar-heading {
    background: linear-gradient(135deg, rgba(13,110,253,0.08), rgba(102,16,242,0.04));
    border-bottom: 1px solid rgba(13,110,253,0.12);
  }

  /* ── Active nav item ────────────────────────────────── */
  .sidebar .sidebar-item.active > .sidebar-item-link,
  .t-doc__sidebar .sidebar-item.active > .sidebar-item-link {
    background: rgba(13, 110, 253, 0.08);
    color: #0d6efd;
    border-left: 2px solid #0d6efd;
  }

  /* ── GET badge ──────────────────────────────────────── */
  .light-mode .badge.get,
  .dark-mode .badge.get {
    background: rgba(13, 110, 253, 0.10);
    color: #0d6efd;
    border: 1px solid rgba(13,110,253,0.25);
  }

  /* ── "Try it" / Send button ─────────────────────────── */
  .scalar-button-primary,
  button[data-test-id="send-request-button"] {
    background: linear-gradient(90deg, #0d6efd, #6610f2) !important;
    border: none !important;
  }

  /* ── Section header accent bar ──────────────────────── */
  .section-header {
    border-left: 3px solid #0d6efd;
    padding-left: 10px;
  }
`;

export async function GET(request: Request) {
  const baseUrl = new URL(request.url).origin;
  let isAuthenticated = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let personalizedSpec: Record<string, any> | null = null;
  let docsToken: string | null = null;

  try {
    const scope = await requireScope();
    isAuthenticated = true;
    docsToken = await provisionDocsToken(scope);
    personalizedSpec = await buildPersonalizedSpec(baseUrl, scope, docsToken);
  } catch (err) {
    console.error('[api/v1/docs] auth/spec error:', err);
    isAuthenticated = false;
  }

  const renderHtml = ApiReference({
    // If authenticated: embed the personalized spec inline (no browser fetch needed)
    // If not: fetch the static public spec by URL
    ...(isAuthenticated && personalizedSpec
      ? { content: personalizedSpec }
      : { url: '/api/openapi.json' }),
    theme: 'alternate',
    layout: 'modern',
    darkMode: false,
    customCss,
    // Pre-fill bearer token from the provisioned docs-preview token
    authentication: {
      preferredSecurityScheme: 'BearerAuth',
      securitySchemes: {
        BearerAuth: {
          token: docsToken ?? '',
        },
      },
    },
    defaultHttpClient: {
      targetKey: 'js',
      clientKey: 'fetch',
    },
    metaData: {
      title: 'Datia API Reference',
      description: 'RESTful API for the Datia platform',
    },
  });

  return renderHtml();
}
