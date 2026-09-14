# Modelo de Evidencia y Auditoría (Bloque 7 — EU ESPR/DPP)

Documenta la estructura de evidencia utilizada para certificar registros de emisiones de CO₂ en la plataforma Datia, y el proceso de verificación que permite probar que los datos originales no han sido modificados tras la certificación.

> **Septiembre de 2026:** las emisiones ya no esperan a `POST /certify`: se
> certifican solas al escribirse. El flujo nuevo, los webhooks y lo que
> queda pendiente están en [CERTIFICACION_AUTOMATICA.md](./CERTIFICACION_AUTOMATICA.md).
> La estructura de la evidencia y la verificación de este documento siguen vigentes.

---

## 1. Contexto

Cuando un registro de emisiones (`EmissionRecord`) se certifica vía `POST /api/v1/emissions/:id/certify`, el sistema:

1. Construye un payload JSON con los datos de la emisión.
2. Lo envía a **iCommunity iBS** (Immutable Blockchain Storage), que lo ancla en blockchain y devuelve un `evidenceID` (referencia de transacción).
3. Almacena ese `evidenceID` en el `State` asociado al `Item`.
4. Marca el `EmissionRecord` como `VERIFIED` en base de datos.
5. Emite un evento `co2_certification_event` en el `EventLog`.

La verificación posterior (`GET /api/v1/emissions/:id/verify`) recupera el JSON almacenado en blockchain, calcula su SHA-256 y compara los campos críticos contra los valores actuales en base de datos, detectando cualquier discrepancia.

---

## 2. Estructura de evidencia (`EvidenceAuditRecord`)

```typescript
interface EvidenceAuditRecord {
  blockchain_tx: string;               // evidenceID devuelto por iBS (referencia de tx)
  timestamp: string;                   // ISO 8601 — momento en que iBS ancló la evidencia
  source: string;                      // fuente del factor de emisión (p.ej. "IEA 2023")
  event_type: 'co2_certification_event'; // tipo de evento, siempre este valor
  hash: string;                        // SHA-256 hex del JSON almacenado en iBS
}
```

Este tipo está definido en [`src/domain/energy/EnergyTypes.ts`](../src/domain/energy/EnergyTypes.ts).

---

## 3. JSON almacenado en blockchain (`issue_data.json`)

El archivo `issue_data.json` que se ancla en iBS tiene esta estructura:

```json
{
  "description": "Emisión certificada por AENOR según ISO 14064-3",
  "imageUrls": [],
  "id": "state-uuid",
  "itemId": "item-uuid",
  "title": "Certificación Energética — 42.5 kg CO₂e",
  "createdAt": "2026-07-15T10:00:00.000Z",
  "templateConfig": {
    "emissionRecordId": "emission-uuid",
    "co2eKg": 42.5,
    "scope": "SCOPE_2",
    "systemBoundary": "CRADLE_TO_GATE",
    "calculationMethodology": "GHG Protocol",
    "emissionFactor": 0.233,
    "emissionFactorSource": "IEA 2023",
    "gwpCharacterizationFactors": "IPCC AR6",
    "functionalUnit": "kWh",
    "verifierBody": "AENOR",
    "verificationStandard": "ISO 14064-3",
    "certifiedAt": "2026-07-15T10:00:00.000Z"
  }
}
```

El `hash` del `EvidenceAuditRecord` es el SHA-256 de este JSON completo (codificado en UTF-8, tal como lo devuelve iBS en base64).

---

## 4. Proceso de verificación

```
Emisión VERIFIED
     │
     ▼
EventLog (co2_certification_event)
     │  data.evidenceID  →  iBS
     │  data.stateId
     ▼
GET /api/v1/emissions/:id/verify
     │
     ├── 1. Cargar EmissionRecord de la BD (valores actuales)
     ├── 2. Localizar evento de certificación en EventLog
     ├── 3. icommunityService.getEvidence(evidenceID) → issue_data.json
     ├── 4. sha256(issue_data.json) → hash
     └── 5. Comparar campos críticos:
             co2eKg, scope, systemBoundary,
             emissionFactorSource, verifierBody,
             verificationStandard
                  │
         ┌────────┴────────┐
         │                 │
    verified: true    verified: false
    discrepancies: [] discrepancies: ["co2eKg: stored=42.5, current=99.9"]
```

**Campos comparados en la verificación:**

| Campo | Tipo | Significado |
|-------|------|-------------|
| `co2eKg` | number | Emisiones en kg CO₂ equivalente |
| `scope` | enum | Alcance GHG (SCOPE_1/2/3) |
| `systemBoundary` | enum | Frontera del sistema (CRADLE_TO_GATE, etc.) |
| `emissionFactorSource` | string | Fuente del factor de emisión utilizado |
| `verifierBody` | string | Organismo certificador |
| `verificationStandard` | string | Norma de verificación (p.ej. ISO 14064-3) |

---

## 5. Informe de verificación (`EmissionVerificationReport`)

```typescript
interface EmissionVerificationReport {
  emissionRecordId: string;
  stateId: string;
  verified: boolean;        // true si todos los campos coinciden con iBS
  evidence: EvidenceAuditRecord;
  originalData: {
    co2eKg: number;
    scope: EmissionScope;
    systemBoundary: SystemBoundary;
    verifierBody: string;
    verificationStandard: string;
    certifiedAt: string;
  };
  discrepancies: string[];  // lista de "campo: stored=X, current=Y" si los hay
}
```

---

## 6. Ejemplos verificables

### 6.1 Certificar una emisión

**Request:**
```
POST /api/v1/emissions/emission-abc123/certify
Authorization: Bearer <api-token>
Content-Type: application/json

{
  "verifierBody": "AENOR",
  "verificationStandard": "ISO 14064-3"
}
```

**Response 200:**
```json
{
  "data": {
    "emissionRecordId": "emission-abc123",
    "verificationStatus": "VERIFIED",
    "stateId": "state-xyz789",
    "evidenceID": "ev_1a2b3c4d5e6f",
    "itemId": "item-def456"
  }
}
```

---

### 6.2 Verificar una emisión certificada

**Request:**
```
GET /api/v1/emissions/emission-abc123/verify
Authorization: Bearer <api-token>
```

**Response 200 — datos íntegros:**
```json
{
  "data": {
    "emissionRecordId": "emission-abc123",
    "stateId": "state-xyz789",
    "verified": true,
    "evidence": {
      "blockchain_tx": "ev_1a2b3c4d5e6f",
      "timestamp": "2026-07-15T10:00:00.000Z",
      "source": "IEA 2023",
      "event_type": "co2_certification_event",
      "hash": "a3f5c8e2b1d9047f6a2c5e8b3d0f4a7e2c5b8a1d4f7e0b3c6a9d2e5f8b1c4a7"
    },
    "originalData": {
      "co2eKg": 42.5,
      "scope": "SCOPE_2",
      "systemBoundary": "CRADLE_TO_GATE",
      "verifierBody": "AENOR",
      "verificationStandard": "ISO 14064-3",
      "certifiedAt": "2026-07-15T10:00:00.000Z"
    },
    "discrepancies": []
  }
}
```

**Response 200 — discrepancias detectadas** (si el valor en BD difiere del almacenado en iBS):
```json
{
  "data": {
    "emissionRecordId": "emission-abc123",
    "stateId": "state-xyz789",
    "verified": false,
    "evidence": {
      "blockchain_tx": "ev_1a2b3c4d5e6f",
      "timestamp": "2026-07-15T10:00:00.000Z",
      "source": "IEA 2023",
      "event_type": "co2_certification_event",
      "hash": "a3f5c8e2b1d9047f6a2c5e8b3d0f4a7e2c5b8a1d4f7e0b3c6a9d2e5f8b1c4a7"
    },
    "originalData": {
      "co2eKg": 99.9,
      "scope": "SCOPE_2",
      "systemBoundary": "CRADLE_TO_GATE",
      "verifierBody": "AENOR",
      "verificationStandard": "ISO 14064-3",
      "certifiedAt": "2026-07-15T10:00:00.000Z"
    },
    "discrepancies": [
      "co2eKg: stored=42.5, current=99.9"
    ]
  }
}
```

---

### 6.3 Errores posibles

| HTTP | Causa |
|------|-------|
| `401` | Token de API inválido o ausente |
| `404` | `emissionRecordId` no existe o no pertenece a la organización |
| `422` | La emisión no ha sido certificada aún (`verificationStatus !== 'VERIFIED'`) |
| `502` | iCommunity iBS no disponible |

---

## 7. Flujo completo (diagrama de secuencia)

```
Cliente          Datia API          PostgreSQL        iCommunity iBS
   │                 │                   │                   │
   │─POST /certify──▶│                   │                   │
   │                 │─findFirst(emissn)─▶│                   │
   │                 │◀──EmissionRecord──│                   │
   │                 │─findUnique(org)───▶│                   │
   │                 │◀──{signatureID}───│                   │
   │                 │─state.create──────▶│                   │
   │                 │◀──{stateId}───────│                   │
   │                 │─createEvidence(templateConfig)────────▶│
   │                 │◀──evidenceID──────────────────────────│
   │                 │─state.update(evidenceID)──▶│           │
   │                 │─emissionRecord.update(VERIFIED)──▶│    │
   │                 │─eventLog.create───▶│                   │
   │◀──{evidenceID}──│                   │                   │
   │                 │                   │                   │
   │─GET /verify────▶│                   │                   │
   │                 │─findFirst(emissn)─▶│                   │
   │                 │─eventLog.findFirst▶│                   │
   │                 │◀──{evidenceID}────│                   │
   │                 │─getEvidence(id)───────────────────────▶│
   │                 │◀──{files[issue_data.json]}────────────│
   │                 │  sha256(json) + compare fields         │
   │◀──{verified,    │                   │                   │
   │    hash,        │                   │                   │
   │    discrepancs}─│                   │                   │
```

---

## 8. Archivos relevantes

| Archivo | Descripción |
|---------|-------------|
| [`src/domain/energy/EnergyTypes.ts`](../src/domain/energy/EnergyTypes.ts) | Tipos `EvidenceAuditRecord`, `EmissionVerificationReport` |
| [`src/app/api/v1/emissions/[id]/certify/route.ts`](../src/app/api/v1/emissions/%5Bid%5D/certify/route.ts) | Endpoint de certificación |
| [`src/app/api/v1/emissions/[id]/verify/route.ts`](../src/app/api/v1/emissions/%5Bid%5D/verify/route.ts) | Endpoint de verificación |
| [`src/domain/evidence/EvidenceServiceImpl.ts`](../src/domain/evidence/EvidenceServiceImpl.ts) | Construcción del payload y envío a iBS |
| [`src/lib/evidenceUtils.ts`](../src/lib/evidenceUtils.ts) | `buildIssueDataObject` — estructura canónica del JSON |
| [`src/app/api/v1/emissions/__tests__/certify.test.ts`](../src/app/api/v1/emissions/__tests__/certify.test.ts) | Tests de certificación (10 casos) |
| [`src/app/api/v1/emissions/__tests__/verify.test.ts`](../src/app/api/v1/emissions/__tests__/verify.test.ts) | Tests de verificación (10 casos) |
