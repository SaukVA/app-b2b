---

description: "Task list for feature 004-appearance-preferences"
---

# Tasks: Preferencias personales (Ajustes › Apariencia)

**Input**: Design documents from `/specs/004-appearance-preferences/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/preferences-api.openapi.yaml, quickstart.md

**Tests**: SÍ. La constitución (principio VII, NO NEGOCIABLE) exige:
- tests unitarios en los workspaces afectados;
- tests de integración del backend con supertest + mongodb-memory-server;
- tests de los componentes genéricos nuevos (`OptionGroup`, `Money`, `MoneyField`).

Además, el E2E de Playwright (ADR 0004) cubre el tema sin destello. En cada fase los tests se escriben primero
y deben FALLAR antes de implementar. Según CLAUDE.md, antes de escribir los tests de cada fase se muestra el
plan de tests y se espera confirmación.

**Organization**: tareas agrupadas por historia de usuario (numeración de spec.md). Orden de ejecución por
prioridad: US1 (P1) → US2 (P2) → US3 (P2) → US4 (P3).

**Reglas transversales** (aplican a todas las tareas):
- **Tamaño de las funciones** (principio IV): ≤20 líneas efectivas como referencia y nunca >40, anidamiento
  ≤2 y early returns.
- **Capas**: routes → controller → service → model. El controlador no importa `UserModel`. La respuesta
  siempre es `AppearancePreferences`, nunca el documento.
- **Errores**: `AppError` con `VALIDATION_ERROR` (lo lanza `validate`) o
  `PREFERENCES_ERROR_CODES.homeScreenNotAllowed` (`PREFERENCES_HOME_SCREEN_NOT_ALLOWED`, 400).
- **Cliente**: los componentes nunca llaman a la API. La llamada vive en `features/preferences/preferencesApi.ts`
  y se usa desde thunks (ADR 0001).
- **Valores por defecto**: en base de datos `null` o ausente significa "valor por defecto" (data-model.md). El
  servidor siempre responde con los valores ya resueltos.
- **Privacidad** (FR-007): en el equipo solo se guarda `appearance.lastTheme` con el valor del tema, nunca el
  usuario.
- **Dependencias**: ninguna nueva (research R12).
- **Diseño**: el tablero `docs/design/canvas/Ajustes.dc.html` (pestaña Apariencia) es la referencia visual.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: historia de usuario a la que pertenece (US1…US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: tipos y constantes compartidos que usan servidor y cliente (constitución VI)

- [X] T001 Crear `packages/shared/src/types/preferences.ts` con los tipos de data-model.md:
  - `ThemePreference = 'light' | 'dark' | 'system'`;
  - `TableDensity = 'comfortable' | 'compact'`;
  - `MoneyFormat = 'es' | 'en'` (`es` = "1.248,50 €", `en` = "€ 1,248.50");
  - `AppearancePreferences { theme; tableDensity; moneyFormat; homeScreen: HomeScreen | null }` ("ya resuelto:
    nunca null" salvo `homeScreen`, donde "null = sin elegir");
  - `UpdatePreferencesRequest = Partial<{ theme: ThemePreference | null; tableDensity: TableDensity | null;
    moneyFormat: MoneyFormat | null; homeScreen: HomeScreen | null }>`.
- [X] T002 [P] Ampliar `HomeScreen` en `packages/shared/src/types/user.ts` a
  `'panel' | 'ventas' | 'clientes' | 'productos' | 'proveedores' | 'cobros'` (research R9).
- [X] T003 Crear `packages/shared/src/constants/preferences.ts` con:
  - `DEFAULT_THEME = 'light'`, `DEFAULT_TABLE_DENSITY = 'comfortable'` y `DEFAULT_MONEY_FORMAT = 'es'`;
  - `AVAILABLE_HOME_SCREENS = ['ventas', 'clientes', 'productos', 'proveedores', 'cobros'] as const satisfies
    readonly HomeScreen[]` ("pantallas con ruta en la aplicación, en el orden del selector"; `panel` se añadirá
    cuando exista), con un comentario que lo explique;
  - `PREFERENCES_ERROR_CODES = { homeScreenNotAllowed: 'PREFERENCES_HOME_SCREEN_NOT_ALLOWED' } as const`, siguiendo
    el patrón de `constants/users.ts`;
  - `isHomeScreenAllowed(permissions: PermissionSet, screen: HomeScreen): boolean`: `true` si `screen` está en
    `AVAILABLE_HOME_SCREENS` y `can(permissions, screen, 'view')` (data-model.md, "Pantalla de inicio permitida").
    Añadir `packages/shared/src/constants/preferences.test.ts`: pantalla con `view` y con `edit` → `true`; con
    `none` o ausente → `false`; `panel` → `false` (todavía no existe).
- [X] T004 Cambiar `AuthUser` en `packages/shared/src/types/auth.ts`: quitar `homeScreen` y añadir
  `preferences: AppearancePreferences` (research R2). Exportar en `packages/shared/src/index.ts` los tipos de
  T001 y las constantes de T003 (`export * from './constants/preferences'`). Compilar con
  `npm run build --workspace=@app/shared`: los errores de tipos que salgan en server y client los resuelven T005–T013.

**Checkpoint**: `@app/shared` compila y sus tests pasan.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: guardar y devolver las preferencias, aplicarlas en `<html>` y tener la pestaña Apariencia vacía.
Ninguna historia puede empezar antes.

**⚠️ CRITICAL**: bloquea todas las historias de usuario.

### Tests de Foundational (primero, deben fallar) ⚠️

- [X] T005 [P] Crear `apps/server/src/modules/preferences/preferences.service.test.ts` (mongodb-memory-server, sin
  HTTP):
  - un usuario sin preferencias → `getPreferences` devuelve `{ theme: 'light', tableDensity: 'comfortable',
    moneyFormat: 'es', homeScreen: null }`;
  - `updatePreferences(userId, permissions, { theme: 'dark' })` guarda solo `theme` y devuelve los 4 valores
    resueltos; los otros campos del documento no cambian;
  - `{ tableDensity: null }` vuelve a `comfortable`;
  - funciona con la cuenta inicial (`isBootstrap: true`).
- [X] T006 [P] Crear `apps/server/src/modules/preferences/preferences.routes.test.ts` (supertest +
  mongodb-memory-server, con el login real para obtener el token):
  - `PATCH /api/preferences` sin token → 401 `AUTH_UNAUTHENTICATED`;
  - `{}` → 400 `VALIDATION_ERROR` ("al menos un campo");
  - `{ theme: 'azul' }` → 400 `VALIDATION_ERROR`; `{ theme: 'dark', extra: 1 }` → 400 (sin campos extra);
  - `{ theme: 'dark' }` como Comercial (sin `ajustes`) → 200 con el envelope y las 4 preferencias;
  - después, `GET /api/auth/me` devuelve `user.preferences.theme = 'dark'` y no tiene `homeScreen` de primer
    nivel;
  - la cuenta inicial `admin` también puede → 200.
- [X] T007 [P] Crear `apps/client/src/features/preferences/preferencesSlice.test.ts`:
  - estado inicial `applied: null`, `saveStatus: 'idle'`, `saveError: null`;
  - `login.fulfilled` y `sessionRestored` (acción que dispara `App` al terminar la restauración) →
    `applied = user.preferences`;
  - `refreshSession.fulfilled` en segundo plano y `loadMe.fulfilled` NO cambian `applied` (clarificación del
    2026-10-19): `loadMe` también se lanza a mitad de sesión cuando un Administrador cambia su propio rol (003,
    `usersSlice.ts`), y no debe pisar un cambio pendiente;
  - `logout.fulfilled` y `sessionCleared` → `applied: null`;
  - `savePreference({ theme: 'dark' })`: aplica `theme` al momento (antes de que resuelva la API, con
    `preferencesApi` mockeado); si la API va bien, `saveStatus: 'idle'` y `auth.user.preferences` se actualiza;
    si falla, `saveStatus: 'failed'`, `saveError` con el mensaje "No se ha podido guardar. Se mantiene hasta que
    cierres sesión." y `auth.user.preferences` sin cambios.
- [X] T008 [P] Crear `apps/client/src/features/preferences/useApplyAppearance.test.ts` (renderHook con store
  precargada):
  - con `applied` → `document.documentElement.dataset.theme` y `.dataset.density` toman sus valores y
    `localStorage['appearance.lastTheme']` guarda solo el tema;
  - con `applied: null` → `data-theme` = valor de `appearance.lastTheme` si es válido, si no `light`, y
    `data-density = 'comfortable'`; no escribe en `localStorage`;
  - si `localStorage` lanza (se mockea `getItem`/`setItem`), no rompe y usa `light`.
- [X] T009 [P] Crear `apps/client/src/components/OptionGroup.test.tsx` (research R11):
  - `role="radiogroup"` con `aria-label` o `aria-labelledby`, y cada opción `role="radio"` con `aria-checked`;
  - flechas derecha/abajo e izquierda/arriba mueven el foco y seleccionan (con vuelta al principio); solo la
    opción marcada tiene `tabIndex=0`;
  - `onChange(value)` se llama también al pulsar la opción ya marcada (reintento, FR-004);
  - la opción marcada lleva además el texto "Seleccionado" (oculto visualmente) para no depender del color.
- [X] T010 [P] Actualizar `apps/client/src/pages/SettingsPage.test.tsx`:
  - cualquier rol ve la pestaña "Apariencia", la primera, y `/ajustes` redirige a `/ajustes/apariencia`;
  - con `ajustes: edit` ve además "Usuarios";
  - se elimina el caso "No hay ajustes disponibles para tu rol." (R10) y se mantiene el de redirección de
    `/ajustes/usuarios` sin permiso.

### Implementación de Foundational

- [X] T011 Actualizar `apps/server/src/modules/users/user.model.ts`:
  - `UserFields` añade `theme: ThemePreference | null`, `tableDensity: TableDensity | null` y
    `moneyFormat: MoneyFormat | null`;
  - en el esquema, cada uno con `{ type: String, enum: [...valores, null], default: null }`;
  - `HOME_SCREENS` pasa a los 6 valores de `HomeScreen` (data-model.md). Sin migración.
- [X] T012 Crear `apps/server/src/modules/preferences/preferences.mapper.ts` con
  `toAppearancePreferences(doc: UserDocument): AppearancePreferences`, que resuelve `null` con `DEFAULT_THEME`,
  `DEFAULT_TABLE_DENSITY` y `DEFAULT_MONEY_FORMAT` (`homeScreen` se queda `null`). En
  `apps/server/src/modules/users/user.mapper.ts`, `toAuthUser` sustituye `homeScreen` por
  `preferences: toAppearancePreferences(doc)`. Actualizar los tests existentes que comprueban `homeScreen` en
  `AuthUser` (`auth.service.test.ts`, `auth.routes.test.ts` y los del cliente que lo precargan, buscando
  `homeScreen`).
- [X] T013 Crear `apps/server/src/modules/preferences/preferences.validation.ts`: `updatePreferencesBody`
  (zod) `.strict()` con los 4 campos opcionales y `nullable()`, enums de T001/T002 y
  `.refine((body) => Object.keys(body).length > 0, 'Indica al menos una preferencia')`.
- [X] T014 Crear `apps/server/src/modules/preferences/preferences.service.ts`:
  - `getPreferences(userId)`: lee el usuario y lo mapea con T012;
  - `updatePreferences(userId, permissions, change)`: guarda con `findByIdAndUpdate(userId, { $set: change },
    { new: true })` y devuelve `toAppearancePreferences`. La validación de `homeScreen` contra el rol se añade
    en T033 (US2). Cada función ≤20 líneas.
- [X] T015 Crear `apps/server/src/modules/preferences/preferences.controller.ts` (`update`: lee `req.auth`,
  llama al servicio y responde con `sendSuccess`) y `apps/server/src/modules/preferences/preferences.routes.ts`:
  `preferencesRouter.patch('/', requireAuth, validate({ body: updatePreferencesBody }), controller.update)`, sin
  `requirePermission`. Bloque `@openapi` copiado de `contracts/preferences-api.openapi.yaml` (esquemas
  `ThemePreference`, `TableDensity`, `MoneyFormat`, `HomeScreen`, `AppearancePreferences` y
  `UpdatePreferencesRequest`; respuestas 200, 400 y 401). Montarlo en `apps/server/src/app.ts` con
  `app.use('/api/preferences', preferencesRouter)`.
- [X] T016 Actualizar el bloque `@openapi` de `AuthUser` en `apps/server/src/modules/auth/auth.routes.ts`:
  `required` sustituye `homeScreen` por `preferences`, y la propiedad pasa a
  `preferences: { $ref: '#/components/schemas/AppearancePreferences' }`.
- [X] T017 Crear `apps/client/src/features/preferences/preferencesApi.ts`:
  `updatePreferences(change: UpdatePreferencesRequest): Promise<AppearancePreferences>` con `httpClient`
  (`PATCH /preferences`, desenvuelve `data`) y `toPreferencesErrorMessage(err)`, que devuelve siempre
  "No se ha podido guardar. Se mantiene hasta que cierres sesión." (FR-004).
- [X] T018 Crear `apps/client/src/features/preferences/preferencesSlice.ts` con el estado de data-model.md
  (`applied: AppearancePreferences | null`, `saveStatus: 'idle' | 'saving' | 'failed'`, `saveError`) y
  `pendingChange: UpdatePreferencesRequest` (campos aplicados aún sin guardar):
  - acción `sessionRestored(user | null)`, reducers por `extraReducers` (`login.fulfilled`,
    `logout.fulfilled`, `sessionCleared`) como en T007; `refreshSession.fulfilled` y `loadMe.fulfilled` no se
    escuchan;
  - acción síncrona `preferenceApplied(change)` y thunk `savePreference(change)`: despacha
    `preferenceApplied`, envía `{ ...pendingChange, ...change }` (así, volver a elegir cualquier opción
    reintenta lo pendiente) y, si va bien, limpia `pendingChange` y despacha `authPreferencesSaved(prefs)`.
  - Añadir `authPreferencesSaved` a `apps/client/src/features/auth/authSlice.ts` (actualiza
    `state.user.preferences` si hay usuario). Registrar `preferences` en `apps/client/src/store/store.ts`.
- [X] T019 En `apps/client/src/App.tsx`, `SessionRestore` despacha `sessionRestored(user)` con el usuario de
  `refreshSession` (o `null` si falla) antes de `setRestored(true)`.
- [X] T020 Crear `apps/client/src/features/preferences/useApplyAppearance.ts`: con `useLayoutEffect` (antes
  del pintado, para no destellar, R5) escribe `data-theme` y `data-density` en `document.documentElement`
  según T008, y guarda `appearance.lastTheme` cuando hay `applied`. Las lecturas y escrituras de
  `localStorage` van en helpers con `try/catch` (`readLastTheme`, `writeLastTheme`). Llamarlo en un
  componente `AppearanceRoot` dentro del `Provider` de `apps/client/src/App.tsx`, por encima de
  `SessionRestore` y `AppRouter`, para que su `useLayoutEffect` corra en el mismo commit que cualquier cambio de
  `preferences.applied`.
- [X] T021 Crear `apps/client/src/components/OptionGroup.tsx` (+ `.module.css`) según T009 y el tablero:
  - props `label` o `labelledBy`, `options: { value; label; description?; preview?: ReactNode }[]`,
    `value`, `onChange` y `variant: 'cards' | 'buttons'`;
  - en `cards`, rejilla `repeat(auto-fit, minmax(220px, 1fr))` con vista previa y descripción; en `buttons`,
    botones de 44 px en fila;
  - la marcada con borde de 2 px `accent` y fondo `accentSoft`, foco con el `:focus-visible` global.
- [X] T022 Crear `apps/client/src/pages/AppearanceSettingsPage.tsx` (+ `.module.css`) con un panel "Apariencia"
  vacío y el aviso `Alert` cuando `saveStatus === 'failed'` (texto de `saveError`, `role="status"`). Actualizar
  `apps/client/src/pages/SettingsPage.tsx`: `useSettingsTabs` devuelve siempre
  `{ to: '/ajustes/apariencia', label: 'Apariencia' }` primero y Usuarios si `ajustes: edit`; quitar la rama
  "No hay ajustes disponibles para tu rol." En `apps/client/src/routes/AppRouter.tsx`, ruta hija `apariencia`
  dentro de `settingsRoute`, solo con sesión.

**Checkpoint**: `PATCH /api/preferences` funciona, `AuthUser.preferences` llega al cliente, `<html>` lleva
`data-theme` y `data-density`, y la pestaña Apariencia se abre para todos los roles. `npm run lint` y
`npm test --workspaces` en verde.

---

## Phase 3: User Story 1 - Elegir el tema (Priority: P1) 🎯 MVP

**Goal**: elegir Claro, Oscuro o Según el sistema, aplicado al momento, guardado por usuario y sin destello en
el login ni al entrar.

**Independent Test**: quickstart §2: Oscuro en web → cerrar sesión (login en oscuro) → entrar en escritorio en
oscuro sin destello; Según el sistema sigue al equipo en vivo.

### Tests de US1 (primero, deben fallar) ⚠️

- [X] T023 [P] [US1] Crear `apps/client/src/features/preferences/components/AppearanceForm.test.tsx` (bloque
  Tema):
  - con `applied.theme = 'light'` aparece "Claro" marcado (`aria-checked`) en el grupo "Tema";
  - al pulsar "Oscuro" se despacha `savePreference({ theme: 'dark' })` y el grupo lo marca al momento;
  - las 3 opciones llevan su descripción del tablero.
- [X] T024 [P] [US1] Crear `e2e/appearance.spec.ts` (Playwright, con el servidor E2E de ADR 0004):
  - el usuario `admin` elige "Oscuro" y `html[data-theme]` es `dark`;
  - tras cerrar sesión, el login tiene `data-theme="dark"` desde el primer documento (comprobado con
    `page.addInitScript`, que registra el valor de `data-theme` en `DOMContentLoaded` antes de que cargue React);
  - al recargar con la sesión abierta, el primer valor registrado ya es `dark`;
  - con `page.emulateMedia({ colorScheme: 'dark' })` y "Según el sistema", el fondo de `body` es el oscuro
    (`#111417`), y al emular `light` vuelve a `#F3F4F1` sin recargar.

### Implementación de US1

- [X] T025 [US1] Añadir a `apps/client/index.html`, dentro de `<head>` y antes de los `<link>`, un script inline
  (≤10 líneas, sin dependencias) que lee `localStorage['appearance.lastTheme']` dentro de `try/catch` y pone
  `document.documentElement.dataset.theme` a ese valor si es `light`, `dark` o `system`, o a `light` en otro
  caso (research R5, FR-007).
- [X] T026 [US1] Crear `apps/client/src/features/preferences/components/AppearanceForm.tsx` (+ `.module.css`)
  con el bloque "Tema" del tablero: cabecera "Tema", subtítulo "Se guarda por usuario y se aplica en la web y en
  la aplicación de escritorio." y `OptionGroup variant="cards"` con:
  - textos del tablero: Claro ("Papel y tinta. Recomendado para oficina."), Oscuro ("Menos brillo en turnos
    largos o poca luz.") y Según el sistema ("Sigue la configuración del equipo.");
  - vista previa con los colores de cada tema (barra `nav`, fondo `bg`, línea `ink`, panel `surface` y botón
    `accent`); en "Según el sistema", fondo partido `linear-gradient(90deg, #F3F4F1 50%, #111417 50%)` como en
    el tablero;
  - `onChange` → `dispatch(savePreference({ theme }))`.
  Montarlo en `AppearanceSettingsPage`.
- [X] T027 [US1] Garantizar que no destella al entrar, sin código condicional: la navegación tras el login la
  hace `<Navigate>` en `apps/client/src/pages/LoginPage.tsx` (línea `if (isAuthenticated && user) return
  <Navigate …>`) en el mismo commit en que `login.fulfilled` cambia `preferences.applied`, y el
  `useLayoutEffect` de `AppearanceRoot` (T020) escribe `data-theme` antes del pintado. No se modifican
  `LoginForm.tsx` ni `LoginPage.tsx`. Añadir a `useApplyAppearance.test.ts` (T008) un caso que, con la store
  real, despacha `login.fulfilled` con `preferences.theme = 'dark'` dentro de `act` y comprueba que
  `data-theme` ya es `dark` al terminar `act`, sin esperar a ningún efecto posterior. El E2E de T024 lo
  confirma en el navegador.

**Checkpoint**: quickstart §2 pasa en web y escritorio. MVP entregable.

---

## Phase 4: User Story 2 - Elegir la pantalla de inicio (Priority: P2)

**Goal**: elegir la pantalla de inicio entre las permitidas para el rol, con la pantalla por defecto efectiva y
sin bucles de redirección.

**Independent Test**: quickstart §3: Comercial elige Clientes y entra en Clientes; si pierde el acceso, llega a
Productos; un rol sin Productos llega a Ventas sin bucle.

### Tests de US2 (primero, deben fallar) ⚠️

- [X] T028 [P] [US2] Ampliar `apps/server/src/modules/preferences/preferences.routes.test.ts`:
  - Comercial con `{ homeScreen: 'clientes' }` → 200;
  - Comercial con `{ homeScreen: 'proveedores' }` → 400 `PREFERENCES_HOME_SCREEN_NOT_ALLOWED`;
  - `{ homeScreen: 'panel' }` → 400 (todavía no existe);
  - `{ homeScreen: null }` → 200 con `homeScreen: null`.
- [X] T029 [P] [US2] Crear `apps/client/src/routes/homeRoute.test.ts`:
  - `from` permitido → `from`;
  - `preferences.homeScreen` permitido → esa pantalla;
  - `homeScreen` no permitido o `null` → `/productos` si el rol la ve;
  - rol sin Productos con `ventas: 'view'` → `/ventas` (primera de `AVAILABLE_HOME_SCREENS`);
  - rol sin ninguna pantalla → `/ajustes/apariencia`;
  - `effectiveHomeScreen(user)` devuelve la pantalla que debe aparecer seleccionada (FR-016).
- [X] T030 [P] [US2] Ampliar `apps/client/src/routes/RequireAuth.test.tsx`: un usuario cuyo rol solo tiene
  `ventas: 'view'` que abre `/productos` acaba en `/ventas`, sin bucle de redirección (SC-006).
- [X] T031 [P] [US2] Ampliar `apps/client/src/features/preferences/components/AppearanceForm.test.tsx` (bloque
  Pantalla de inicio):
  - un Comercial ve en el selector "Ventas", "Clientes", "Productos" y "Cobros", pero no "Proveedores";
  - con `homeScreen: 'proveedores'` guardado y sin permiso, aparece seleccionada "Productos";
  - al elegir "Clientes" se despacha `savePreference({ homeScreen: 'clientes' })`.

### Implementación de US2

- [X] T032 [US2] Actualizar `apps/client/src/routes/homeRoute.ts`:
  - nueva función `defaultHomeRoute(user)`: `DEFAULT_HOME_SCREEN` si `can(permissions, …, 'view')`, si no la
    primera de `AVAILABLE_HOME_SCREENS` que pueda ver, y si no hay ninguna `/ajustes/apariencia`;
  - `resolveHomeRoute` lee `user.preferences.homeScreen`, la acepta solo si `isHomeScreenAllowed` y, si no,
    usa `defaultHomeRoute`;
  - nueva `effectiveHomeScreen(user): HomeScreen | null` para el selector.
  Así `RequireAuth` deja de redirigir en bucle (research R9).
- [X] T033 [US2] En `apps/server/src/modules/preferences/preferences.service.ts`, antes de guardar, si
  `change.homeScreen` no es `null`/`undefined` y `!isHomeScreenAllowed(permissions, change.homeScreen)`, lanzar
  `new AppError(PREFERENCES_ERROR_CODES.homeScreenNotAllowed, 400, 'Tu rol no tiene acceso a esa pantalla.')`
  (helper `assertHomeScreenAllowed`).
- [X] T034 [US2] Añadir a `AppearanceForm.tsx` el bloque "Pantalla de inicio" con el `Select` de 003:
  - etiqueta "Pantalla de inicio";
  - opciones: `AVAILABLE_HOME_SCREENS` filtradas con `isHomeScreenAllowed(user.permissions, …)` y nombres
    visibles "Ventas", "Clientes", "Productos", "Proveedores" y "Cobros";
  - valor `effectiveHomeScreen(user)` y `onChange` → `savePreference({ homeScreen })`;
  - reintento (FR-004): si `saveStatus === 'failed'` y `pendingChange.homeScreen` está definido, `onBlur`
    vuelve a despachar `savePreference({})`, porque un `<select>` no avisa al volver a elegir la misma opción.

**Checkpoint**: quickstart §3 pasa.

---

## Phase 5: User Story 3 - Elegir el formato de importes (Priority: P2)

**Goal**: formato de importes elegible, aplicado por los componentes genéricos `Money` y `MoneyField`.

**Independent Test**: quickstart §4: tests de `money.ts`, `Money` y `MoneyField` con los dos formatos, y el
selector conserva el valor al recargar.

### Tests de US3 (primero, deben fallar) ⚠️

- [ ] T035 [P] [US3] Crear `apps/client/src/utils/money.test.ts` con los ejemplos de quickstart §4:
  - `formatMoney(1248.5, 'es')` → "1.248,50 €" y `'en'` → "€ 1,248.50";
  - `-35` → "-35,00 €" y "€ -35.00";
  - `1234567.899` → "1.234.567,90 €" y "€ 1,234,567.90";
  - `0` → "0,00 €" y "€ 0.00";
  - `parseMoney` con `'es'`: "1.248,50", "1248,5", "1248", "-35,00" y "1.248,50 €" se aceptan; "1,248.50",
    "12.48", "1.24,50" (miles mal agrupados) y "1,234" (más de 2 decimales) se rechazan con
    "Formato esperado: 1.248,50";
  - con `'en'`, lo simétrico y "Formato esperado: 1,248.50";
  - el mismo importe en los dos formatos da exactamente el mismo número (`toBe`).
- [ ] T036 [P] [US3] Crear los tests de los componentes genéricos, que reciben el formato por prop (constitución
  VIII: "se configuran por props"), sin store:
  - `apps/client/src/components/Money.test.tsx`: `<Money value={1248.5} format="es" />` muestra "1.248,50 €" y
    con `format="en"` "€ 1,248.50"; solo formatea el número que recibe (FR-013);
  - `apps/client/src/components/MoneyField.test.tsx`: con cada `format`, muestra el error de `parseMoney` al
    salir del campo con un valor inválido, llama a `onValueChange(number | null)` con valores válidos y tiene
    `inputMode="decimal"`.
  Crear además `apps/client/src/features/preferences/components/UserMoney.test.tsx`: con la store precargada,
  `UserMoney` y `UserMoneyField` pasan `applied.moneyFormat` (o `DEFAULT_MONEY_FORMAT` sin sesión) y cambian
  al cambiar la preferencia.
- [ ] T037 [P] [US3] Ampliar `AppearanceForm.test.tsx` (bloque Formato de importes): opciones "1.248,50 €" y
  "€ 1,248.50", valor actual seleccionado y `savePreference({ moneyFormat: 'en' })` al cambiar.

### Implementación de US3

- [ ] T038 [US3] Crear `apps/client/src/utils/money.ts` (research R8):
  - `formatMoney(value: number, format: MoneyFormat): string` con `Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2 })` y `formatToParts`, cambiando grupo y decimal según
    el formato y colocando el símbolo ("1.248,50 €" / "€ 1,248.50");
  - `parseMoney(text, format): { ok: true; value: number } | { ok: false; error: string }` con una expresión
    estricta por formato (miles opcionales bien agrupados, como mucho 2 decimales, signo menos opcional y €
    opcional delante o detrás según el formato), calculando en céntimos enteros (FR-012);
  - `MONEY_FORMAT_EXAMPLES: Record<MoneyFormat, string>` = `{ es: '1.248,50 €', en: '€ 1,248.50' }`.
- [ ] T039 [US3] Crear:
  - `apps/client/src/components/Money.tsx`: genérico, props `value: number` y `format: MoneyFormat`; `<span>`
    en IBM Plex Mono con `font-variant-numeric: tabular-nums`. Sin store (constitución VIII);
  - `apps/client/src/components/MoneyField.tsx`: genérico sobre `TextField`, props `format`, `value` y
    `onValueChange(number | null)`; valida al salir con `parseMoney` y muestra el error del campo. Sin store;
  - `apps/client/src/features/preferences/useMoneyFormat.ts`: lee `applied?.moneyFormat ??
    DEFAULT_MONEY_FORMAT`;
  - `apps/client/src/features/preferences/components/UserMoney.tsx`: exporta `UserMoney` y `UserMoneyField`,
    envoltorios finos que toman el formato con `useMoneyFormat()` y renderizan `Money` / `MoneyField`. Son los
    que usarán las pantallas de negocio.
- [ ] T040 [US3] Añadir a `AppearanceForm.tsx` el bloque "Formato de importes" con el `Select` (fuente IBM
  Plex Mono), opciones de `MONEY_FORMAT_EXAMPLES`, `onChange` → `savePreference({ moneyFormat })` y el mismo
  reintento por `onBlur` de T034.

**Checkpoint**: quickstart §4 pasa. Los módulos de negocio futuros usarán `UserMoney` y `UserMoneyField` (T047).

---

## Phase 6: User Story 4 - Elegir la densidad de tablas (Priority: P3)

**Goal**: densidad Compacta en todas las tablas de escritorio, con al menos un 25 % más de filas y controles de
44 px.

**Independent Test**: quickstart §5 en Ajustes › Usuarios: Compacta muestra al menos un 25 % más de filas a
1440 × 900 y las tarjetas de móvil no cambian.

### Tests de US4 (primero, deben fallar) ⚠️

- [ ] T041 [P] [US4] Ampliar `AppearanceForm.test.tsx` (bloque Densidad): `OptionGroup variant="buttons"` con
  "Cómoda" y "Compacta", la actual marcada y `savePreference({ tableDensity: 'compact' })` al pulsar.
- [ ] T042 [P] [US4] E2E de densidad sin retirar la cuenta inicial: los E2E comparten servidor y base de datos
  entre archivos y entre los proyectos `desktop` y `mobile`, y `smoke.spec.ts` necesita `admin`. Dar de alta un
  Administrador por la API lo retiraría (003), así que los datos se crean directamente en la base de datos:
  - en `e2e/support/startServer.ts`, escribir la URI de MongoDB en memoria en
    `path.join(os.tmpdir(), 'app-b2b-e2e-mongo-uri')` al arrancar y borrarla al parar;
  - crear `e2e/support/db.ts` con `seedUsers(users)` y `removeUsers(logins)`: leen esa URI, conectan con
    `mongoose` (ya en el monorepo) y crean los documentos con el `UserModel` de
    `apps/server/src/modules/users/user.model.ts` y `hashPassword` de `apps/server/src/utils/password.ts`
    (`status: 'Activo'`, `isBootstrap: false`), sin pasar por `createUser`, que retiraría la cuenta inicial;
  - en `e2e/appearance.spec.ts`, un `test.describe` de densidad que en `beforeAll` siembra un Administrador
    (`e2e.admin.<proyecto>@empresa.es`) y 12 Comerciales con logins únicos por proyecto, y en `afterAll` los
    borra; entra con ese Administrador, abre Ajustes › Usuarios a 1440 × 900, mide la altura de una fila
    (`tbody tr`) en Cómoda y en Compacta, y comprueba que `alturaCómoda / alturaCompacta ≥ 1.25` y que el
    botón de opciones de la fila sigue midiendo 44 × 44 px. En el proyecto `mobile`, comprueba que la altura de
    la tarjeta no cambia;
  - los tests de T024 siguen usando `admin` y no dan de alta usuarios por la API.

### Implementación de US4

- [ ] T043 [US4] En `apps/client/src/components/Table.module.css`:
  - `.table td` usa `padding: var(--table-cell-py, 12px) var(--space-4)` y `.table th`
    `padding: var(--table-head-py, 10px) var(--space-4)`;
  - añadir `:root[data-density='compact'] { --table-cell-py: 4px; --table-head-py: 6px; }` en
    `apps/client/src/styles/tokens.css` (research R7);
  - las tarjetas (`.mob`) no usan estas variables.
- [ ] T044 [US4] Añadir a `AppearanceForm.tsx` el bloque "Densidad de tablas" con
  `OptionGroup variant="buttons"` etiquetado por "Densidad de tablas" y `onChange` →
  `savePreference({ tableDensity })`. Con T026, T034 y T040, completar la rejilla del tablero
  (`repeat(auto-fit, minmax(240px, 1fr))`, 20 px de separación) para densidad, formato e inicio.

**Checkpoint**: quickstart §5 pasa. Las 4 historias funcionan de forma independiente.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T045 [P] Actualizar `docs/design/README.md`, línea del formato de importes: sustituir
  `toLocaleString('es-ES', { minimumFractionDigits: 2 })` por "`formatMoney` (`apps/client/src/utils/money.ts`);
  `es-ES` no agrupa los miles de números de 4 cifras" (research R8). No cambia el lienzo.
- [ ] T046 [P] Comprobar que `/api-docs` coincide con `contracts/preferences-api.openapi.yaml` (`PATCH
  /preferences`, esquemas y códigos) y con el `AuthUser` con `preferences`, comparando el spec generado por
  `buildSwaggerSpec()` como en 003 T078.
- [ ] T047 [P] Añadir a la sección Convenciones de `CLAUDE.md`: "MUST mostrar los importes con `<UserMoney>` y
  pedirlos con `<UserMoneyField>` (`apps/client/src/features/preferences/components/UserMoney.tsx`, sobre los
  genéricos `Money` y `MoneyField`); NEVER formatear importes a mano ni usarlos para cantidades no monetarias
  como unidades o stock (004, FR-011, FR-013)".
- [ ] T048 Revisar la accesibilidad de `/ajustes/apariencia` a 390 px y 1440 px, en claro y en oscuro, con
  `playwright-cli` (FR-018): etiquetas, teclado en los grupos de radio, opción marcada también como texto,
  objetivos de 44 px, contraste de 4.5:1 y sin scroll horizontal.
- [ ] T049 Ejecutar `npm run lint`, `npm test --workspaces` y `npm run test:e2e` en verde. Validar a mano
  quickstart.md completo en web y, al menos, §2 y §3 en escritorio (`npm run dev --workspace=apps/desktop`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias. T001–T003 en paralelo salvo que T003 usa los tipos de T001/T002; T004
  después.
- **Foundational (Phase 2)**: depende de Setup. Bloquea todas las historias.
- **US1 (Phase 3)**: depende de Foundational. Es el MVP.
- **US2, US3 y US4 (Phases 4–6)**: dependen de Foundational y son independientes entre sí, pero todas tocan
  `AppearanceForm.tsx` (y su test), así que esas tareas van en serie: T026 → T034 → T040 → T044.
- **Polish (Phase 7)**: después de las historias que se vayan a entregar.

### Within Each User Story

- Tests primero (deben fallar), después la implementación.
- Servidor antes que cliente cuando la historia toca los dos (US2: T033 antes de comprobar T028).

### Parallel Opportunities

- Foundational: T005–T010 en paralelo (archivos distintos). En la implementación, el servidor (T011–T016) y
  el cliente (T017–T022) pueden avanzar en paralelo.
- US2: T028–T031 en paralelo; T032 y T033 en paralelo (cliente y servidor).
- US3: T035–T037 en paralelo; T038 antes que T039.
- Polish: T045–T047 en paralelo.

---

## Parallel Example: Foundational

```text
Tests a la vez:
  T005 preferences.service.test.ts       T006 preferences.routes.test.ts
  T007 preferencesSlice.test.ts          T008 useApplyAppearance.test.ts
  T009 OptionGroup.test.tsx              T010 SettingsPage.test.tsx
Implementación en dos líneas:
  Servidor: T011 → T012 → T013 → T014 → T015 → T016
  Cliente:  T017 → T018 → T019 → T020, y T021 y T022 en paralelo
```

## Parallel Example: User Story 2

```text
Tests:          T028 (servidor) | T029 homeRoute | T030 RequireAuth | T031 AppearanceForm
Implementación: T032 homeRoute.ts | T033 preferences.service.ts → T034 AppearanceForm.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (Setup) + Phase 2 (Foundational).
2. Phase 3 (US1): tema con guardado por usuario y sin destello.
3. **Parar y validar**: quickstart §2 en web y escritorio.

### Incremental Delivery

1. Setup + Foundational → base lista (pestaña Apariencia vacía y endpoint).
2. US1 → tema (MVP).
3. US2 → pantalla de inicio y corrección del bucle de redirecciones (SC-006).
4. US3 → formato de importes listo para los módulos de negocio.
5. US4 → densidad Compacta.
6. Polish → documentación, convención en CLAUDE.md, accesibilidad y validación completa.
