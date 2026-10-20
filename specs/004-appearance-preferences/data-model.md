# Data Model: Preferencias personales (004-appearance-preferences)

Las decisiones están en [research.md](research.md). Solo cambia la colección `users` (001 y 003), sin
migración: los documentos existentes quedan con los valores por defecto.

## Colección `users` (cambios)

| Campo | Tipo | Por defecto | Notas |
|---|---|---|---|
| `theme` | `'light' \| 'dark' \| 'system' \| null` | `null` → `light` | Nuevo (FR-005). |
| `tableDensity` | `'comfortable' \| 'compact' \| null` | `null` → `comfortable` | Nuevo (FR-008). |
| `moneyFormat` | `'es' \| 'en' \| null` | `null` → `es` | Nuevo (FR-010). `es` = "1.248,50 €", `en` = "€ 1,248.50". |
| `homeScreen` | `HomeScreen \| null` | `null` → pantalla por defecto efectiva | Existe desde 001. El enum se amplía (R9). |

- `null` o ausente significa "valor por defecto": el valor por defecto puede cambiar sin migrar (por ejemplo,
  cuando exista el Panel).
- La cuenta inicial `admin` (`isBootstrap: true`) guarda sus preferencias igual que cualquier usuario y se
  pierden con ella al retirarla (003).
- No hay índices nuevos: estos campos solo se leen junto al usuario.

## Tipos compartidos (`packages/shared`)

```text
ThemePreference   = 'light' | 'dark' | 'system'
TableDensity      = 'comfortable' | 'compact'
MoneyFormat       = 'es' | 'en'
HomeScreen        = 'panel' | 'ventas' | 'clientes' | 'productos' | 'proveedores' | 'cobros'   (ampliado)

AppearancePreferences {
  theme: ThemePreference          // ya resuelto: nunca null
  tableDensity: TableDensity      // ya resuelto: nunca null
  moneyFormat: MoneyFormat        // ya resuelto: nunca null
  homeScreen: HomeScreen | null   // null = sin elegir (pantalla por defecto efectiva)
}

UpdatePreferencesRequest = Partial<{
  theme: ThemePreference | null
  tableDensity: TableDensity | null
  moneyFormat: MoneyFormat | null
  homeScreen: HomeScreen | null
}>                                 // al menos un campo; null vuelve al valor por defecto

AuthUser {
  …campos de 001 y 003, sin homeScreen de primer nivel
  preferences: AppearancePreferences   // nuevo; sustituye a AuthUser.homeScreen
}
```

Constantes nuevas o cambiadas:

| Constante | Valor | Notas |
|---|---|---|
| `DEFAULT_THEME` | `'light'` | FR-005 |
| `DEFAULT_TABLE_DENSITY` | `'comfortable'` | FR-008 |
| `DEFAULT_MONEY_FORMAT` | `'es'` | FR-010 |
| `DEFAULT_HOME_SCREEN` | `'productos'` | Ya existe (001). Pasará a `'panel'` cuando exista (FR-015). |
| `AVAILABLE_HOME_SCREENS` | `['ventas', 'clientes', 'productos', 'proveedores', 'cobros']` | Pantallas con ruta en la aplicación, en el orden del selector (R9). |

## Reglas

- **Pantalla de inicio permitida** (FR-014, servidor y cliente): `homeScreen` está en
  `AVAILABLE_HOME_SCREENS` y `can(permissions, homeScreen, 'view')`. En `PATCH /preferences`, si no se
  cumple, 400 `PREFERENCES_HOME_SCREEN_NOT_ALLOWED`.
- **Pantalla por defecto efectiva** (FR-015, SC-006, solo cliente):
  1. `DEFAULT_HOME_SCREEN` si el rol puede verla.
  2. Si no, la primera de `AVAILABLE_HOME_SCREENS` que el rol pueda ver.
  3. Si no hay ninguna, `/ajustes/apariencia`.
- **Destino tras iniciar sesión** (FR-017, `resolveHomeRoute`): la ruta que se intentaba abrir si el rol
  puede verla → `preferences.homeScreen` si está permitida → pantalla por defecto efectiva.
- **Valor mostrado en el selector** (FR-016): `homeScreen` si está permitida; si no (o es `null`), la
  pantalla por defecto efectiva. El valor guardado no se modifica.

## Estado en el equipo (cliente)

| Clave de `localStorage` | Valor | Notas |
|---|---|---|
| `appearance.lastTheme` | `'light' \| 'dark' \| 'system'` | Último tema aplicado en el equipo, para la pantalla de login (FR-007). Nunca guarda quién lo usó. Se conserva al cerrar sesión. |

## Estado en Redux (cliente)

`preferences` (nuevo slice, `features/preferences/`):

| Campo | Tipo | Notas |
|---|---|---|
| `applied` | `AppearancePreferences \| null` | Lo que se ve. `null` sin sesión (el tema sale de `appearance.lastTheme`). Cambia al momento con cada elección. |
| `saveStatus` | `'idle' \| 'saving' \| 'failed'` | Estado del último guardado. |
| `saveError` | `string \| null` | Aviso si no se ha podido guardar (FR-004). |
| `pendingChange` | `UpdatePreferencesRequest` | Campos aplicados que aún no se han podido guardar. Se envían junto con la siguiente elección (reintento, FR-004) y se vacían al guardar bien o al cerrar sesión. |

`applied` se inicializa con `login.fulfilled` y con la acción `sessionRestored` (al arrancar la aplicación o
recargar), y vuelve a `null` al cerrar sesión. La renovación en segundo plano (`refreshSession`) y `loadMe`
(que 003 lanza a mitad de sesión) no lo cambian (clarificación del 2026-10-19).

`auth.user.preferences` sigue siendo lo **guardado**: solo cambia cuando `PATCH /preferences` responde bien.
