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
- **Entidades ocultas**: `/company/users` redirige al panel, y `/company/states`
  y `/company/status-types` ya no existen (#63); ningún enlace apunta a ellas.
- **Pasaporte público**: `/p/<id>` con su informe energético, y que `/energy/*`
  redirige ahí. Los QR impresos llevan `/customer/item/<id>` o `/customer/asset/<id>`
  y no se pueden reimprimir: `passport.spec.ts` protege que sigan llegando.

Además de las capturas, cada parada comprueba que la página no genera scroll
horizontal y que la barra superior no crece más allá de las secciones de contenido.

### Esquema SQLite

`prisma/schema.e2e.prisma` es un espejo generado de `prisma/schema.prisma`
(`npm run gen:e2e:schema`). No se edita a mano: si el esquema principal cambia,
se regenera y se vuelve a ejecutar `npm run prisma:gen:e2e`.
