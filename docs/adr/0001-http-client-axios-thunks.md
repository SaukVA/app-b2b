# ADR 0001: Llamadas a la API con axios + createAsyncThunk

- **Estado**: Aceptada
- **Fecha**: 2026-10-14
- **Contexto de origen**: feature `001-user-login` (research.md, R8)

## Contexto

CLAUDE.md fija que cada dominio del frontend tiene un slice de Redux Toolkit y que las llamadas a la API
viven en `features/<dominio>/*Api.ts`. La elección entre **RTK Query** y **funciones axios** se dejó
abierta hasta implementar la primera funcionalidad.

La primera funcionalidad es el inicio de sesión, y necesita:

- Añadir el access token a cada petición.
- Ante un 401, hacer **un único** refresh del token, encolar las peticiones que lleguen mientras tanto y
  reintentarlas.
- En escritorio, obtener la URL del servidor y el refresh token a través del puente `window.desktop`.

## Decisión

- Una instancia axios compartida en `apps/client/src/utils/httpClient.ts`, con interceptores de petición
  (Bearer) y de respuesta (refresh único con cola).
- Cada dominio expone funciones tipadas en `features/<dominio>/<dominio>Api.ts` que usan esa instancia y
  devuelven los DTOs de `@app/shared`.
- Los slices usan `createAsyncThunk` para llamar a esas funciones y gestionar los estados
  `idle | loading | succeeded | failed`.
- NEVER se llama a la API desde un componente.

## Alternativas consideradas

- **RTK Query con `baseQueryWithReauth`**: aporta caché e invalidación por etiquetas, pero la lógica de
  refresh con cola es menos directa de controlar y añade convenciones que el login no necesita. Se puede
  reconsiderar con un nuevo ADR cuando lleguen los módulos de listados (Productos, Clientes…), si la caché
  aporta valor.
- **`fetch` nativo**: obligaría a reimplementar los interceptores y la cancelación; axios ya está en el
  stack.

## Consecuencias

- Un único patrón de acceso a la API para todos los dominios.
- El refresh de sesión queda centralizado en un solo módulo, fácil de probar (T071).
- Si más adelante se adopta RTK Query, habrá que migrar los `*Api.ts` existentes. Ese cambio se
  registrará en un nuevo ADR que reemplace a este.
