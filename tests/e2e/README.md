# E2E Testing Documentation

## UX journeys (feedback visual)

`tests/e2e/ux-journeys.spec.ts` recorre la aplicación de punta a punta y guarda una
captura en cada parada, para revisar la interfaz como un todo en lugar de pantalla
a pantalla.

```bash
npm run prisma:gen:e2e     # cliente Prisma del esquema SQLite (solo la primera vez)
npm run test:e2e:ux        # resetea la BD de e2e, siembra datos y ejecuta los recorridos
```

Las capturas quedan en `test-results/ux-journeys/{desktop,mobile}/NN-paso.png`.

Los recorridos cubren:

- **Escritorio**: login → inicio → activos → búsqueda sin resultados → API →
  menú de cuenta → configuración.
- **Móvil** (390×844): inicio → drawer → activos → configuración.
- **Entidades ocultas**: `/dashboard/users` y `/dashboard/status-types` redirigen y
  ningún enlace de la aplicación apunta a ellas.

Además de las capturas, cada parada comprueba que la página no genera scroll
horizontal y que la barra superior no crece más allá de las secciones de contenido.

### Esquema SQLite

`prisma/schema.e2e.prisma` es un espejo generado de `prisma/schema.prisma`
(`npm run gen:e2e:schema`). No se edita a mano: si el esquema principal cambia,
se regenera y se vuelve a ejecutar `npm run prisma:gen:e2e`.

## Complete State Certification Flow

### Overview

Este documento describe el test E2E del flujo completo de certificación de estados, que es el caso de uso principal de la aplicación certypass.

### Flujo de Certificación

El test verifica el siguiente flujo:

1. **Creación de Estado**: Crear un estado mediante la UI usando `AddStateForm`
2. **Espera de Certificación**: Esperar hasta 60 segundos para que el estado sea certificado por blockchain
3. **Verificación**: Verificar que el estado está certificado usando la API pública del checker

### Arquitectura del Test

#### Archivos Principales

- `tests/e2e/complete-state-certification.spec.ts` - Test principal E2E
- `tests/e2e/helpers/certification-helper.ts` - Helper con métodos de polling y verificación
- `playwright.config.ts` - Configuración específica para tests de certificación

#### Helper Methods

El `CertificationTestHelper` proporciona los siguientes métodos:

- `waitForCertification(stateId, options)` - Polling del estado hasta que `backed = true`
- `getStateViaChecker(stateId)` - Consultar estado usando API del checker
- `createStateViaUI(page, stateData)` - Crear estado desde UI
- `getStateIdFromUI(page)` - Extraer ID del estado creado
- `verifyStateCertificationInUI(page, stateId)` - Verificar certificación en UI
- `waitForCompleteCertification(page, stateId, options)` - Verificación completa

### Configuración

#### Timeouts y Polling

- **Timeout total**: 60 segundos (configurable)
- **Intervalo de polling**: 5 segundos (configurable)
- **Timeout de Playwright**: 120 segundos (2 minutos)

#### Configuración de Playwright

```typescript
{
  name: 'certification-flow',
  testMatch: '**/complete-state-certification.spec.ts',
  timeout: 120000, // 2 minutos
  retries: 1, // Retry una vez para manejar fallos de red
}
```

### Estrategia de Testing

#### ¿Por qué Polling en lugar de Webhooks?

Los webhooks de iCommunity apuntan a hosts públicos y no pueden alcanzar `localhost` durante el desarrollo. Por tanto, usamos polling para verificar el estado de certificación.

#### Verificación Real vs Mock

- **Certificación**: REAL contra blockchain (no mockeada)
- **Verificación**: API pública del checker (endpoint público)
- **UI**: Interacciones reales con el navegador

#### Datos de Prueba

El test usa datos de prueba específicos:
- Item ID: `test-item-certification`
- Status Type: `test-status-type`
- Descripción: Incluye timestamp para unicidad

### Ejecución

#### Comando Principal

```bash
npm run test:e2e:certification
```

#### Comando Detallado

```bash
playwright test tests/e2e/complete-state-certification.spec.ts --project=certification-flow
```

#### Variables de Entorno

- `ADMIN_E2E_EMAIL` - Email del admin para login (default: admin@certypass.com)
- `ADMIN_E2E_PASSWORD` - Password del admin (default: admin123)

### Casos de Prueba

#### Test Principal

```typescript
test('should create state and verify blockchain certification via checker', async ({ page }) => {
  // 1. Crear estado via UI
  // 2. Verificar creación inicial
  // 3. Esperar certificación (60s timeout, 5s polling)
  // 4. Verificar certificación en API
  // 5. Verificar certificación en UI
  // 6. Verificar timestamps y datos
});
```

#### Tests Adicionales

- **Timeout Handling**: Verificar comportamiento cuando la certificación no ocurre
- **Initial State Verification**: Verificar estado inicial después de la creación

### Consideraciones para CI/CD

#### Pipeline Requirements

- **Timeout**: Mínimo 2 minutos para el test completo
- **Retry**: Configurado para manejar fallos de red temporales
- **Environment**: Requiere acceso a la API pública del checker

#### Monitoring

- **Logs**: El helper incluye logging detallado para debugging
- **Screenshots**: Capturados en caso de fallo
- **Videos**: Grabados para análisis de fallos
- **Traces**: Disponibles para debugging avanzado

### Troubleshooting

#### Problemas Comunes

1. **Timeout en Certificación**
   - Verificar conectividad con blockchain
   - Aumentar timeout si es necesario
   - Verificar logs del helper

2. **Fallos de UI**
   - Verificar que los elementos tienen los `data-testid` correctos
   - Verificar que el formulario se carga correctamente
   - Revisar screenshots en caso de fallo

3. **API del Checker No Disponible**
   - Verificar que el endpoint `/api/checker/status/{stateId}` funciona
   - Verificar conectividad de red
   - Revisar logs de la aplicación

#### Debugging

```bash
# Ejecutar con UI para debugging
npm run test:e2e:ui

# Ejecutar con headed mode
npm run test:e2e:headed

# Ejecutar con debug mode
npm run test:e2e:debug
```

### Métricas de Éxito

- **Tiempo de Certificación**: Típicamente 10-30 segundos
- **Tasa de Éxito**: >95% en condiciones normales
- **Cobertura**: Flujo completo desde UI hasta verificación

### Próximos Pasos

1. **Casos de Error**: Añadir tests para fallos de certificación
2. **Múltiples Estados**: Test de certificación concurrente
3. **Performance**: Monitoreo de tiempos de certificación
4. **Alertas**: Notificaciones cuando los tests fallan consistentemente