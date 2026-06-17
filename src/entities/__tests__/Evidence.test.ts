import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EvidenceBuilder } from '@/entities/Evidence';

// Mock lib/http to avoid next/headers dependency in tests
vi.mock('@/lib/http', () => ({
  getBaseUrl: async () => 'http://example.test',
  toAbsoluteUrl: (url: string, baseUrl: string) =>
    /^https?:\/\//i.test(url) ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`,
}));

// Capture calls to icommunity createEvidence
const createEvidenceSpy = vi.fn(async () => 'evi-123');
vi.mock('@/lib/icommunity', () => ({
  createEvidence: (...args: any[]) => createEvidenceSpy(...args),
}));

// Helper to mock fetch returning an ArrayBuffer and content-type
function mockFetchImage(bytes: number[], contentType = 'image/jpeg') {
  const buffer = new Uint8Array(bytes).buffer;
  (global as any).fetch = vi.fn(async (_url: string) => ({
    ok: true,
    headers: {
      get: (k: string) => (k.toLowerCase() === 'content-type' ? contentType : null),
    },
    arrayBuffer: async () => buffer,
  }));
}

describe('EvidenceBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds files including one image and issue_data.json', async () => {
    mockFetchImage([1, 2, 3, 4], 'image/jpeg');

    const builder = new EvidenceBuilder({
      signatureID: 'sig-1',
      title: 'Test issue',
      description: 'Desc',
      imageUrls: ['/uploads/issue/1.jpg'],
      metadata: { id: 'issue-1', itemId: 'item-1' },
    });

    const files = await builder.buildFiles();
    expect(files.length).toBe(2);

    const image = files.find((f) => f.name.startsWith('issue_image_1.'))!;
    expect(image).toBeTruthy();
    // base64 should be non-empty
    expect(image.file.length).toBeGreaterThan(0);

    const json = files.find((f) => f.name === 'issue_data.json')!;
    const decoded = Buffer.from(json.file, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    expect(parsed.description).toBe('Desc');
    expect(parsed.id).toBe('issue-1');
    expect(parsed.itemId).toBe('item-1');
    expect(Array.isArray(parsed.imageUrls)).toBe(true);
  });

  it('creates evidence calling icommunity client with built files', async () => {
    mockFetchImage([5, 4, 3, 2, 1], 'image/png');

    const builder = new EvidenceBuilder({
      signatureID: 'sig-xyz',
      title: 'Another issue',
      description: 'Details',
      imageUrls: ['/img.png'],
      metadata: { id: 'issue-2', itemId: 'item-9' },
    });

    const evidenceId = await builder.createEvidence();
    expect(evidenceId).toBe('evi-123');
    expect(createEvidenceSpy).toHaveBeenCalledTimes(1);
    const [sig, title, files] = createEvidenceSpy.mock.calls[0];
    expect(sig).toBe('sig-xyz');
    expect(title).toBe('Another issue');
    expect(Array.isArray(files)).toBe(true);
    expect(files.length).toBe(2);
  });
});


