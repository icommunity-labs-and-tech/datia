> **Archivado (2026-10-07).** Documento histórico, no actualizado: propuesta de la fase "Item" del modelo (items/states), superada por el modelo de activos y por el KYC a nivel de empresa (#23). No es una fuente fiable del estado actual.

# Feature: Evidencias de Creación de Items por Admins con KYC

## Resumen Ejecutivo
Implementar la creación automática de evidencias en iCommunity cuando los admins crean items en el dashboard, asegurando que los admins tengan firmas verificadas mediante proceso KYC (similar a los operadores).

### 🎯 Objetivos Clave
1. **Evidencias de Items**: Certificar automáticamente la creación de items en blockchain
2. **KYC para Admins**: Usar el sistema KYC existente para firmar evidencias
3. **Verificación en Checker**: Comparar datos locales vs blockchain para detectar manipulación
4. **Cadena de Custodia**: States deben referenciar la evidencia del item para trazabilidad completa

### 💡 Enfoque Simplificado
- **NO usar webhook** para actualizar items (a diferencia de states)
- **NO campos `backed`/`backedAt`** en Item (items son inmutables)
- **Solo 3 campos nuevos**: `evidenceID`, `evidenceDataJson`, `createdByUserId`
- **Verificación on-demand** en el checker comparando JSON vs blockchain

## Estado Actual del Sistema

### 1. Sistema de KYC Existente
**⚠️ ACTUALIZACIÓN (Enero 2026):** El KYC ahora es a nivel de organización, no de usuario.

- **Organizaciones** tienen:
  - `verificationStatus`: NOT_VERIFIED | WAITING | VERIFIED | REJECTED
  - `signatureID`: ID único de firma en iCommunity
  - `kycURL`: URL para completar el proceso KYC
- **Usuarios** ya no tienen campos de KYC (eliminados en migración 20260115113558)

### 2. Flujo de Creación de Estados (Operadores)
Los operadores actualmente crean evidencias cuando cambian estados:
- Verifican que el usuario tenga `signatureID` válido
- Usan `EvidenceBuilder` para construir archivos de evidencia
- Crean evidencia en iCommunity con título, descripción, imágenes y metadata
- Guardan `evidenceID` en el estado
- Webhook de iCommunity actualiza `backed` y `backedAt` cuando se certifica

### 3. Creación de Items Actual (Admins)
En `src/actions/items/create.ts`:
- Solo crea el item en la base de datos
- No genera evidencias
- No requiere firma verificada

## Componentes de la Feature

### 1. Modelo de Datos

#### 1.1 Actualización del Modelo Item
Agregar campos de evidencia directamente en Item:

```prisma
model Item {
  id                  String   @id
  categoryId          String
  name                String
  description         String?
  imageUrl            String?
  itemTemplate        Json     @default("[]")
  templateFields      Json?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  // NUEVOS CAMPOS para evidencias
  evidenceID          String?     // ID de evidencia en iCommunity
  evidenceDataJson    String?     // JSON certificado para verificación en checker
  createdByUserId     String?     // Usuario admin que creó el item
  
  category            Category @relation(fields: [categoryId], references: [id])
  states              State[]
  createdBy           User?    @relation(fields: [createdByUserId], references: [id], name: "CreatedItems")
  
  @@index([createdByUserId])
}
```

#### 1.2 Actualización del Modelo User
Agregar relación a los items creados:

```prisma
model User {
  // ... campos existentes
  createdStates        State[]
  createdItems         Item[]  @relation(name: "CreatedItems")
}
```

**Ventajas de este enfoque:**
- ✅ Relación 1:1 entre Item y su evidencia de creación
- ✅ Menos joins en queries (mejor performance)
- ✅ Modelo más simple y fácil de entender
- ✅ Solo almacena lo necesario: evidenceID y datos para verificación
- ✅ Verificación en el checker comparando evidenceDataJson con iCommunity (como States)
- ✅ Campos opcionales para compatibilidad con items existentes

**Nota**: No se necesitan campos `backed` ni `backedAt` - la verificación se hará en el checker comparando el `evidenceDataJson` almacenado contra la evidencia certificada en iCommunity.

### 2. Backend - Lógica de Negocio

#### 2.1 Actualizar `src/actions/items/create.ts`
Modificar la función `addItem` para:

1. **Validar firma del admin**:
   ```typescript
   const currentUser = await getCurrentUserWithDetails();
   if (!currentUser?.signatureID) {
     throw new Error('No se pudo certificar la evidencia: tu usuario no tiene una firma verificada. Completa el KYC en tu perfil.');
   }
   if (currentUser.verificationStatus !== 'VERIFIED') {
     throw new Error('Tu firma no está verificada. Completa el proceso KYC antes de crear items.');
   }
   ```

2. **Crear el item** (como actualmente)

3. **Generar evidencia con EvidenceBuilder**:
   ```typescript
   const builder = new EvidenceBuilder({
     signatureID: currentUser.signatureID,
     title: `Creación de Item: ${created.name}`,
     description: created.description || '',
     imageUrls: created.imageUrl ? [created.imageUrl] : [],
     metadata: {
       assetId: created.id,
       categoryId: created.categoryId,
       name: created.name,
       createdAt: created.createdAt.toISOString(),
       type: 'item_creation',
       templateFields: created.templateFields,
       itemTemplate: created.itemTemplate
     }
   });
   ```

4. **Crear evidencia y actualizar Item con JSON para verificación**:
   ```typescript
   // Primero generar los archivos para obtener el JSON
   const files = await builder.buildFiles();
   const jsonFile = files.find(f => f.name === 'item_data.json');
   
   // Crear la evidencia en iCommunity
   const evidenceID = await builder.createEvidence();
   
   // Guardar evidenceID y JSON en el item
   await prisma.item.update({
     where: { id: created.id },
     data: {
       evidenceID,
       evidenceDataJson: jsonFile ? Buffer.from(jsonFile.file, 'base64').toString('utf8') : null,
       createdByUserId: currentUser.id
     }
   });
   ```

5. **Manejo de errores**:
   - Si falla la creación de evidencia, eliminar el item creado
   - Retornar error descriptivo al usuario

#### 2.2 Actualizar `src/entities/Evidence.ts`
Mejorar el `EvidenceBuilder` para soportar items:

1. **Actualizar tipo de metadata**:
   ```typescript
   export type EvidencePayloadInput = {
     signatureID: string;
     title: string;
     description: string;
     imageUrls: string[];
     metadata: Record<string, unknown> & {
       type?: 'state' | 'item_creation';
       assetId?: string;
       categoryId?: string;
       // ... otros campos
     };
   };
   ```

2. **Crear helper para datos de items**:
   ```typescript
   function buildItemDataObject(metadata: any): any {
     return {
       type: 'item_creation',
       assetId: metadata.assetId,
       categoryId: metadata.categoryId,
       name: metadata.name,
       description: metadata.description,
       createdAt: metadata.createdAt,
       templateFields: metadata.templateFields,
       itemTemplate: metadata.itemTemplate,
       imageUrls: metadata.imageUrls || []
     };
   }
   ```

3. **Actualizar `buildFiles()`** para usar el helper apropiado según el tipo

#### 2.3 Webhook Handler - Sin Cambios Necesarios
**Nota importante**: El webhook handler actual NO necesita cambios para items.

El `applyEvidenceCertifiedWebhook` seguirá actualizando solo States como hasta ahora:
```typescript
async applyEvidenceCertifiedWebhook(body: EvidenceCertifiedWebhookPayload): Promise<void> {
  const evidenceId: string | undefined = body?.data?.evidence_id;
  const ts: string | undefined = body?.data?.certification_timestamp;
  if (!evidenceId) throw new Error('evidence_id missing in webhook payload');
  
  // Actualizar states (existente - sin cambios)
  await prisma.state.updateMany({
    where: { evidenceID: evidenceId },
    data: {
      backed: true,
      backedAt: ts ? new Date(ts) : new Date(),
    },
  });
  
  // Items NO necesitan actualizarse vía webhook
  // La verificación se hace en el checker comparando evidenceDataJson
}
```

**Razón**: Los items NO tienen campos `backed`/`backedAt`. La verificación de la evidencia del item se hará en el **checker** comparando el `evidenceDataJson` guardado contra la evidencia certificada en iCommunity/blockchain.

#### 2.4 Actualizar Evidencias de State para Incluir Referencia al Item
**IMPORTANTE**: Las evidencias de state deben incluir información del item para trazabilidad en blockchain.

Actualizar `src/actions/states/create.ts`:

```typescript
const builder = new EvidenceBuilder({
  signatureID,
  title: newState.title,
  description: newState.description,
  imageUrls: Array.isArray(newState.imageUrls) ? newState.imageUrls.filter((url): url is string => typeof url === 'string') : [],
  metadata: {
    id: newState.id,
    assetId,
    createdAt: newState.createdAt.toISOString(),
    type: 'state',
    
    // NUEVO: Incluir referencia a la evidencia del item
    itemEvidenceID: item.evidenceID || null,  // TX del item en blockchain
    assetName: item.name,
    itemCreatedAt: item.createdAt.toISOString(),
  },
});
```

**Beneficio**: Cada evidencia de state referencia la evidencia del item, creando una cadena de custodia completa en blockchain.

### 3. Frontend - UI/UX

#### 3.1 Banner de Verificación en Dashboard
Crear/adaptar componente para mostrar en páginas de items:

```typescript
// Reutilizar VerificationBanner.tsx
<VerificationBanner 
  variant="warning"
  context="creación de items"
/>
```

Mostrar en:
- `/dashboard/categories/[id]/items` (lista de items)
- Modal de creación de items

#### 3.2 Hook de Verificación para Admins
Crear `src/hooks/useAdminVerificationNotification.ts`:

```typescript
export function useAdminVerificationNotification({
  showNotification = true,
  context = 'creación de items'
}: Props) {
  const { user } = useAuthSeparated();
  
  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    if (user.verificationStatus === 'VERIFIED' && user.signatureID) return;
    
    // Mostrar notificación similar a operadores
    if (user.verificationStatus === 'NOT_VERIFIED') {
      publishWarningNotification(
        '⚠️ Verificación de Firma Requerida',
        `Para certificar automáticamente la creación de items, necesitas verificar tu identidad. Completa el proceso KYC en tu perfil.`
      );
    }
    // ... otros estados
  }, [user, showNotification, context]);
}
```

#### 3.3 Actualizar Modal de Creación de Items
En `src/components/AddItemModal.tsx`:

1. Importar y usar el hook de verificación
2. Deshabilitar botón de crear si no está verificado
3. Mostrar mensaje informativo si falta verificación
4. Agregar spinner durante creación de evidencia

#### 3.4 Visualización de Evidencias en Item Detail
Actualizar página de detalle de items para mostrar:

```typescript
// En /dashboard/assets/[id]/page.tsx
<Box>
  <BoxHeader title="Evidencia de Creación">
    <ItemEvidenceInfo 
      evidenceId={item.evidenceID}
      evidenceDataJson={item.evidenceDataJson}
      createdBy={item.createdBy}
      createdAt={item.createdAt}
    />
  </BoxHeader>
</Box>
```

Componente `ItemEvidenceInfo` mostrará:
- ID de evidencia en iCommunity
- Enlace para verificar en blockchain
- Usuario que creó el item
- Timestamp de creación
- Botón para verificar en el checker (compara evidenceDataJson con blockchain)

### 4. Sistema de Notificaciones

#### 4.1 Notificación de Éxito
Cuando se crea item + evidencia exitosamente:

```typescript
publishSuccessNotification(
  'Item y Evidencia Creados',
  `Se ha creado el item "${item.name}" y su evidencia ha sido certificada en iCommunity.`
);
```

#### 4.2 Notificación de Error
Si falla la creación de evidencia:

```typescript
publishErrorNotification(
  'Error al Certificar Evidencia',
  `El item fue creado pero no se pudo certificar la evidencia: ${error.message}. Por favor, contacta al administrador.`
);
```

### 5. Migración de Base de Datos

#### 5.1 Migration Script
```sql
-- Agregar campos de evidencia a la tabla Item
ALTER TABLE "Item" ADD COLUMN "evidenceID" TEXT;
ALTER TABLE "Item" ADD COLUMN "evidenceDataJson" TEXT;
ALTER TABLE "Item" ADD COLUMN "createdByUserId" TEXT;

-- Agregar foreign key para createdByUserId
ALTER TABLE "Item" ADD CONSTRAINT "Item_createdByUserId_fkey" 
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL;

-- Crear índice para búsquedas por creador
CREATE INDEX "Item_createdByUserId_idx" ON "Item"("createdByUserId");
```

**Nota**: Solo 3 campos nuevos - no necesitamos `backed` ni `backedAt` porque la verificación se hace en el checker.

#### 5.2 Migración de Items Existentes (Opcional)
Script para crear evidencias retroactivas de items existentes:

```typescript
// scripts/backfill-item-evidences.mjs
// Solo para items creados por admins verificados
// Crear evidencias con timestamp histórico
```

### 6. Checker - Verificación de Evidencias

#### 6.1 Funcionalidad del Checker para Items
El checker debe verificar que los datos del item coincidan con lo certificado en blockchain.

**Nueva ruta**: `/checker/items/[id]`

Funcionalidad:
1. Obtener item de la DB con su `evidenceDataJson`
2. Consultar evidencia en iCommunity usando `evidenceID`
3. Comparar el JSON local vs el certificado en blockchain
4. Mostrar resultado de verificación:
   - ✅ Verificado: Los datos coinciden
   - ❌ Alterado: Los datos NO coinciden (posible manipulación)
   - ⚠️ Sin evidencia: El item no tiene evidencia certificada

#### 6.2 Verificación de States con Referencia a Item
Actualizar el checker de states para verificar también la referencia al item:

```typescript
// En /checker/states/[id]
// Verificar que:
1. El state existe y tiene evidenceDataJson
2. El issueDataJson contiene itemEvidenceID
3. El itemEvidenceID referenciado existe en blockchain
4. Los datos del item referenciado son consistentes

// Mostrar cadena de custodia:
Item (evidenceID: xxx) 
  └─> State 1 (evidenceID: yyy, ref: xxx)
  └─> State 2 (evidenceID: zzz, ref: xxx)
```

#### 6.3 Implementación del Checker Service

```typescript
// src/services/CheckerService.ts

export class CheckerService {
  /**
   * Verifica la evidencia de un item
   */
  async verifyItemEvidence(assetId: string): Promise<VerificationResult> {
    const item = await prisma.item.findUnique({
      where: { id: assetId },
      include: { createdBy: true }
    });
    
    if (!item?.evidenceID || !item?.evidenceDataJson) {
      return { status: 'no_evidence', message: 'Item sin evidencia certificada' };
    }
    
    // Obtener evidencia de iCommunity/blockchain
    const blockchainEvidence = await this.getEvidenceFromBlockchain(item.evidenceID);
    
    // Comparar JSON
    const localData = JSON.parse(item.evidenceDataJson);
    const blockchainData = blockchainEvidence.data;
    
    const matches = this.deepEqual(localData, blockchainData);
    
    return {
      status: matches ? 'verified' : 'tampered',
      message: matches 
        ? 'Los datos del item coinciden con la evidencia certificada' 
        : 'ALERTA: Los datos locales NO coinciden con blockchain',
      localData,
      blockchainData,
      evidenceID: item.evidenceID,
      certificationTimestamp: blockchainEvidence.timestamp
    };
  }
  
  /**
   * Verifica la cadena de custodia completa de un item
   */
  async verifyItemChainOfCustody(assetId: string): Promise<ChainVerificationResult> {
    // 1. Verificar evidencia del item
    const itemVerification = await this.verifyItemEvidence(assetId);
    
    // 2. Obtener y verificar todos los states del item
    const states = await prisma.state.findMany({
      where: { assetId },
      orderBy: { createdAt: 'asc' }
    });
    
    const stateVerifications = await Promise.all(
      states.map(state => this.verifyStateEvidence(state.id))
    );
    
    // 3. Verificar que cada state referencia el item correctamente
    const chainConsistency = stateVerifications.every(sv => 
      sv.metadata?.itemEvidenceID === itemVerification.evidenceID
    );
    
    return {
      itemVerification,
      stateVerifications,
      chainConsistent: chainConsistency,
      totalStates: states.length,
      message: chainConsistency 
        ? 'Cadena de custodia íntegra' 
        : 'ALERTA: Inconsistencias en la cadena de custodia'
    };
  }
}
```

#### 6.4 UI del Checker

**Componente**: `ItemEvidenceChecker.tsx`

```typescript
export default function ItemEvidenceChecker({ assetId }: Props) {
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  
  const handleVerify = async () => {
    setLoading(true);
    const result = await verifyItemEvidence(assetId);
    setVerification(result);
    setLoading(false);
  };
  
  return (
    <Box>
      <BoxHeader title="Verificación de Evidencia">
        <Button onClick={handleVerify} disabled={loading}>
          {loading ? 'Verificando...' : 'Verificar en Blockchain'}
        </Button>
      </BoxHeader>
      
      {verification && (
        <Alert variant={verification.status === 'verified' ? 'success' : 'danger'}>
          <h5>{verification.status === 'verified' ? '✅ Verificado' : '❌ Alterado'}</h5>
          <p>{verification.message}</p>
          
          {verification.status === 'tampered' && (
            <div>
              <h6>Datos Locales:</h6>
              <pre>{JSON.stringify(verification.localData, null, 2)}</pre>
              
              <h6>Datos en Blockchain:</h6>
              <pre>{JSON.stringify(verification.blockchainData, null, 2)}</pre>
            </div>
          )}
        </Alert>
      )}
    </Box>
  );
}
```

### 7. Testing

#### 6.1 Tests Unitarios
Crear `src/actions/items/__tests__/create.test.ts`:

- Test: Admin sin firma no puede crear item
- Test: Admin con firma NO_VERIFIED no puede crear item
- Test: Admin con firma VERIFIED puede crear item + evidencia
- Test: Rollback si falla creación de evidencia
- Test: Metadata correcta en evidencia

#### 7.2 Tests de Integración
- Test: Item se crea con evidenceID y evidenceDataJson
- Test: evidenceDataJson se puede parsear correctamente
- Test: Checker detecta cuando datos locales coinciden con blockchain
- Test: Checker detecta cuando datos locales NO coinciden (tampered)
- Test: State incluye itemEvidenceID en metadata
- Test: Cadena de custodia verifica correctamente

#### 6.3 Tests E2E
```typescript
// tests/e2e/admin-item-creation.spec.ts
test('Admin verificado puede crear item con evidencia', async ({ page }) => {
  // Login como admin verificado
  // Ir a creación de item
  // Llenar form y crear
  // Verificar mensaje de éxito
  // Verificar evidencia en detalle de item
});

test('Admin no verificado ve warning al crear item', async ({ page }) => {
  // Login como admin no verificado
  // Ir a creación de item
  // Verificar banner de warning
  // Intentar crear item
  // Verificar error apropiado
});
```

## Flujo de Trabajo de Usuario

### Para Admins NO Verificados:
1. Admin intenta crear item
2. Ve banner amarillo: "Necesitas verificar tu identidad para certificar items"
3. Click en "Verificar Identidad" → abre KYC URL
4. Completa proceso KYC en iCommunity
5. Webhook actualiza `verificationStatus` a VERIFIED
6. Ahora puede crear items con evidencias

### Para Admins Verificados:
1. Admin va a crear nuevo item
2. Llena formulario (nombre, descripción, categoría, template fields, imagen)
3. Click en "Crear Item"
4. Backend:
   - Valida firma verificada
   - Crea item en DB
   - Genera evidencia con EvidenceBuilder
   - Crea evidencia en iCommunity
   - Actualiza item con evidenceID, evidenceDataJson y createdByUserId
5. Frontend muestra: "Item y evidencia creados exitosamente"
6. En detalle de item, se muestra:
   - Sección "Evidencia de Creación"
   - ID de evidencia en blockchain
   - Usuario que lo creó
   - Botón "Verificar en Blockchain"
7. Admin puede verificar en cualquier momento:
   - Click en "Verificar en Blockchain"
   - Checker compara evidenceDataJson vs blockchain
   - Muestra: ✅ Verificado o ❌ Alterado
8. Al crear states del item:
   - State incluye `itemEvidenceID` en metadata
   - Crea cadena de custodia: Item → State 1 → State 2 → ...
9. Checker de cadena de custodia:
   - Verifica item
   - Verifica cada state
   - Verifica que states referencian el item correcto
   - Muestra cadena completa con estado de cada elemento

## Consideraciones Técnicas

### 1. Rendimiento
- Creación de evidencia es asíncrona pero bloqueante
- Considerar timeout apropiado
- Si iCommunity está caído, el item no se crea (trade-off: integridad vs disponibilidad)

### 2. Seguridad
- Solo admins pueden crear items
- Solo admins con firma VERIFIED pueden crear evidencias
- Validar signatureID en backend (nunca confiar en frontend)

### 3. Manejo de Errores
- Si falla evidencia, hacer rollback del item
- Logs detallados para debugging
- Mensajes de error claros para el usuario

### 4. Compatibilidad
- Items existentes sin evidencias seguirán funcionando
- Evidencias solo para nuevos items creados después del deploy
- Opción de backfill manual para items críticos

## Tareas de Implementación

### Fase 1: Backend y Base de Datos
1. ✅ Crear rama `feature/admin-item-evidence-kyc`
2. Actualizar schema.prisma agregando campos de evidencia en Item
3. Crear migración de base de datos (ALTER TABLE Item...)
4. Ejecutar migración
5. Actualizar EvidenceBuilder para soportar items (buildItemDataObject)
6. Modificar `src/actions/items/create.ts` con lógica de evidencias + JSON
7. Actualizar `src/actions/states/create.ts` para incluir itemEvidenceID
8. Crear tests unitarios

### Fase 2: Checker - Verificación de Evidencias
9. Crear CheckerService con verifyItemEvidence y verifyChainOfCustody
10. Crear ruta `/checker/items/[id]`
11. Crear componente ItemEvidenceChecker
12. Actualizar checker de states para verificar itemEvidenceID
13. Tests del checker

### Fase 3: Frontend
14. Crear/adaptar hook `useAdminVerificationNotification`
15. Actualizar AddItemModal con verificación
16. Crear componente ItemEvidenceInfo
17. Actualizar página de detalle de items
18. Agregar VerificationBanner en páginas apropiadas
19. Actualizar notificaciones de éxito/error
20. Integrar botón "Verificar en Blockchain" en item detail

### Fase 4: Testing y QA
21. Crear tests de integración
22. Crear tests E2E
23. Testing manual en ambiente de desarrollo
24. Verificar evidencias en iCommunity/blockchain
25. Verificar rollbacks funcionan correctamente
26. Testing de cadena de custodia (item + states)

### Fase 5: Documentación y Deploy
27. Actualizar documentación de usuario
28. Crear runbook para operaciones
29. Deploy a staging
30. Testing en staging
31. Deploy a producción
32. Monitoreo post-deploy

## Criterios de Éxito

- [ ] Admins verificados pueden crear items con evidencias automáticamente
- [ ] Admins no verificados ven warnings claros y no pueden crear items
- [ ] Items guardan evidenceID y evidenceDataJson correctamente
- [ ] Checker verifica evidencias de items contra blockchain
- [ ] Checker detecta manipulación de datos (tampering)
- [ ] States incluyen referencia a evidencia del item (itemEvidenceID)
- [ ] Checker verifica cadena de custodia completa (item + states)
- [ ] Rollback funciona si falla creación de evidencia
- [ ] UI muestra evidencias con botón de verificación
- [ ] Tests tienen >80% de cobertura
- [ ] No hay regresiones en funcionalidad existente
- [ ] Performance acceptable (<3s para crear item + evidencia)

## Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| iCommunity API caída | Alto | Baja | Implementar retry logic y timeout apropiado |
| Webhook no llega | Medio | Media | Implementar polling de backup o admin UI para marcar manualmente |
| Rollback falla | Alto | Muy Baja | Transaction wrapping y tests exhaustivos |
| Performance degradada | Medio | Media | Async processing en background (fase 2) |
| Admins sin poder crear items | Alto | Baja | Proceso expedito de KYC para admins |

## Notas Adicionales

### Diferencias con States
- **States**: Tienen `backed` y `backedAt` (actualizados por webhook)
- **Items**: Solo `evidenceID` y `evidenceDataJson` (verificación en checker)
- **Razón**: Items son inmutables tras creación, no necesitan tracking de certificación en tiempo real

### Cadena de Custodia
- Cada item tiene su evidencia de creación certificada
- Cada state referencia la evidencia del item (`itemEvidenceID`)
- El checker puede verificar la integridad completa:
  - Item → verificado contra blockchain
  - State 1 → verificado + referencia correcta al item
  - State 2 → verificado + referencia correcta al item
  - etc.

### Compatibilidad
- Los operadores NO se ven afectados por estos cambios
- El flujo de creación de estados se actualiza para incluir `itemEvidenceID`
- Los admins ya tienen el sistema de KYC implementado, solo falta:
  1. Forzar su uso en creación de items
  2. Crear las evidencias automáticamente
  3. Guardar el JSON para verificación
  4. Actualizar states para referenciar el item

### Futuras Mejoras
- Considerar evidencias para edición de items (changelog)
- Evidencias para borrado de items (audit trail)
- Dashboard de verificación masiva de evidencias
- Alertas automáticas si se detecta tampering

