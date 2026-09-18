# Certificación automática de emisiones

Desde septiembre de 2026 cada registro de emisión se certifica solo, en el
momento en que se escribe. Antes era una segunda llamada explícita
(`POST /api/v1/emissions/:id/certify`), y eso dejaba la trazabilidad en manos de
quien integraba: unos registros certificados, otros no, sin que el sistema lo
dijera. Ese endpoint sigue existiendo; lo que describe
[EVIDENCE_AUDIT_MODEL.md](./EVIDENCE_AUDIT_MODEL.md) sobre la estructura de la
evidencia y la verificación sigue siendo válido.

## Decisiones

- **Una evidencia por registro.** El volumen de hoy es pequeño y el coste por
  evidencia, despreciable. No hay agregación diaria ni mensual en producción.
- **Sin programador de tareas.** Un 201 de `POST /v2/evidences` es el compromiso
  de iBS de que la evidencia se certificará: no hay que sondear. La transacción
  llega segundos después e iBS avisa por webhook.
- **La ingesta no espera a iBS.** Si iBS no responde, el registro se guarda
  igualmente y queda pendiente. Que el contador de un cliente no pueda escribir
  porque un tercero está caído sería un fallo mayor que una prueba que llega
  tarde.

## Flujo

```
Cliente            Datia                                  iBS
  │─POST /api/v1/emissions─▶│                               │
  │                         │ guarda EmissionRecord          │
  │                         │─POST /v2/evidences────────────▶│
  │                         │◀─201 {evidenceID}─────────────│
  │                         │ crea Certification ISSUED y la │
  │                         │ enlaza a la emisión            │
  │◀─201 certification:     │                               │
  │   pending_anchor        │                               │
  │                         │        (unos 10–15 s después)  │
  │                         │◀─webhook evidence.certified───│
  │                         │─GET /v2/evidences/{id}────────▶│
  │                         │◀─status certified, hash, red──│
  │                         │ Certification CERTIFIED + hash,│
  │                         │ red, enlaces checker/explorador│
  │                         │ emisiones cubiertas VERIFIED   │
  │                         │ EventLog co2_certification_event
```

El registro solo pasa a `VERIFIED` cuando la transacción está en cadena, no al
recibir el 201.

La prueba vive en la entidad `Certification` (#37, septiembre de 2026). Antes se
guardaba como un `State` con el tipo de estado «Certificación Energética» y la
prueba dentro de `templateConfig`; la migración `20260918100000_certification_entity`
copió esas pruebas. Una certificación puede cubrir varias emisiones: las
mensuales del simulador BMS cubren todas las lecturas del mes
(`EmissionRecord.certificationId`).

La respuesta de `POST /api/v1/emissions` lleva el estado de la certificación:

| `certification` | Significa |
|---|---|
| `{ status: 'pending_anchor', evidenceId }` | Evidencia emitida; falta la confirmación de iBS |
| `{ status: 'pending', reason: '<error>' }` | iBS rechazó la evidencia; no se escribe nada y el registro queda sin prueba |
| `{ status: 'pending', reason: 'not_anchored_yet' }` | La organización no puede firmar: sin `signatureID` o sin `verificationStatus = VERIFIED` |

## Webhooks registrados en iBS

Registrados en septiembre de 2026, con el PR #16, en la **cuenta de iBS que comparte con certypass**
(ver issue #27). Al migrar Datia a su propia cuenta hay que volver a crearlos
allí.

| ID | Evento | Destino |
|---|---|---|
| `whk_BxipBpYmpjpWrgeUvg47Pn` | `evidence.certified` | `https://datia.icommunitylabs.com/api/hooks/evidence` |
| `whk_Ljq3YzjsJjcMpPmSHeWW6h` | `signature.verification.success` | `https://datia.icommunitylabs.com/api/hooks/signature/ok` |
| `whk_LpFUYUt2TdpMp975cDvZNd` | `signature.verification.failed` | `https://datia.icommunitylabs.com/api/hooks/signature/ko` |

En esa misma cuenta existe `whk_hifo7df26EiAxqRKWo7CN3`, que es de certypass: no
se toca.

La API de webhooks (`GET/POST /v2/webhooks` con `{ name, url, events }`) no está
en la documentación pública de iBS.

### Qué se fía cada ruta

- `/api/hooks/evidence` **no se fía del cuerpo**: solo toma el
  `data.evidence_id` y vuelve a pedir la evidencia a iBS antes de marcar nada.
  Un POST falso como mucho provoca una consulta.
- `/api/hooks/signature/ok` y `/ko` tampoco se fían del cuerpo: toman la
  `signature_id`, piden la firma a iBS (`GET /v2/signatures/{id}`) y solo
  aplican `success` o `failed` si la id que devuelve iBS coincide (#33).

## Si algo se queda atrás

No hay barridos ni tareas programadas: se decidió así en septiembre de 2026
(#34). La certificación se apoya en los webhooks de iBS. Si un registro queda
sin prueba porque iBS falló al ingerirlo, `POST /api/v1/emissions/{id}/certify`
lo ancla de nuevo con el mismo código que la ingesta. Si un webhook no llega, la
discrepancia se corrige a mano.

## El simulador BMS es otra cosa

El simulador del Energy Hub es solo para demostraciones. Genera lecturas
diarias y emite **una evidencia mensual agregada** (`emissionRecordIds` en el
`payload` de la certificación) para que un año quepa en unos 30 segundos. No refleja cómo
certifica la plataforma en producción, y el aviso del propio modal lo dice.

## Ficheros

| Fichero | Qué hace |
|---|---|
| `src/lib/certification/index.ts` | Emite la certificación (`issueCertification`) y la confirma (`applyCertification`) |
| `src/lib/energy/anchor-service.ts` | Anclaje por registro de emisiones |
| `src/app/api/v1/emissions/route.ts` | Ingesta; ancla tras guardar |
| `src/app/api/hooks/evidence/route.ts` | Recibe `evidence.certified` |
| `src/app/api/v1/emissions/__tests__/create.test.ts` | Ingesta y anclaje |
| `src/app/api/hooks/evidence/__tests__/route.test.ts` | Webhook de evidencias |
