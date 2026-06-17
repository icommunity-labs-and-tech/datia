import { EvidenceFile, createEvidence as apiCreateEvidence } from '@/lib/icommunity';
import { createHash } from 'crypto';
import { getBaseUrl, toAbsoluteUrl } from '@/lib/http';
import { MAX_EVIDENCE_BYTES, buildIssueDataObject, buildItemDataObject, detectImageExt } from '@/lib/evidenceUtils';

export type EvidencePayloadInput = {
  signatureID: string;
  title: string;
  description: string;
  imageUrls: string[];
  metadata: Record<string, unknown>;
};

export class EvidenceBuilder {
  private signatureID: string;
  private title: string;
  private description: string;
  private imageUrls: string[];
  private metadata: Record<string, unknown>;
  private maxTotalBytes = MAX_EVIDENCE_BYTES; // 100MB raw

  constructor(input: EvidencePayloadInput) {
    this.signatureID = input.signatureID;
    this.title = input.title;
    this.description = input.description || '';
    this.imageUrls = input.imageUrls || [];
    this.metadata = input.metadata || {};
  }

  setMaxTotalBytes(bytes: number) {
    this.maxTotalBytes = bytes;
    return this;
  }

  async buildFiles(): Promise<EvidenceFile[]> {
    const files: EvidenceFile[] = [];
    let total = 0;
    const baseUrl = await getBaseUrl();

    // images with small concurrency to improve latency without high memory usage
    const concurrency = Math.max(1, Math.min(4, this.imageUrls.length));
    let index = 0;
    const results: Array<{ idx: number; file?: EvidenceFile }> = [];

    const worker = async () => {
      while (index < this.imageUrls.length) {
        const currentIndex = index++;
        const url = toAbsoluteUrl(this.imageUrls[currentIndex], baseUrl);
        try {
          const res = await fetch(url, { cache: 'no-store' as RequestCache });
          if (!res.ok) continue;
          const ct = res.headers.get('content-type') || '';
          const ext = detectImageExt(ct);
          const ab = await res.arrayBuffer();
          if (total + ab.byteLength > this.maxTotalBytes) break;
          total += ab.byteLength;
          results.push({ idx: currentIndex, file: { name: `issue_image_${currentIndex + 1}.${ext}`, file: Buffer.from(ab).toString('base64') } });
        } catch {
          // ignore
        }
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    results.sort((a, b) => a.idx - b.idx).forEach(r => { if (r.file) files.push(r.file); });

    // structured json - pass metadata fields individually to maintain deterministic order
    const type = this.metadata.type as string | undefined;
    let json: Record<string, any>;
    let fileName: string;

    if (type === 'item_creation') {
      // Build item evidence data
      json = buildItemDataObject({
        itemId: this.metadata.itemId as string,
        categoryId: this.metadata.categoryId as string,
        name: this.metadata.name as string,
        description: this.description,
        createdAt: this.metadata.createdAt as string,
        imageUrls: this.imageUrls,
        templateFields: this.metadata.templateFields,
        itemTemplate: this.metadata.itemTemplate,
      });
      fileName = 'item_data.json';
    } else {
      // Build state/issue evidence data (default)
      json = buildIssueDataObject({
        description: this.description,
        imageUrls: this.imageUrls,
        id: this.metadata.id as string,
        itemId: this.metadata.itemId as string,
        title: this.title,
        createdAt: this.metadata.createdAt as string,
        templateConfig: this.metadata.templateConfig,
        // Campos de cadena de custodia
        itemEvidenceID: this.metadata.itemEvidenceID as string | null | undefined,
        itemName: this.metadata.itemName as string | undefined,
        itemCreatedAt: this.metadata.itemCreatedAt as string | undefined,
      });
      fileName = 'issue_data.json';
    }

    const jb = Buffer.from(JSON.stringify(json, null, 2), 'utf8');
    if (total + jb.byteLength <= this.maxTotalBytes) {
      files.push({ name: fileName, file: jb.toString('base64') });
    }

    return files;
  }

  async createEvidence(): Promise<string> {
    const files = await this.buildFiles();
    return apiCreateEvidence(this.signatureID, this.title, files);
  }
}


