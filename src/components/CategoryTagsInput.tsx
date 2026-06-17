'use client';

import { useState, useEffect, useRef } from 'react';
import { Form, Badge, InputGroup } from 'react-bootstrap';
import { searchCategories, findOrCreateCategory } from '@/actions/categories';

interface CategoryTagsInputProps {
  value?: string[];
  onChange: (categoryIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function CategoryTagsInput({
  value = [],
  onChange,
  placeholder = 'Añadir categorías...',
  disabled = false
}: CategoryTagsInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ id: string; name: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Array<{ id: string; name: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cargar nombres de categorías seleccionadas
    const loadCategoryNames = async () => {
      if (value.length === 0) {
        setSelectedCategories([]);
        return;
      }
      // Por ahora, solo guardamos los IDs. En el futuro podríamos cargar los nombres
      // Para simplificar, asumimos que los IDs son suficientes
      setSelectedCategories(value.map(id => ({ id, name: id })));
    };
    loadCategoryNames();
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setInputValue(query);

    if (query.trim().length > 0) {
      try {
        const results = await searchCategories(query);
        // Filtrar categorías ya seleccionadas
        const filtered = results.filter(cat => !value.includes(cat.id));
        setSuggestions(filtered);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error searching categories:', error);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleAddCategory = async (categoryId?: string, categoryName?: string) => {
    let finalCategoryId = categoryId;
    let finalCategoryName = categoryName || inputValue.trim();

    // Si no hay categoryId pero hay nombre, crear o encontrar la categoría
    if (!finalCategoryId && finalCategoryName) {
      try {
        const category = await findOrCreateCategory(finalCategoryName);
        finalCategoryId = category.id;
        finalCategoryName = category.name;
      } catch (error) {
        console.error('Error creating/finding category:', error);
        return;
      }
    }

    if (finalCategoryId && !value.includes(finalCategoryId)) {
      const newValue = [...value, finalCategoryId];
      onChange(newValue);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleRemoveCategory = (categoryId: string) => {
    const newValue = value.filter(id => id !== categoryId);
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleAddCategory(undefined, inputValue.trim());
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Eliminar última categoría si el input está vacío
      handleRemoveCategory(value[value.length - 1]);
    } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      // Focus en primera sugerencia
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="position-relative">
      <InputGroup>
        <Form.Control
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
        />
      </InputGroup>

      {/* Tags de categorías seleccionadas */}
      {value.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mt-2">
          {selectedCategories.map((cat) => (
            <Badge
              key={cat.id}
              bg="primary"
              className="d-flex align-items-center gap-1"
              style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}
            >
              {cat.name}
              {!disabled && (
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  style={{ fontSize: '0.6rem' }}
                  onClick={() => handleRemoveCategory(cat.id)}
                  aria-label="Eliminar categoría"
                />
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Sugerencias */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="position-absolute w-100 bg-white border rounded shadow-sm mt-1"
          style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}
        >
          {suggestions.map((category) => (
            <div
              key={category.id}
              className="px-3 py-2 cursor-pointer hover-bg-light"
              style={{ cursor: 'pointer' }}
              onClick={() => handleAddCategory(category.id, category.name)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              {category.name}
            </div>
          ))}
          {inputValue.trim() && !suggestions.find(c => c.name.toLowerCase() === inputValue.trim().toLowerCase()) && (
            <div
              className="px-3 py-2 cursor-pointer hover-bg-light border-top"
              style={{ cursor: 'pointer', fontStyle: 'italic', color: '#6c757d' }}
              onClick={() => handleAddCategory(undefined, inputValue.trim())}
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
  );
}

