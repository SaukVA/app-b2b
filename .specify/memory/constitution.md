# Constitución de App B2B · Venta a mayoristas

## Core Principles

### I. Organización por dominio (feature-first)

- El código MUST organizarse por dominio de negocio (productos, clientes, proveedores, ventas,
  cobros), no por capa técnica.
- En el backend, cada dominio MUST vivir completo en `apps/server/src/modules/<dominio>/`: modelo,
  rutas, controlador, servicio, validación y tests.
- En el frontend, cada dominio MUST vivir en `apps/client/src/features/<dominio>/`: slice, API y
  componentes del dominio.
- NEVER se crean carpetas transversales del tipo `controllers/` o `models/` que mezclen dominios.

**Justificación**: tener junto todo lo de un dominio reduce el área que hay que leer y modificar
en cada cambio, facilita los cambios mínimos (V) y deja claro quién es responsable de cada parte.

### II. Contrato API primero

- Toda ruta de `apps/server` MUST llevar su bloque JSDoc `@openapi` junto a su definición. El spec
  servido en `/api-docs` MUST actualizarse en el mismo commit que el cambio del endpoint.
- Todas las respuestas MUST usar el envelope `{ "success": true, "data": … }` en éxito y
  `{ "success": false, "error": { "code", "message" } }` en error.
- Los servicios y controladores MUST lanzar `AppError` (código, status y mensaje), y la traducción
  al envelope MUST hacerla `apps/server/src/middlewares/errorHandler.ts`.
- El `stack` NEVER se expone en producción.

**Justificación**: la API la consumen dos frontends, la web y Electron. Swagger es el contrato
entre backend y frontend, y un formato uniforme permite tratar los errores de forma genérica en el
cliente.

### III. Validación en el borde

- `req.body`, `req.params` y `req.query` MUST validarse con un esquema `zod` definido en
  `<dominio>.validation.ts` antes de llegar al controlador, en todas las rutas.
- NEVER se confía en el tipado de TypeScript en tiempo de ejecución para los datos de entrada.

**Justificación**: los tipos desaparecen al compilar. Validar en la entrada protege la lógica de
negocio y la base de datos de payloads malformados o maliciosos.

### IV. Funciones cortas y capas estrictas

- En todo el código (server, client, desktop y shared), cada función o método MUST tener una única
  responsabilidad.
- La longitud de referencia de una función SHOULD ser de 20 líneas efectivas o menos, y MUST NOT
  superar 40. Controladores y servicios MUST quedarse en 40 líneas efectivas o menos, como fija
  CLAUDE.md.
- La lógica MUST extraerse a funciones auxiliares con nombre descriptivo en lugar de anidarse. El
  anidamiento MUST NOT superar 2 niveles, y SHOULD preferirse el early return a cadenas de if/else.
- El backend MUST respetar las capas `routes → controller → service → model`:
  - El controlador gestiona solo la entrada y salida HTTP.
  - El servicio contiene la lógica de negocio.
  - El modelo es el esquema de Mongoose.
- Un controlador NEVER accede directamente a Mongoose.
- NEVER se devuelve un documento de Mongoose en una respuesta HTTP: MUST mapearse a un DTO o tipo
  de `packages/shared`.

**Justificación**: las funciones cortas con una sola responsabilidad son más fáciles de leer,
probar y revisar. Las capas estrictas aíslan la lógica de negocio del transporte HTTP y de la
persistencia.

### V. Cambios mínimos

- Toda modificación MUST tocar el menor número posible de archivos y líneas necesario para
  cumplir su objetivo.
- NEVER se incluyen refactors oportunistas, renombrados, reformateos ni «mejoras de paso» fuera
  del alcance de la tarea.
- Antes de cambiar código existente MUST leerse los archivos afectados y respetarse su estilo y
  sus convenciones, aunque no coincidan con las preferencias de quien hace el cambio.
- Las refactorizaciones amplias (un módulo completo o más) MUST contar con aprobación explícita y
  MUST ir en un PR propio, separado de los cambios funcionales.
- Una corrección MUST atacar la causa raíz con el diff más pequeño posible y MUST añadir el test
  que reproduce el fallo.
- NEVER se elimina código comentado sin preguntar.

**Justificación**: los diffs pequeños se revisan mejor, introducen menos regresiones y dejan un
historial que se puede seguir y revertir.

### VI. Tipos compartidos únicos

- Los tipos de dominio (`Product`, `Customer`, `Supplier`, `Sale`, `Payment`…) y las constantes
  compartidas MUST vivir en `packages/shared`, y `apps/server`, `apps/client` y `apps/desktop` MUST
  importarlos desde ahí.
- NEVER se duplica un tipo de dominio en dos apps.

**Justificación**: una única definición evita que el contrato entre backend y frontends se
desincronice en silencio.

### VII. Testing obligatorio (NO NEGOCIABLE)

- Todo workspace MUST tener tests con Jest:
  - Tests unitarios junto al código (`*.test.ts` / `*.test.tsx`), sin tocar una base de datos real.
  - Tests de integración de la API con `supertest` y `mongodb-memory-server`, sin depender de un
    MongoDB externo.
- Un módulo de dominio NEVER se considera completo sin tests de servicio y tests de rutas.
- Los componentes reutilizables (VIII) MUST tener tests propios.
- Una corrección de bug MUST incluir el test que reproduce el fallo (V).

**Justificación**: los tests son la red de seguridad que permite hacer cambios mínimos y
refactorizar con confianza en una aplicación que maneja stock, ventas y cobros.

### VIII. Frontend basado en componentes reutilizables

- Antes de crear un componente MUST buscarse uno existente que se pueda reutilizar o extender por
  props. NEVER se duplica marcado ni estilos de una pieza de UI que ya existe.
- Los elementos genéricos del sistema visual «Albarán» MUST implementarse una sola vez en
  `apps/client/src/components/`: Button, IconButton, Input, Select, Field/Label, Table con su
  variante de tarjetas para móvil, StatusStamp, ProgressBar, KpiCard, Pagination, Panel, NavBar…
- Esos componentes genéricos:
  - No contienen lógica de negocio ni llamadas a la API.
  - Se configuran por props.
  - Usan los tokens de `docs/design/README.md`.
  - Siguen las reglas de diseño: temas claro y oscuro, cifras en IBM Plex Mono, estado siempre
    legible como texto, objetivos táctiles de 44 px y corte responsive a 760 px.
- Los componentes de `features/<dominio>/components/` MUST componer los genéricos y limitarse a la
  presentación del dominio.
- El estado MUST vivir en un slice de Redux Toolkit por dominio, con las llamadas a la API en
  `*Api.ts`. NEVER se llama a la API desde un componente.
- Si los componentes genéricos crecen o hay que compartirlos fuera de `apps/client` (por ejemplo,
  con `apps/desktop`), MUST extraerse a un paquete `packages/ui` del monorepo. Esa extracción MUST
  registrarse como ADR en `docs/adr/` y actualizar la estructura de carpetas de CLAUDE.md en el
  mismo cambio.

**Justificación**: una única implementación de cada pieza de UI garantiza coherencia visual entre
la web y el escritorio, reduce el código que hay que mantener y hace que los cambios de diseño
sean locales.

## Restricciones adicionales

- **Stack y versiones**: se toman como referencia las versiones de la tabla de Tecnologías de
  CLAUDE.md (Node.js ≥ 22.12, TypeScript 5.7, Express 5.1, Mongoose 8.9, React 19, Electron 34…).
  Una vez instaladas las dependencias, la fuente de verdad es el `package-lock.json`.
- **Dependencias**: toda dependencia nueva MUST justificarse, contar con aprobación y actualizar la
  tabla de Tecnologías de CLAUDE.md. Se SHOULD preferir construir componentes propios sobre los
  tokens de «Albarán» antes que añadir una librería de UI de terceros.
- **Seguridad**:
  - NEVER se commitean `.env`, credenciales ni cadenas de conexión reales; `.env.example` es la
    plantilla.
  - La autenticación MUST usar JWT con access token y refresh token.
  - Las contraseñas MUST hashearse con `bcryptjs`, que es JS puro y no necesita binarios nativos
    en el empaquetado de Electron.
- **Arquitectura**: los cambios de arquitectura relevantes (de gestor de estado, de ODM, nuevos
  paquetes del monorepo…) MUST registrarse como ADR en `docs/adr/`.
- **Diseño**: el lienzo publicado de «Albarán» es la fuente de verdad visual. Si se modifica, MUST
  actualizarse `docs/design/canvas/` y `docs/design/README.md` en el mismo cambio.

## Flujo de desarrollo y quality gates

- Los commits SHOULD seguir Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`,
  `chore:`, `docs:`…), en un idioma consistente dentro de cada PR.
- Antes de dar por cerrado un endpoint o un componente MUST cumplirse:
  - `npm run lint` sin errores.
  - `npm test --workspaces` en verde.
  - Bloque `@openapi` presente y actualizado en los endpoints nuevos o modificados.
- Toda revisión de PR MUST comprobar explícitamente:
  - La longitud y la responsabilidad única de las funciones (IV).
  - Que el diff es mínimo y no hay cambios fuera de alcance (V).
  - La reutilización de componentes y la ausencia de UI duplicada (VIII).
- Los cambios SHOULD ser localizados. Antes de tocar más de un archivo SHOULD presentarse un plan
  corto de 3 a 5 pasos.

## Governance

- Esta constitución prevalece sobre cualquier otra práctica del proyecto. CLAUDE.md es la guía
  operativa de desarrollo: concreta cómo se aplican estos principios día a día y MUST mantenerse
  coherente con ellos.
- Toda enmienda MUST hacerse mediante un PR que incluya la justificación del cambio, el nuevo
  número de versión y un Sync Impact Report. Si la enmienda afecta a convenciones operativas,
  CLAUDE.md MUST actualizarse en el mismo PR.
- Versionado semántico de la constitución:
  - **MAJOR**: elimina o redefine principios de forma incompatible.
  - **MINOR**: añade principios o secciones, o amplía materialmente la guía.
  - **PATCH**: aclaraciones, redacción o erratas.
- Todas las revisiones de PR MUST verificar el cumplimiento de esta constitución. Cualquier
  excepción MUST justificarse por escrito en el PR.

**Version**: 1.0.0 | **Ratified**: 2026-10-14 | **Last Amended**: 2026-10-14
