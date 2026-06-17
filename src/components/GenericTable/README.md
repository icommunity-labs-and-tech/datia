GenericTable split

Estructura:

- src/components/GenericTable/index.tsx: componente principal (export default) y re-export de tipos
- src/components/GenericTable/types.ts: tipos compartidos
- src/components/GenericTable/TableToolbar.tsx: barra de herramientas (filtro, acciones, añadir)
- src/components/GenericTable/DataTable.tsx: tabla (thead/tbody y selección de filas)
- src/components/GenericTable/TablePagination.tsx: paginación (react-bootstrap)
- src/components/GenericTable/GenericTable.css: estilos

Compatibilidad: se mantiene el import público `@/components/GenericTable` con default y tipos.

