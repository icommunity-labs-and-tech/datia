'use client';

export type FieldKey = 'id' | 'name' | 'description' | 'allCategories' | 'createdAt' | 'lastStateTitle' | 'lastStateDate' | 'customerUrl';

export interface FieldOption {
  key: FieldKey;
  label: string;
}

interface FieldSelectorProps {
  fields: FieldOption[];
  selected: FieldKey[];
  onToggle: (key: FieldKey) => void;
  idPrefix?: string;
}

const FIELD_ICONS: Record<FieldKey, string> = {
  id:             'bi-hash',
  name:           'bi-tag',
  description:    'bi-text-paragraph',
  allCategories:  'bi-folder2',
  createdAt:      'bi-calendar3',
  lastStateTitle: 'bi-shield-check',
  lastStateDate:  'bi-clock-history',
  customerUrl:    'bi-link-45deg',
};

export default function FieldSelector({
  fields,
  selected,
  onToggle,
}: FieldSelectorProps) {
  return (
    <div className="row g-2">
      {fields.map(f => {
        const isSelected = selected.includes(f.key);
        return (
          <div className="col-6 col-md-4" key={f.key}>
            <button
              type="button"
              onClick={() => onToggle(f.key)}
              style={{
                width: '100%',
                border: `2px solid ${isSelected ? '#0d6efd' : '#dee2e6'}`,
                borderRadius: 8,
                background: isSelected ? 'rgba(13,110,253,0.06)' : '#fff',
                padding: '7px 10px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {/* Icon */}
              <i
                className={`bi ${FIELD_ICONS[f.key] ?? 'bi-columns'}`}
                style={{
                  fontSize: '0.95rem',
                  color: isSelected ? '#0d6efd' : '#adb5bd',
                  flexShrink: 0,
                  transition: 'color 0.15s',
                }}
              />

              {/* Label */}
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? '#0d6efd' : '#495057',
                  lineHeight: 1.3,
                  transition: 'color 0.15s',
                }}
              >
                {f.label}
              </span>

              {/* Checkmark badge */}
              {isSelected && (
                <i
                  className="bi bi-check-circle-fill"
                  style={{
                    fontSize: '0.7rem',
                    color: '#0d6efd',
                    marginLeft: 'auto',
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
