'use client';

import { Alert } from '@mantine/core';
import { useCategoryInput, type Category } from '@/hooks/useCategoryInput';
import { IconTag } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

interface CategoryInputFieldProps {
  itemId: string;
  categories: Category[];
  onUpdate?: (categories: Category[]) => void;
  disabled?: boolean;
}

export default function CategoryInputField({
  itemId,
  categories: initialCategories,
  onUpdate,
  disabled = false,
}: CategoryInputFieldProps) {
  const t = useTranslations('forms');
  const {
    categories,
    filteredSuggestions,
    isLoading,
    showDropdown,
    error,
    inputValue,
    dropdownRef,
    inputRef,
    handleAddCategory,
    handleAddCategoryFromInput,
    handleRemoveCategory,
    handleInputChange,
    handleInputKeyDown,
    handleInputFocus,
    setShowDropdown,
    setError,
  } = useCategoryInput({
    itemId,
    initialCategories,
    onUpdate,
    disabled,
  });

  return (
    <div>
      {error && (
        <Alert color="red" mb="xs" withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div
        className="border rounded"
        style={{
          padding: '0.5rem',
          minHeight: '3rem',
          backgroundColor: '#fff',
          borderColor: '#dee2e6',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'text',
        }}
        onClick={() => {
          if (!disabled && !showDropdown) {
            setShowDropdown(true);
          }
        }}
      >
        {categories.map((cat) => (
          <span
            key={cat.id}
            className="d-inline-flex align-items-center rounded px-2 py-1"
            style={{
              fontSize: '0.875rem',
              backgroundColor: '#f8f9fa',
              color: '#212529',
              border: '1px solid #dee2e6',
              gap: '0.25rem',
              lineHeight: '1.2',
            }}
          >
            <IconTag size={12} stroke={1.8} color="var(--mantine-color-gray-6)" />
            <span>{cat.name}</span>
            {!disabled && (
              <button
                type="button"
                className="btn-close"
                style={{ fontSize: '0.6rem', marginLeft: '0.25rem', opacity: 0.5, padding: '0', lineHeight: '1' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveCategory(cat.id);
                }}
                aria-label="Eliminar categoría"
                disabled={isLoading}
              />
            )}
          </span>
        ))}
        
        {!disabled && (
          <div ref={dropdownRef} className="position-relative d-inline-flex" style={{ flex: '1', minWidth: '120px' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder={t('newTag')}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={handleInputFocus}
              disabled={isLoading}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '0.875rem',
                color: '#212529',
                backgroundColor: 'transparent',
                width: '100%',
                minWidth: '100px',
              }}
            />
            {showDropdown && (filteredSuggestions.length > 0 || inputValue.trim().length > 0) && (
              <div
                className="position-absolute bg-white border rounded shadow-sm mt-1"
                style={{
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  minWidth: '200px',
                  left: 0,
                  top: '100%',
                }}
              >
                {filteredSuggestions.map((cat) => (
                  <div
                    key={cat.id}
                    className="px-3 py-2 cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddCategory(cat.id);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    {cat.name}
                  </div>
                ))}
                {inputValue.trim() && !filteredSuggestions.find(c => c.name.toLowerCase() === inputValue.trim().toLowerCase()) && (
                  <div
                    className="px-3 py-2 cursor-pointer border-top"
                    style={{ cursor: 'pointer', fontStyle: 'italic', color: '#6c757d' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddCategoryFromInput(inputValue.trim());
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    Crear &quot;{inputValue.trim()}&quot;
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
