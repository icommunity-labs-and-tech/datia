## Manual Item ID — Detalle de cambios (rama `manual-item-id`)

### Objetivo
Permitir que el usuario introduzca manualmente el ID al crear cada item, asegurando unicidad y manteniendo la generación/uso de QR basada en ese ID.

### Cambios principales

- `prisma/schema.prisma`
  - Modelo `Item`: se elimina `@default(uuid())` del campo `id` para permitir IDs definidos por el usuario.

- `src/actions/items.ts`
  - `addItem(formData, templateFields)`: ahora exige `customId` no vacío (ID obligatorio).
  - Valida la unicidad del ID antes de crear el registro (si existe, lanza error claro).
  - Usa `categoryId` del formulario; se mantiene la creación del estado inicial “Creado”.

- `src/components/views/ItemsTable.tsx`
  - Formulario de creación: sincroniza `customId` y `categoryId` con el `formState` para que viajen al servidor.
  - `allowTemplateEditing={false}`: se desactiva la edición de template a nivel de item; solo se usan los campos definidos por la categoría.

- `src/components/AddItemModal.tsx`
  - Campo `customId` marcado como `required` y con copy explicativo de obligatoriedad/unicidad.
  - Manejo de errores en el modal para mostrar feedback de servidor (por ejemplo, ID duplicado).

- `src/app/operator/page.tsx`
  - El template base del formulario incluye `customId` como requerido.

### UX/Comportamiento

- El campo ID es obligatorio al crear el item.
- Si el ID ya existe, se muestra un error y no se crea el item.
- La tabla no muestra el ID; solo se usa como identificador interno y para enlaces.
- La generación y lectura de QR sigue funcionando con el ID definido por el usuario.

### Consideraciones

- La edición de campos específicos de item (template) está deshabilitada; los campos a rellenar provienen del template de la categoría.
- Retrocompatibilidad: items existentes siguen funcionando sin cambios.

### Pendiente (opcional/futuro)

- Entrada por QR externo (pegar URL o ID/escaneo) — aparcado por ahora.


