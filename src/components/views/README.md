# Vistas Reutilizables

Este directorio contiene vistas reutilizables extraídas del dashboard que pueden ser utilizadas en otras páginas del sistema.

## Vistas Disponibles

### 1. ItemsTable
Tabla de inventario de items con funcionalidad completa de CRUD.

**Props:**
- `title?: string` - Título personalizado (default: "Inventario de items")
- `showBox?: boolean` - Si mostrar el componente Box (default: true)
- `onItemSelect?: (item: any) => void` - Callback cuando se selecciona un item
- `customActions?: Array<{ label: string; onClick: (row: any) => void }>` - Acciones personalizadas
- `customColumns?: Array<{ key: string; label: string; render: (item: any) => React.ReactNode }>` - Columnas personalizadas

**Ejemplo de uso:**
```tsx
import { ItemsTable } from '@/components/views';

// Uso básico
<ItemsTable />

// Con personalización
<ItemsTable 
  title="Mi Inventario"
  showBox={false}
  onItemSelect={(item) => console.log('Item seleccionado:', item)}
  customActions={[
    { label: 'Exportar', onClick: (row) => exportItem(row) }
  ]}
/>
```

### 2. CategoriesTable
Tabla de categorías con funcionalidad básica de CRUD.

**Props:**
- `title?: string` - Título personalizado (default: "Categorías")
- `showBox?: boolean` - Si mostrar el componente Box (default: true)
- `onCategorySelect?: (category: any) => void` - Callback cuando se selecciona una categoría
- `customActions?: Array<{ label: string; onClick: (row: any) => void }>` - Acciones personalizadas
- `customColumns?: Array<{ key: string; label: string; render: (category: any) => React.ReactNode }>` - Columnas personalizadas

### 4. StatesTable
Tabla de estados con navegación a items.

**Props:**
- `title?: string` - Título personalizado (default: "Listado de estados")
- `showBox?: boolean` - Si mostrar el componente Box (default: true)
- `onStateSelect?: (state: any) => void` - Callback cuando se selecciona un estado
- `customActions?: Array<{ label: string; onClick: (row: any) => void }>` - Acciones personalizadas
- `customColumns?: Array<{ key: string; label: string; render: (state: any) => React.ReactNode }>` - Columnas personalizadas

### 5. PassportsQuickAccess
Vista de acceso rápido a pasaportes con escáner QR y búsqueda.

**Props:**
- `title?: string` - Título personalizado (default: "Pasaporte digital")
- `showBox?: boolean` - Si mostrar el componente Box (default: true)
- `onItemSelect?: (item: any) => void` - Callback cuando se selecciona un item
- `showHeader?: boolean` - Si mostrar el header (default: true)

## Características Comunes

Todas las vistas comparten las siguientes características:

1. **Props personalizables**: Títulos, acciones, columnas y callbacks personalizables
2. **Control de Box**: Opción para mostrar/ocultar el componente Box wrapper
3. **Callbacks de selección**: Manejo personalizado de eventos de selección
4. **Acciones personalizadas**: Capacidad de agregar acciones adicionales
5. **Columnas personalizadas**: Soporte para columnas adicionales
6. **Navegación inteligente**: Navegación automática o callbacks personalizados

## Casos de Uso

### En el Dashboard
```tsx
// Uso directo sin personalización
<ItemsTable />
```

### En otras páginas
```tsx
// Con personalización para uso específico
<ItemsTable 
  showBox={false}
  onItemSelect={handleItemSelection}
  customActions={[
    { label: 'Agregar a lista', onClick: addToList }
  ]}
/>
```

### En modales o popups
```tsx
// Sin Box para usar en modales
<CategoriesTable 
  showBox={false}
  onCategorySelect={handleCategorySelection}
/>
```

## Beneficios

1. **Reutilización**: Las mismas vistas pueden usarse en múltiples contextos
2. **Consistencia**: Mantiene el mismo comportamiento y apariencia en toda la aplicación
3. **Mantenibilidad**: Cambios en una vista se reflejan en todos los lugares donde se usa
4. **Flexibilidad**: Props personalizables permiten adaptación a diferentes necesidades
5. **Separación de responsabilidades**: Lógica de negocio separada de la presentación
