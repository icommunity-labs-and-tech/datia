export interface EntityConfig {
  name: string;
  displayName: string;
  listPath: string;
  detailPath: (id: string) => string;
  editPath?: (id: string) => string; // Opcional para entidades que no permiten edición
  hasCascade: boolean;
  cascadeFields?: string[];
  getDetailsFunction?: string;
}

export const entityConfigs: Record<string, EntityConfig> = {
  categories: {
    name: 'categories',
    displayName: 'Categoría',
    listPath: '/dashboard/categories',
    detailPath: (id: string) => `/dashboard/categories/${id}`,
    editPath: (id: string) => `/dashboard/categories/${id}/edit`,
    hasCascade: true,
    cascadeFields: ['items'],
    getDetailsFunction: 'getCategoryDetails',
  },
  items: {
    name: 'items',
    displayName: 'Item',
    listPath: '/dashboard/assets',
    detailPath: (id: string) => `/dashboard/assets/${id}`,
    // Nothing of the asset is shown as cascade any more: its state history is
    // gone (#63) and its proofs survive it, linked to the emissions.
    hasCascade: false,
    getDetailsFunction: 'getAssetDetails',
  },
  users: {
    name: 'users',
    displayName: 'Usuario',
    listPath: '/dashboard/users',
    detailPath: (id: string) => `/dashboard/users/${id}`,
    editPath: (id: string) => `/dashboard/users/${id}/edit`,
    hasCascade: false,
  },
};

export function getEntityConfig(entityType: string): EntityConfig | undefined {
  return entityConfigs[entityType];
}

export function getCascadeInfo(entity: any, entityType: string) {
  const config = getEntityConfig(entityType);
  if (!config || !config.hasCascade || !config.cascadeFields) {
    return undefined;
  }

  const cascadeInfo: Record<string, any> = {};
  
  config.cascadeFields.forEach(field => {
    if (entity[field] && Array.isArray(entity[field])) {
      const count = entity._count?.[field] || entity[field].length;
      const names = entity[field].slice(0, 5).map((item: any) => item.name || item.title);
      
      cascadeInfo[`${field}Deleted`] = count;
      cascadeInfo[`${field}Names`] = names;
    }
  });

  return cascadeInfo;
}
