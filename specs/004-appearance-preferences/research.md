# Research: Preferencias personales (004-appearance-preferences)

Fase 0 del plan. Cada decisión resuelve una incógnita del Technical Context de `plan.md` y parte de lo que
ya existe tras 001-user-login, 002-desktop-local-backend y 003-user-management:

- `tokens.css` ya define el tema oscuro para `:root[data-theme='dark']` y, dentro de
  `@media (prefers-color-scheme: dark)`, para `:root[data-theme='system']`.
- `User.homeScreen` y `AuthUser.homeScreen` ya existen (001), con el enum `panel | ventas | productos`.
- `resolveHomeRoute(user, from)` ya aplica el orden de destino de 001 (FR-006).
- Los módulos de negocio (Ventas, Clientes, Productos, Proveedores, Cobros) son todavía `ModulePlaceholder`:
  hoy no hay importes en pantalla ni tablas de negocio; la única tabla es la de Ajustes › Usuarios.

## R1. Dónde se guardan las preferencias (FR-002, FR-003, Key Entities)

- **Decision**: en el propio documento `users`, como campos planos junto al `homeScreen` que ya existe:
  `theme`, `tableDensity` y `moneyFormat`. `null` (o ausente) significa "valor por defecto".
- **Rationale**: son 4 valores por usuario, se leen siempre junto con el usuario (login, refresh, `/auth/me`)
  y no necesitan historial. Al reutilizar el documento no hace falta migración: los usuarios existentes
  quedan con los valores por defecto. La cuenta inicial `admin` también es un documento `users`, así que sus
  preferencias desaparecen con ella al retirarla (edge case de la spec).
- **Alternatives considered**: colección `userPreferences` aparte (otra consulta en cada login y borrado en
  cascada al retirar la cuenta inicial, sin ganancia); subdocumento `preferences` (obligaría a migrar el
  `homeScreen` existente).

## R2. Cómo llegan las preferencias al cliente (FR-003, edge case de dos equipos)

- **Decision**: `AuthUser` añade `preferences: AppearancePreferences` (los 4 valores, ya resueltos con sus
  valores por defecto) y pierde el `homeScreen` de primer nivel, que pasa a `preferences.homeScreen`. Lo
  devuelven login, `/auth/refresh` y `/auth/me`, como hoy.
- **Rationale**: el cliente tiene las preferencias en la misma respuesta con la que sabe quién es el usuario,
  así que puede aplicarlas antes de pintar la pantalla de destino (R5). Un cambio hecho en otro equipo llega
  al recargar o al iniciar sesión, nunca con la renovación en segundo plano (clarificación del 2026-10-19,
  R6).
  Agrupar en un objeto deja el contrato claro y es el mismo tipo que devuelve el endpoint de guardado (R3).
- **Alternatives considered**: mantener `homeScreen` arriba y añadir 3 campos hermanos (mezcla preferencias
  con identidad); endpoint `GET /preferences` aparte (una petición más y una ventana con el tema equivocado).

## R3. Endpoint de guardado (FR-001, FR-002, FR-004, FR-014)

- **Decision**: nuevo módulo de dominio `apps/server/src/modules/preferences/` con
  `PATCH /api/preferences`:
  - Solo exige sesión (`requireAuth`), sin permiso de módulo: cualquier rol, incluida la cuenta inicial.
  - Siempre actúa sobre el usuario de la sesión; no hay id en la ruta, así que no se pueden tocar las
    preferencias de otro (FR-001).
  - Cuerpo parcial validado con zod (`preferences.validation.ts`): al menos un campo, valores del enum o
    `null` para volver al valor por defecto. Responde con las `AppearancePreferences` guardadas.
  - `homeScreen` se valida además contra el rol: si no está en `AVAILABLE_HOME_SCREENS` (R9) o el rol no
    tiene al menos `view` en ese módulo, responde 400 `PREFERENCES_HOME_SCREEN_NOT_ALLOWED`.
- **Rationale**: cumple la constitución (I, II, III y IV) con un dominio pequeño y propio. El cliente envía
  solo el campo que cambia, así que dos cambios seguidos no se pisan.
- **Alternatives considered**: `PATCH /users/:id` de 003 (exige `ajustes: edit`, solo para Administradores);
  ruta dentro de `modules/auth/` (mezcla sesión y preferencias); `PUT` con el objeto completo (dos pestañas
  abiertas se pisarían los valores).

## R4. Aplicar tema y densidad en la interfaz (FR-005, FR-006, FR-008)

- **Decision**: atributos en `<html>`:
  - `data-theme="light" | "dark" | "system"`. `tokens.css` ya resuelve los tres. Con `system`, el cambio del
    modo del equipo lo aplica el navegador en vivo por la media query, sin JavaScript (SC-003). Si el equipo
    no informa del modo, `prefers-color-scheme` no coincide con `dark` y queda el tema claro (FR-006).
  - `data-density="comfortable" | "compact"`, que leen los estilos de `Table` (R7).
- Un hook `useApplyAppearance()` en la raíz de la app escribe ambos atributos a partir del estado.
- **Rationale**: reutiliza el mecanismo de tokens que ya existe y no añade escuchas de `matchMedia`.
- **Alternatives considered**: clases CSS (equivalentes, pero los tokens ya usan `data-theme`); escuchar
  `matchMedia('(prefers-color-scheme: dark)')` en JS (innecesario con la media query).

## R5. Tema antes del login y sin destello (FR-007, SC-002)

- **Decision**:
  - El último tema usado se guarda en el equipo en `localStorage` con la clave `appearance.lastTheme`. Solo
    se guarda el valor (`light`, `dark` o `system`), nunca quién lo usó (FR-007). Se actualiza cada vez que
    se aplica un tema y se conserva al cerrar sesión.
  - Un script inline mínimo en `apps/client/index.html`, antes del CSS y del bundle, lee esa clave y fija
    `data-theme` (o `light` si no hay valor válido o `localStorage` falla). Así la pantalla de login no
    destella.
  - Al iniciar sesión, el tema del usuario se aplica en cuanto llega la respuesta de login, antes de navegar
    a la pantalla de destino (R6). Si la sesión se restaura al arrancar (sesión persistente), se aplica al
    recibir `/auth/refresh`, mientras se muestra la carga inicial.
- En escritorio, `localStorage` persiste en `userData` porque el esquema `app://` está registrado como
  `standard` y `secure` (`apps/desktop/src/main.ts`), y en desarrollo el origen es el servidor de Vite.
- **Rationale**: es la forma estándar de evitar el destello: el atributo está puesto antes del primer
  pintado. No hay CSP que bloquee scripts inline en `index.html` ni en Electron.
- **Alternatives considered**: cookie (viaja al servidor sin necesidad); guardar el último tema en el
  servidor (antes del login no se sabe quién es); esperar al bundle de React (destella).

## R6. Aplicar al momento y guardar en segundo plano (FR-002, FR-004, SC-001)

- **Decision**: nuevo feature `apps/client/src/features/preferences/` con `preferencesSlice.ts` y
  `preferencesApi.ts`:
  - El slice guarda las preferencias **aplicadas** (lo que se ve) y el estado de guardado
    (`idle | saving | failed`, con mensaje). Se inicializan con `AuthUser.preferences` al iniciar sesión y
    al arrancar la aplicación (restauración de la sesión o `/auth/me` tras recargar), y vuelven a los valores
    por defecto al cerrar sesión (el tema del login sigue siendo `appearance.lastTheme`).
  - La renovación en segundo plano (`/auth/refresh` cada 15 min) actualiza `auth.user`, pero NO toca
    `applied` (clarificación del 2026-10-19): evita cambios a mitad de una tarea y no pisa un cambio local
    que no se pudo guardar.
  - Thunk `savePreference(change)`: aplica el cambio al momento (acción síncrona) y después hace el `PATCH`.
    Si va bien, actualiza también `auth.user.preferences` (lo guardado). Si falla, el cambio se sigue viendo,
    se muestra "No se ha podido guardar. Se mantiene hasta que cierres sesión." y `auth.user.preferences`
    no cambia, así que la próxima sesión usa el último valor guardado (edge case y FR-004).
  - Sin reintento automático ni botón «Reintentar» (clarificación del 2026-10-19): volver a elegir la
    opción, aunque ya esté marcada, envía otra vez el `PATCH`. Por eso `OptionGroup` y el `Select` notifican
    también la selección del valor actual mientras `saveStatus` es `failed`.
- **Rationale**: SC-001 (< 1 s) se cumple sin esperar a la red, y el aviso deja claro que no está guardado.
- **Alternatives considered**: esperar a la respuesta antes de aplicar (incumple "al momento" con red lenta);
  revertir el cambio si falla (la spec pide mantenerlo en pantalla y avisar).

## R7. Densidad Compacta (FR-008, FR-009, SC-005)

- **Decision**: `Table.module.css` pasa el padding vertical de las celdas a la variable
  `--table-cell-py`: 12 px en Cómoda (como hoy) y 4 px con `:root[data-density='compact']`. Las cabeceras
  pasan de 10 px a 6 px. Los controles de las filas mantienen los 44 px de `IconButton`.
  - Fila con controles de 44 px: de 68 px a 52 px, un 31 % más de filas.
  - Fila solo de texto (línea de 20 px): de 44 px a 28 px, un 57 % más de filas.
  - La variante de tarjetas (`.mob`, menos de 760 px) no cambia (supuesto de la spec).
- **Rationale**: un único punto de cambio en el componente genérico (constitución VIII) cumple el 25 % sin
  reducir los objetivos táctiles.
- **Alternatives considered**: reducir también la letra (no lo pide la spec y empeora la lectura); una prop
  `density` en `Table` (habría que pasarla en cada uso).

## R8. Formato de importes (FR-010–FR-013, SC-004)

- **Decision**:
  - `packages/shared`: tipo `MoneyFormat = 'es' | 'en'` ("1.248,50 €" y "€ 1,248.50") y constante
    `DEFAULT_MONEY_FORMAT = 'es'`.
  - `apps/client/src/utils/money.ts`:
    - `formatMoney(value, format)`: `Intl.NumberFormat('en-US')` con 2 decimales fijos y `formatToParts`,
      cambiando los separadores según el formato. Se parte
      de `en-US` porque `es-ES` no agrupa los miles en números de 4 cifras ("1248,50"), y el diseño exige
      "1.248,50 €". El redondeo a 2 decimales lo hace `Intl` sobre el valor decimal, sin errores de coma
      flotante. Negativos: "-35,00 €" y "€ -35.00".
    - `parseMoney(text, format)`: expresión estricta por formato, con separador de miles opcional pero bien
      agrupado y como mucho 2 decimales, con o sin el símbolo €. Devuelve el número o un error con el
      formato esperado ("Formato esperado: 1.248,50"). Nunca reinterpreta el otro separador (FR-012). El
      valor se calcula en céntimos enteros para que sea idéntico con los dos formatos.
  - Componentes genéricos nuevos en `apps/client/src/components/`: `Money` (muestra un importe en IBM Plex
    Mono con el formato del usuario) y `MoneyField` (campo de importe sobre `TextField` que valida con
    `parseMoney`). Ambos leen el formato con el hook `useMoneyFormat()`.
- Hoy no hay cifras monetarias en ninguna pantalla, así que SC-004 se cumple sin cambiar pantallas. Para que
  se siga cumpliendo, se añade a CLAUDE.md la convención de mostrar y pedir importes solo con `Money` y
  `MoneyField`.
- **Rationale**: una única implementación del formato (constitución VIII) que los módulos de negocio usarán
  al implementarse.
- **Alternatives considered**: `toLocaleString('es-ES')` como dice el README del diseño (no agrupa 4 cifras);
  una librería de formato (dependencia innecesaria); guardar importes como texto (el valor guardado debe ser
  independiente del formato).

## R9. Pantallas candidatas a inicio y pantalla por defecto (FR-014–FR-017, SC-006)

- **Decision**:
  - `HomeScreen` se amplía a `'panel' | 'ventas' | 'clientes' | 'productos' | 'proveedores' | 'cobros'`
    (enum del modelo y del contrato).
  - Nueva constante `AVAILABLE_HOME_SCREENS` en `packages/shared`: las pantallas con ruta en la aplicación.
    Hoy son `ventas`, `clientes`, `productos`, `proveedores` y `cobros`, que existen como rutas aunque su
    contenido sea provisional. `panel` se añadirá cuando exista la pantalla.
  - El selector ofrece `AVAILABLE_HOME_SCREENS` en las que el rol tiene al menos `view`.
  - **Pantalla por defecto efectiva**: `DEFAULT_HOME_SCREEN` (Productos) si el rol puede verla; si no, la
    primera de `AVAILABLE_HOME_SCREENS` que pueda ver; si no hay ninguna, `/ajustes/apariencia`, que es
    accesible para todos.
    - Corrige un fallo de 003: con un rol sin acceso a Productos (por ejemplo, el «Repartidor» del
      quickstart de 003), `resolveHomeRoute` devolvía `/productos`, y `RequireAuth` volvía a redirigir al
      mismo sitio en bucle (incumple SC-006).
  - Si la pantalla guardada deja de estar permitida, no se borra de la base de datos: el cliente va a la
    pantalla por defecto efectiva y el selector la muestra seleccionada (FR-016). Si el rol recupera el
    acceso, vuelve a valer la elegida.
- **Rationale**: la lista de pantallas existentes vive en un solo sitio y la regla "nunca a una pantalla sin
  acceso" se cumple también con roles creados en la base de datos (003, FR-026).
- **Confirmado** (clarificación del 2026-10-19): cuenta como existente toda pantalla con ruta en la
  aplicación, aunque su contenido sea provisional.
- **Alternatives considered**: calcular las pantallas existentes desde el router (el servidor también las
  necesita para validar); reescribir `homeScreen` a `null` en el servidor al cambiar el rol (pierde la
  elección si se recupera el acceso).

## R10. Pestaña Apariencia para todos los roles (FR-001, supuestos)

- **Decision**: `SettingsPage` muestra siempre la pestaña **Apariencia**, la primera, sin exigir permiso; la
  pestaña Usuarios sigue exigiendo `ajustes: edit`. Nueva ruta hija `apariencia` (solo sesión) y el índice
  `/ajustes` redirige a ella. El mensaje "No hay ajustes disponibles para tu rol." deja de ser alcanzable y
  se elimina.
- **Rationale**: es lo que anticipaba 003 (T036: "hasta que 004 añada Apariencia").
- **Alternatives considered**: poner Apariencia fuera de Ajustes (el diseño la coloca como pestaña).

## R11. Controles de Apariencia y accesibilidad (FR-018)

- **Decision**: nuevo componente genérico `OptionGroup` en `apps/client/src/components/`: un `radiogroup`
  con navegación por flechas (tabindex itinerante), opción marcada con `aria-checked`, borde en acento y
  texto, y objetivos de 44 px. Admite contenido por opción, así que sirve para las tarjetas de tema con
  vista previa y para los botones de densidad del tablero `Ajustes.dc.html`. Formato de importes y pantalla
  de inicio usan el `Select` de 003.
- **Rationale**: el tablero usa dos grupos de radio con el mismo comportamiento; implementarlo una vez cumple
  la constitución (VIII).
- **Alternatives considered**: `<input type="radio">` con estilos (más difícil de igualar al tablero en las
  tarjetas); dos componentes distintos (duplica el comportamiento de teclado).

## R12. Dependencias

- **Decision**: ninguna dependencia nueva. `Intl.NumberFormat`, `localStorage` y las media queries ya están en
  los navegadores y en Electron 34.
