# 📚 Documentación Técnica - Datia

Este directorio contiene documentación técnica detallada que complementa el README principal del proyecto.

---

## 📖 Documentos Disponibles

### 🏗️ Arquitectura

#### [EFFECT_ARCHITECTURE.md](./EFFECT_ARCHITECTURE.md)
Documentación detallada sobre la arquitectura Effect.ts utilizada en el proyecto.

**Contiene:**
- Patrones de Effect.ts
- Context y Layers
- Gestión de errores tipados
- Dependency injection
- Ejemplos avanzados

---

#### [REPOSITORY_PATTERN.md](./REPOSITORY_PATTERN.md)
Guía completa del patrón Repository implementado en el proyecto.

**Contiene:**
- Abstracción de Prisma
- Definición de interfaces
- Implementaciones con Effect.ts
- Testing de repositorios
- Mejores prácticas

---

### 🔧 Configuración

#### [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
Lista completa de variables de entorno necesarias para el proyecto.

**Contiene:**
- Variables de autenticación
- Configuración de base de datos
- APIs externas (iCommunity, GCS)
- Variables de desarrollo/producción
- Ejemplos de configuración

---

#### [MIGRACIONES.md](./MIGRACIONES.md)
Cómo se crean y se aplican las migraciones de base de datos. El despliegue no las aplica.

**Contiene:**
- Lo que no se hace nunca contra producción (`prisma db push`, SQL a mano)
- Procedimiento para aplicar una migración antes de mergear
- Estado del historial tras ponerlo al día (septiembre de 2026)

---

### 🚀 Features Implementadas

#### [ADMIN_ITEM_EVIDENCE_FEATURE.md](./ADMIN_ITEM_EVIDENCE_FEATURE.md)
Documentación de la feature de evidencias de items con KYC.

**Contiene:**
- Modelo de datos de evidencias
- Integración con iCommunity API
- Flow de verificación KYC
- UI de administración
- Testing

---

#### [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)
Resumen de implementación completa del sistema de evidencias.

**Contiene:**
- Estado de la implementación
- Cambios en base de datos
- Backend y frontend
- Testing y validación
- Próximos pasos

---

#### [MANUAL_ITEM_ID.md](./MANUAL_ITEM_ID.md)
Documentación sobre la feature de IDs manuales para items.

**Contiene:**
- Funcionalidad de IDs personalizados
- Validaciones
- UI y UX
- Casos de uso

---

#### [EVIDENCE_AUDIT_MODEL.md](./EVIDENCE_AUDIT_MODEL.md)
Modelo de evidencia y auditoría para certificaciones de CO₂ (Bloque 7 — EU ESPR/DPP).

**Contiene:**
- Estructura `EvidenceAuditRecord` (`{hash, timestamp, source, event_type, blockchain_tx}`)
- JSON almacenado en iCommunity iBS (`issue_data.json`)
- Proceso de verificación: dato original vs hash en blockchain
- Ejemplos verificables de los endpoints `/certify` y `/verify`
- Diagrama de secuencia del flujo completo

---

### 🔍 Evaluación y Mantenimiento

#### [MAINTENANCE_ASSESSMENT.md](./MAINTENANCE_ASSESSMENT.md)
Evaluación técnica del estado del proyecto y recomendaciones de mantenimiento.

**Contiene:**
- Estado actual del código
- Deuda técnica identificada
- Recomendaciones de mejora
- Prioridades de mantenimiento
- Roadmap técnico

---

## 🔗 Navegación

### Desde el README Principal
- [← Volver al README Principal](../README.md)

### Documentación por Área

**Arquitectura y Patrones:**
- [Effect Architecture](./EFFECT_ARCHITECTURE.md)
- [Repository Pattern](./REPOSITORY_PATTERN.md)

**Configuración:**
- [Variables de Entorno](./ENVIRONMENT_VARIABLES.md)
- [Migraciones](./MIGRACIONES.md)

**Features:**
- [Admin Item Evidence](./ADMIN_ITEM_EVIDENCE_FEATURE.md)
- [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- [Manual Item ID](./MANUAL_ITEM_ID.md)
- [Evidence Audit Model](./EVIDENCE_AUDIT_MODEL.md)

**Mantenimiento:**
- [Maintenance Assessment](./MAINTENANCE_ASSESSMENT.md)

---

## 📝 Guía de Uso

### Para Nuevos Desarrolladores
1. Empieza con el [README Principal](../README.md)
2. Lee [EFFECT_ARCHITECTURE.md](./EFFECT_ARCHITECTURE.md) para entender Effect.ts
3. Revisa [REPOSITORY_PATTERN.md](./REPOSITORY_PATTERN.md) para el patrón de datos
4. Configura tu entorno con [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)

### Para Features Específicas
- Trabajando con evidencias → [ADMIN_ITEM_EVIDENCE_FEATURE.md](./ADMIN_ITEM_EVIDENCE_FEATURE.md)
- IDs manuales → [MANUAL_ITEM_ID.md](./MANUAL_ITEM_ID.md)

### Para Mantenimiento
- Evaluación técnica → [MAINTENANCE_ASSESSMENT.md](./MAINTENANCE_ASSESSMENT.md)
- Estado de implementación → [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

---

## ✨ Contribuir a la Documentación

Al agregar nueva documentación:

1. **Coloca el archivo** en este directorio (`docs/`)
2. **Actualiza este README** agregando el documento al índice
3. **Usa formato Markdown** consistente con los demás documentos
4. **Incluye ejemplos de código** cuando sea relevante
5. **Mantén actualizada** la documentación cuando cambies el código

---

**Última actualización:** Julio 2026

