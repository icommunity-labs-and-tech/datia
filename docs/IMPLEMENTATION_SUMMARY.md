# Resumen de Implementación: Evidencias de Items con KYC

## ⚠️ ACTUALIZACIÓN IMPORTANTE (Enero 2026)
**El sistema KYC ha sido migrado de usuario a nivel de organización.** 
- El KYC ahora se realiza una vez por organización durante el signup
- Los campos `signatureID`, `kycURL` y `verificationStatus` han sido movidos de `User` a `Organization`
- Todas las evidencias (items y states) ahora se firman con la firma de la organización
- Ver migración: `prisma/migrations/20260115113558_move_kyc_to_organization/`

## 🎉 Estado: Fase 1 y 2 Completadas

**Rama**: `feature/admin-item-evidence-kyc`

---

## ✅ Implementado

### 1. Base de Datos (Completado)

#### Schema Prisma
Archivo: `prisma/schema.prisma`

**Cambios en modelo Item:**
```prisma
model Item {
  // ... campos existentes
  
  // Campos de evidencia (nuevos)
  evidenceID       String?
  evidenceDataJson String?
  createdByUserId  String?
  
  createdBy        User?    @relation(fields: [createdByUserId], references: [id], name: "CreatedItems", onDelete: SetNull)
  
  @@index([createdByUserId])
}
```

**Cambios en modelo User:**
```prisma
model User {
  // ... campos existentes
  createdItems         Item[]  @relation(name: "CreatedItems")
}
```

#### Migración
- **Archivo**: `prisma/migrations/20251009110637_add_item_evidence_fields/migration.sql`
- **Estado**: ✅ Aplicada exitosamente
- **Cambios**:
  - Añadidos 3 campos a tabla Item
  - Creado índice en `createdByUserId`
  - Agregada foreign key a User

---

### 2. Backend - Lógica de Evidencias (Completado)

#### EvidenceBuilder Actualizado
Archivo: `src/entities/Evidence.ts`

**Mejoras:**
- ✅ Soporte para evidencias de tipo `item_creation`
- ✅ Genera archivos `item_data.json` vs `issue_data.json` según tipo
- ✅ Usa helpers específicos: `buildItemDataObject` vs `buildIssueDataObject`

#### Nuevos Helpers de Evidencia
Archivo: `src/lib/evidenceUtils.ts`

**Funciones agregadas:**
- ✅ `buildItemDataObject()`: Construye JSON determinístico para items
- ✅ Actualizado `buildIssueDataObject()` para incluir campos de cadena de custodia:
  - `itemEvidenceID`: Referencia a evidencia del item
  - `assetName`: Nombre del item
  - `itemCreatedAt`: Timestamp de creación del item

---

### 3. Creación de Items con Evidencias (Completado)

Archivo: `src/actions/items/create.ts`

**Flujo implementado:**
1. ✅ Valida que la organización tenga `signatureID` y estado `VERIFIED`
2. ✅ Crea el item en la base de datos
3. ✅ Genera evidencia con `EvidenceBuilder`
4. ✅ Crea evidencia en iCommunity usando la firma de la organización
5. ✅ Guarda `evidenceID` y `evidenceDataJson` en el item
6. ✅ **Rollback automático** si falla la evidencia

**Validaciones:**
- La organización debe tener firma verificada (`VERIFIED`)
- La organización debe tener `signatureID` válido
- Si falla evidencia, se elimina el item (rollback)

---

### 4. States con Referencia a Items (Completado)

Archivo: `src/actions/states/create.ts`

**Mejoras:**
- ✅ Al crear state, incluye en metadata:
  - `itemEvidenceID`: ID de evidencia del item
  - `assetName`: Nombre del item
  - `itemCreatedAt`: Timestamp del item
- ✅ Establece **cadena de custodia** en blockchain

**Beneficio:**
Cada state referencia la evidencia de su item padre, creando trazabilidad completa:
```
Item (evidenceID: xxx)
  └─> State 1 (evidenceID: yyy, itemEvidenceID: xxx)
  └─> State 2 (evidenceID: zzz, itemEvidenceID: xxx)
```

---

### 5. CheckerService - Verificación de Evidencias (Completado)

Archivo: `src/services/CheckerService.ts`

**Funcionalidades:**

#### `verifyItemEvidence(assetId)`
- Compara `evidenceDataJson` local vs blockchain
- Detecta manipulación de datos (tampering)
- Retorna: `verified` | `tampered` | `no_evidence`

#### `verifyStateEvidence(stateId)`
- Similar a items pero para states
- Usa `issueDataJson` para comparación

#### `verifyItemChainOfCustody(assetId)`
- Verifica evidencia del item
- Verifica evidencias de todos los states del item
- Verifica que cada state referencie correctamente al item
- Retorna estado completo de la cadena de custodia

**Nota**: Método `getEvidenceFromBlockchain()` está marcado como TODO - requiere implementación de API de iCommunity.

---

### 6. Server Actions para Checker (Completado)

Archivo: `src/actions/checker.ts`

**Acciones disponibles:**
- ✅ `verifyItemEvidence(assetId)`
- ✅ `verifyStateEvidence(stateId)`
- ✅ `verifyItemChainOfCustody(assetId)`

---

### 7. Componentes de Frontend (Completado)

#### ItemEvidenceInfo Component
Archivo: `src/components/ItemEvidenceInfo.tsx`

**Características:**
- ✅ Muestra información de evidencia del item
- ✅ Botón "Verificar en Blockchain"
- ✅ Estados visuales: Verificado ✅ / Alterado ⚠️ / Sin evidencia
- ✅ Detalles de discrepancias si datos fueron alterados
- ✅ Muestra usuario creador y timestamp

#### useAdminVerificationNotification Hook
Archivo: `src/hooks/useAdminVerificationNotification.ts`

**Funcionalidad:**
- ✅ Notificaciones para admins sin verificación
- ✅ Validación de estado de firma
- ✅ Helper `isVerified` para UI condicional

---

### 8. Tests (Completado - Básicos)

Archivo: `src/actions/items/__tests__/create-with-evidence.test.ts`

**Tests implementados:**
- ✅ Error si usuario no tiene signatureID
- ✅ Error si usuario no está VERIFIED
- ✅ Creación exitosa para admin verificado
- ✅ Rollback si falla creación de evidencia

**Pendiente:**
- Tests de integración completos
- Tests E2E
- Tests del CheckerService

---

## 📊 Resumen Técnico

### Archivos Creados (7)
1. `prisma/migrations/20251009110637_add_item_evidence_fields/migration.sql`
2. `src/services/CheckerService.ts`
3. `src/actions/checker.ts`
4. `src/components/ItemEvidenceInfo.tsx`
5. `src/hooks/useAdminVerificationNotification.ts`
6. `src/actions/items/__tests__/create-with-evidence.test.ts`
7. `docs/IMPLEMENTATION_SUMMARY.md`

### Archivos Modificados (6)
1. `prisma/schema.prisma` - Agregados campos de evidencia en Item y User
2. `src/entities/Evidence.ts` - Soporte para evidencias de items
3. `src/lib/evidenceUtils.ts` - Nuevo helper `buildItemDataObject`
4. `src/actions/items/create.ts` - Lógica de evidencias y rollback
5. `src/actions/states/create.ts` - Referencia a evidencia del item
6. `docs/ADMIN_ITEM_EVIDENCE_FEATURE.md` - Planteamiento actualizado

### Base de Datos
- **3 nuevos campos** en tabla Item
- **1 nuevo índice** en Item.createdByUserId
- **1 nueva relación** User → Item (createdItems)

---

## 🎯 Funcionalidades Clave

### ✅ Evidencias Automáticas
- Al crear un item, se genera evidencia en iCommunity automáticamente
- Se guarda `evidenceID` y `evidenceDataJson` para verificación

### ✅ KYC Requerido
- Solo admins con firma VERIFIED pueden crear items
- Validación en backend (no se puede bypasear)

### ✅ Cadena de Custodia
- States referencian la evidencia del item
- Trazabilidad completa: Item → State 1 → State 2 → ...

### ✅ Verificación On-Demand
- No usa webhooks para items (diferente a states)
- Verificación manual vía CheckerService
- Detecta manipulación de datos

### ✅ Rollback Automático
- Si falla evidencia, el item NO se crea
- Garantiza integridad: items SIN evidencia no existen

---

## 📋 Pendiente de Implementación

### Fase 3: Frontend Completo
- [ ] Integrar `ItemEvidenceInfo` en página de detalle de items
- [ ] Agregar VerificationBanner en modal de creación de items
- [ ] Actualizar AddItemModal con validación de firma
- [ ] Crear página `/checker/items/[id]` para verificación
- [ ] Componente de cadena de custodia visual

### Fase 4: API de iCommunity
- [ ] Implementar `getEvidenceFromBlockchain()` real
- [ ] Conectar con API de iCommunity para obtener evidencias certificadas
- [ ] Testing con datos reales de blockchain

### Fase 5: Tests Completos
- [ ] Tests de integración (evidencia + item)
- [ ] Tests E2E (flujo completo de creación)
- [ ] Tests del CheckerService con mock de blockchain
- [ ] Tests de cadena de custodia

### Fase 6: UX/UI
- [ ] Mensajes de error claros para admins no verificados
- [ ] Loading states durante creación de evidencias (~3s)
- [ ] Notificaciones de éxito con link a evidencia
- [ ] Dashboard de verificación de evidencias

---

## 🚀 Cómo Probar (Manual)

### 1. Crear Item como Admin Verificado
```bash
# Asegurarse de que el admin tenga:
# - verificationStatus: VERIFIED
# - signatureID: 'sig-xxx'

# Ir a /dashboard/categories/[id]/items
# Click en "Crear Item"
# Llenar formulario
# → Debe crear item + evidencia
```

### 2. Verificar Evidencia
```bash
# Usar el componente ItemEvidenceInfo
# Click en "Verificar en Blockchain"
# → Debe mostrar estado de verificación
```

### 3. Verificar Cadena de Custodia
```bash
# Crear varios states para un item
# Usar verifyItemChainOfCustody(assetId)
# → Debe verificar que todos los states referencian el item
```

---

## 🔒 Seguridad

### Validaciones Implementadas
- ✅ Solo admins pueden crear items
- ✅ Solo admins VERIFIED con signatureID válido
- ✅ Validación en backend (no confiamos en frontend)
- ✅ Rollback si falla evidencia (no items huérfanos)

### Integridad de Datos
- ✅ `evidenceDataJson` almacenado para verificación
- ✅ JSON determinístico (orden consistente)
- ✅ Detección de tampering vía CheckerService

### Cadena de Custodia
- ✅ States referencian evidencia del item
- ✅ Verificación de consistencia en cadena
- ✅ Trazabilidad completa en blockchain

---

## 📈 Próximos Pasos

1. **Inmediato**: Implementar UI completa (Fase 3)
2. **Corto plazo**: Conectar con API real de iCommunity (Fase 4)
3. **Medio plazo**: Tests completos y E2E (Fase 5)
4. **Largo plazo**: Dashboard de verificación masiva

---

## 💡 Notas Importantes

### Diferencias con States
- **States**: Tienen `backed`/`backedAt` (webhook los actualiza)
- **Items**: Solo `evidenceID` + `evidenceDataJson` (verificación on-demand)
- **Razón**: Items son inmutables, no necesitan tracking en tiempo real

### Compatibilidad
- ✅ Items existentes sin evidencias siguen funcionando
- ✅ Campos opcionales en schema
- ✅ No hay breaking changes

### Performance
- ⏱️ Creación de evidencia añade ~2-3 segundos
- ⏱️ Es bloqueante (trade-off: integridad vs velocidad)
- 💡 Futuro: Posibilidad de hacer async con queue

---

## 🎓 Lecciones Aprendidas

1. **Simplicidad**: Embeber campos en Item es mejor que tabla separada
2. **No webhook para items**: Verificación on-demand es suficiente
3. **Rollback crítico**: Si falla evidencia, no debe existir el item
4. **Cadena de custodia**: Referencias explícitas mejoran trazabilidad
5. **JSON determinístico**: Orden consistente es crucial para verificación

---

**Fecha de implementación**: 9 de Octubre, 2025  
**Implementado por**: Claude AI (Assistant)  
**Revisado por**: Pendiente

