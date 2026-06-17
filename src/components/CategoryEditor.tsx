'use client';

import CategoryInputField from './CategoryInputField';
import { type Category } from '@/hooks/useCategoryInput';

interface CategoryEditorProps {
  itemId: string;
  categories: Category[];
  onUpdate?: (categories: Category[]) => void;
  disabled?: boolean;
  compact?: boolean; // Para usar en tabla
}

export default function CategoryEditor({
  itemId,
  categories: initialCategories,
  onUpdate,
  disabled = false,
  compact = false,
}: CategoryEditorProps) {
  // Si no es compacto, usar el componente CategoryInputField completo
  if (!compact) {
    return (
      <CategoryInputField
        itemId={itemId}
        categories={initialCategories}
        onUpdate={onUpdate}
        disabled={disabled}
      />
    );
  }

  // Versión compacta para tabla - solo mostrar tags sin edición
  return (
    <div style={{ minWidth: '150px' }}>
      <div
        className="d-flex flex-wrap align-items-center gap-1"
        style={{
          padding: '0.25rem 0',
        }}
      >
        {initialCategories.length === 0 ? (
          <span className="text-muted small">Sin categorías</span>
        ) : (
          initialCategories.map((cat) => (
            <span
              key={cat.id}
              className="d-inline-flex align-items-center"
              style={{
                fontSize: '0.75rem',
                color: '#212529',
                padding: '0 0.25rem',
                gap: '0.1rem',
                lineHeight: '1',
                height: 'auto',
                display: 'inline-flex',
              }}
            >
              <i className="bi bi-tag-fill" style={{ fontSize: '0.65rem', lineHeight: '1', color: '#6c757d' }}></i>
              <span style={{ lineHeight: '1' }}>{cat.name}</span>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
