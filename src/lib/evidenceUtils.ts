// Shared evidence utilities and constants

export const MAX_EVIDENCE_BYTES = 100 * 1024 * 1024; // 100MB

export function detectImageExt(contentType: string): string {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  return 'jpg';
}

type IssueDataInput = {
  id?: string;
  assetId?: string;
  title?: string;
  description: string;
  createdAt?: string | Date;
  templateConfig?: unknown;
  imageUrls?: string[];
  // Campos para cadena de custodia
  itemEvidenceID?: string | null;
  itemName?: string;
  itemCreatedAt?: string;
};

export function buildIssueDataObject(input: IssueDataInput) {
  const {
    id,
    assetId,
    title,
    description,
    createdAt,
    templateConfig,
    imageUrls = [],
    itemEvidenceID,
    itemName,
    itemCreatedAt,
  } = input;

  // Deterministic order for consistent checksums
  const result: Record<string, any> = {
    description,
    imageUrls,
  };

  if (id) result.id = id;
  if (assetId) result.assetId = assetId;
  if (title) result.title = title;
  if (createdAt) result.createdAt = createdAt;
  if (templateConfig) result.templateConfig = templateConfig;
  
  // Campos de cadena de custodia
  if (itemEvidenceID !== undefined) result.itemEvidenceID = itemEvidenceID;
  if (itemName) result.itemName = itemName;
  if (itemCreatedAt) result.itemCreatedAt = itemCreatedAt;

  return result;
}

type ItemDataInput = {
  assetId: string;
  name: string;
  description: string;
  createdAt: string | Date;
  imageUrls?: string[];
};

export function buildItemDataObject(input: ItemDataInput) {
  const {
    assetId,
    name,
    description,
    createdAt,
    imageUrls = [],
  } = input;

  // Deterministic order for consistent checksums
  const result: Record<string, any> = {
    type: 'item_creation',
    assetId,
    name,
    description,
    createdAt,
    imageUrls,
  };


  return result;
}


