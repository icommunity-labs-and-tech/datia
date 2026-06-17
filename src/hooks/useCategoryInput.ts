import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getCategories, searchCategories, findOrCreateCategory } from '@/actions/categories';
import { addCategoriesToItem, removeCategoriesFromItem } from '@/actions/items';

export interface Category {
  id: string;
  name: string;
}

interface UseCategoryInputOptions {
  itemId: string;
  initialCategories: Category[];
  onUpdate?: (categories: Category[]) => void;
  disabled?: boolean;
}

export function useCategoryInput({
  itemId,
  initialCategories,
  onUpdate,
  disabled = false,
}: UseCategoryInputOptions) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<Category[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sincronizar con props cuando cambien
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  // Cargar todas las categorías disponibles
  useEffect(() => {
    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const allCats = await getCategories();
        setAllCategories(allCats);
      } catch (err) {
        console.error('Error loading categories:', err);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  // Filtrar categorías disponibles (excluir las ya asignadas) - memoizado
  const availableCategories = useMemo(() => {
    return allCategories.filter(
      (cat) => !categories.some((c) => c.id === cat.id)
    );
  }, [allCategories, categories]);

  // Filtrar sugerencias basadas en el input
  useEffect(() => {
    const filterSuggestions = async () => {
      if (inputValue.trim().length > 0) {
        try {
          const results = await searchCategories(inputValue.trim());
          const filtered = results.filter(
            (cat) => !categories.some((c) => c.id === cat.id)
          );
          setFilteredSuggestions(filtered);
          setShowDropdown(true);
        } catch (error) {
          console.error('Error searching categories:', error);
          setFilteredSuggestions([]);
        }
      } else {
        setFilteredSuggestions([]);
        setShowDropdown(false);
      }
    };

    filterSuggestions();
  }, [inputValue, categories]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        if (!inputValue.trim()) {
          setInputValue('');
        }
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown, inputValue]);

  const handleAddCategoryFromInput = useCallback(async (categoryName: string) => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // Buscar o crear la categoría
      const category = await findOrCreateCategory(categoryName);
      
      // Añadir la categoría al item
      await addCategoriesToItem(itemId, [category.id]);
      
      const newCategories = [...categories, category];
      setCategories(newCategories);
      onUpdate?.(newCategories);
      setInputValue('');
      setShowDropdown(false);
    } catch (err) {
      setError('Error al añadir la categoría');
      console.error('Error adding category:', err);
    } finally {
      setIsLoading(false);
    }
  }, [disabled, isLoading, itemId, categories, onUpdate]);

  const handleAddCategory = useCallback(async (categoryId: string) => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await addCategoriesToItem(itemId, [categoryId]);
      
      // Encontrar la categoría añadida
      const addedCategory = allCategories.find((c) => c.id === categoryId);
      if (addedCategory) {
        const newCategories = [...categories, addedCategory];
        setCategories(newCategories);
        onUpdate?.(newCategories);
      }
      
      setInputValue('');
      setShowDropdown(false);
    } catch (err) {
      setError('Error al añadir la categoría');
      console.error('Error adding category:', err);
    } finally {
      setIsLoading(false);
    }
  }, [disabled, isLoading, itemId, categories, allCategories, onUpdate]);

  const handleRemoveCategory = useCallback(async (categoryId: string) => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await removeCategoriesFromItem(itemId, [categoryId]);
      
      const newCategories = categories.filter((c) => c.id !== categoryId);
      setCategories(newCategories);
      onUpdate?.(newCategories);
    } catch (err) {
      setError('Error al eliminar la categoría');
      console.error('Error removing category:', err);
    } finally {
      setIsLoading(false);
    }
  }, [disabled, isLoading, itemId, categories, onUpdate]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleInputKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      await handleAddCategoryFromInput(inputValue.trim());
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setInputValue('');
    }
  }, [inputValue, handleAddCategoryFromInput]);

  const handleInputFocus = useCallback(() => {
    if (inputValue.trim().length > 0) {
      setShowDropdown(true);
    } else if (availableCategories.length > 0) {
      setFilteredSuggestions(availableCategories);
      setShowDropdown(true);
    }
  }, [inputValue, availableCategories]);

  return {
    // Estado
    categories,
    allCategories,
    availableCategories,
    filteredSuggestions,
    isLoading,
    isLoadingCategories,
    showDropdown,
    error,
    inputValue,
    
    // Refs
    dropdownRef,
    inputRef,
    
    // Handlers
    handleAddCategory,
    handleAddCategoryFromInput,
    handleRemoveCategory,
    handleInputChange,
    handleInputKeyDown,
    handleInputFocus,
    
    // Setters
    setShowDropdown,
    setError: (error: string | null) => setError(error),
  };
}
