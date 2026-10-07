# Documentación técnica — Datia

Este directorio complementa el [README principal](../README.md) y el
[`CLAUDE.md`](../CLAUDE.md) de la raíz, que cubre comandos, arquitectura y
convenciones para quien (persona o IA) trabaje en el código.

## Documentos vigentes

- **[MIGRACIONES.md](./MIGRACIONES.md)** — Cómo se crean y se aplican las
  migraciones de base de datos. El despliegue no las aplica.
- **[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)** — Variables de
  entorno reales: cuáles son obligatorias, cuáles tienen valor por defecto, y
  dónde vive cada secreto en producción.
- **[CERTIFICACION_AUTOMATICA.md](./CERTIFICACION_AUTOMATICA.md)** — Cómo se
  certifica una emisión al escribirse (sin esperar a `POST /certify`), los
  webhooks de iBS y lo que queda pendiente.
- **[EVIDENCE_AUDIT_MODEL.md](./EVIDENCE_AUDIT_MODEL.md)** — Estructura de la
  evidencia que ancla una certificación en blockchain, y cómo la verificación
  compara el checksum publicado por iBS contra el certificado.
- **[URL_PARAMETER_DECODING.md](./URL_PARAMETER_DECODING.md)** — Por qué un ID
  con caracteres especiales puede llegar doblemente codificado a una ruta
  dinámica, y cómo se decodifica.
- **[MAILGUN_EMAIL_TEMPLATE_VARIABLES.md](./MAILGUN_EMAIL_TEMPLATE_VARIABLES.md)**
  — Variables disponibles en las plantillas de email de Mailgun.

## [`archive/`](./archive/)

Documentos que describen una fase anterior del producto (el modelo `Item` con
categorías y estados, o el patrón Repository con Effect.ts, ambos retirados)
o una valoración puntual nunca actualizada. Se conservan como referencia
histórica, con una nota al principio de cada uno explicando por qué ya no son
una fuente fiable del estado actual. No son el punto de partida para nadie
nuevo en el proyecto.

## Para quien empieza en el proyecto

1. El [README principal](../README.md): qué es Datia, cómo arranca en local.
2. [`CLAUDE.md`](../CLAUDE.md): arquitectura, capas y convenciones de código.
3. [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) para configurar el
   entorno local.
4. [MIGRACIONES.md](./MIGRACIONES.md) antes de tocar `prisma/schema.prisma`.

## Al añadir documentación

- Los documentos de este directorio describen **cómo funciona el sistema
  hoy**, no una decisión puntual ni un resumen de PR — eso va en el propio PR
  o en el issue.
- Si el documento queda superado por un cambio posterior, muévelo a
  `archive/` con una nota explicando por qué, en vez de dejarlo desactualizado
  en el índice.
- Actualiza este índice al añadir o archivar un documento.
