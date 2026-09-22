import { EvidenceService, type EvidencePayloadInput, type EvidenceFile } from './EvidenceService';
import { EvidenceInputError, ImageFetchError, ImageSizeExceededError, EvidenceBuildError } from './errors';
import { ICommunityConfigError, ICommunityHTTPError } from '../../infrastructure/icommunity/errors';
import type { ICommunityService } from '../../infrastructure/icommunity/ICommunityService';
import { MAX_EVIDENCE_BYTES, buildIssueDataObject, buildItemDataObject, detectImageExt } from '@/lib/evidenceUtils';
import { getBaseUrl, toAbsoluteUrl } from '@/lib/http';

async function buildFiles(
  input: EvidencePayloadInput,
  baseUrl: string
): Promise<EvidenceFile[]> {
  // Validate input
  if (!input.signatureID) {
    throw new EvidenceInputError('signatureID', 'signatureID is required');
  }
  if (!input.title) {
    throw new EvidenceInputError('title', 'title is required');
  }
  if (!input.metadata) {
    throw new EvidenceInputError('metadata', 'metadata is required');
  }

  const files: EvidenceFile[] = [];
  let totalBytes = 0;

  // Process images with concurrency control
  const concurrency = Math.max(1, Math.min(4, input.imageUrls.length));
  const imageResults: Array<{ idx: number; file?: EvidenceFile }> = [];
  let index = 0;

  async function processImage(currentIndex: number, url: string): Promise<{ idx: number; file?: EvidenceFile }> {
    let lastError: Error | null = null;
    
    // Retry logic (3 attempts with exponential backoff)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const absoluteUrl = toAbsoluteUrl(url, baseUrl);
        
        // Timeout using AbortSignal
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds
        
        const response = await fetch(absoluteUrl, { 
          cache: 'no-store' as RequestCache,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new ImageFetchError(url, `HTTP ${response.status}: ${response.statusText}`, response.status);
        }

        const contentType = response.headers.get('content-type') || '';
        const ext = detectImageExt(contentType);
        const arrayBuffer = await response.arrayBuffer();

        if (totalBytes + arrayBuffer.byteLength > MAX_EVIDENCE_BYTES) {
          throw new ImageSizeExceededError(
            totalBytes + arrayBuffer.byteLength,
            MAX_EVIDENCE_BYTES,
            `Total evidence size would exceed ${MAX_EVIDENCE_BYTES} bytes`
          );
        }

        totalBytes += arrayBuffer.byteLength;
        return {
          idx: currentIndex,
          file: {
            name: `issue_image_${currentIndex + 1}.${ext}`,
            file: Buffer.from(arrayBuffer).toString('base64')
          }
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on last attempt
        if (attempt === 2) {
          break;
        }
        
        // Exponential backoff: 100ms, 200ms, 400ms
        const delay = Math.pow(2, attempt) * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new ImageFetchError(url, 'Failed to fetch image after retries');
  }

  // Process images concurrently
  const imagePromises: Promise<void>[] = [];
  for (let i = 0; i < concurrency; i++) {
    imagePromises.push(
      (async () => {
        while (index < input.imageUrls.length) {
          const currentIndex = index++;
          const url = input.imageUrls[currentIndex];
          const result = await processImage(currentIndex, url);
          imageResults.push(result);
        }
      })()
    );
  }

  await Promise.all(imagePromises);

  // Sort and add image files
  imageResults
    .sort((a, b) => a.idx - b.idx)
    .forEach(r => { if (r.file) files.push(r.file); });

  // Build JSON file
  const type = input.metadata.type as string | undefined;
  let json: Record<string, any>;
  let fileName: string;

  if (type === 'item_creation') {
    json = buildItemDataObject({
      itemId: input.metadata.itemId as string,
      categoryId: input.metadata.categoryId as string,
      name: input.metadata.name as string,
      description: input.description,
      createdAt: input.metadata.createdAt as string,
      imageUrls: input.imageUrls,
      templateFields: input.metadata.templateFields,
      itemTemplate: input.metadata.itemTemplate,
    });
    fileName = 'item_data.json';
  } else {
    json = buildIssueDataObject({
      description: input.description,
      imageUrls: input.imageUrls,
      id: input.metadata.id as string,
      itemId: input.metadata.itemId as string,
      title: input.title,
      createdAt: input.metadata.createdAt as string,
      templateConfig: input.metadata.templateConfig,
      itemEvidenceID: input.metadata.itemEvidenceID as string | null | undefined,
      itemName: input.metadata.itemName as string | undefined,
      itemCreatedAt: input.metadata.itemCreatedAt as string | undefined,
    });
    fileName = 'issue_data.json';
  }

  const jsonBuffer = Buffer.from(JSON.stringify(json, null, 2), 'utf8');
  if (totalBytes + jsonBuffer.byteLength <= MAX_EVIDENCE_BYTES) {
    files.push({ name: fileName, file: jsonBuffer.toString('base64') });
  } else {
    throw new ImageSizeExceededError(
      totalBytes + jsonBuffer.byteLength,
      MAX_EVIDENCE_BYTES,
      `Total evidence size would exceed ${MAX_EVIDENCE_BYTES} bytes including JSON`
    );
  }

  return files;
}

async function createEvidenceWithRetry(
  icommunity: ICommunityService,
  signatureID: string,
  title: string,
  files: EvidenceFile[],
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await icommunity.createEvidence(signatureID, title, files);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // Exponential backoff: 200ms, 400ms, 800ms
      const delay = Math.pow(2, attempt) * 200;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Failed to create evidence after retries');
}

export function createEvidenceServiceImpl(deps: {
  icommunityService: ICommunityService;
}): EvidenceService {
  const { icommunityService: icommunity } = deps;

  return {
    async createItemEvidence(input: EvidencePayloadInput): Promise<string> {
      try {
        const baseUrl = await getBaseUrl();
        const files = await buildFiles(input, baseUrl);
        return await createEvidenceWithRetry(icommunity, input.signatureID, input.title, files);
      } catch (error) {
        if (error instanceof EvidenceInputError || error instanceof ImageFetchError || 
            error instanceof ImageSizeExceededError || error instanceof EvidenceBuildError ||
            error instanceof ICommunityConfigError || error instanceof ICommunityHTTPError) {
          throw error;
        }
        throw new EvidenceBuildError('fileAssembly', `Failed to build evidence files: ${error}`, error);
      }
    },

    async createCertificationEvidence(input: EvidencePayloadInput): Promise<string> {
      try {
        const baseUrl = await getBaseUrl();
        const files = await buildFiles(input, baseUrl);
        return await createEvidenceWithRetry(icommunity, input.signatureID, input.title, files);
      } catch (error) {
        if (error instanceof EvidenceInputError || error instanceof ImageFetchError || 
            error instanceof ImageSizeExceededError || error instanceof EvidenceBuildError ||
            error instanceof ICommunityConfigError || error instanceof ICommunityHTTPError) {
          throw error;
        }
        throw new EvidenceBuildError('fileAssembly', `Failed to build evidence files: ${error}`, error);
      }
    },
  };
}
