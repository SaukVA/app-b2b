# Data Model: Menú lateral de navegación (005-app-navigation)

Esta feature no añade colecciones ni campos en MongoDB. Trabaja con una constante compartida, un dato
derivado en el cliente y un valor en el almacenamiento del equipo.

## Módulos implementados (constante compartida)

`packages/shared/src/constants/modules.ts`

| Elemento | Tipo | Valor inicial | Regla |
|---|---|---|---|
| `IMPLEMENTED_MODULES` | `readonly AppModule[]` | `['ajustes']` | Único sitio que se edita al implementar un módulo (FR-010). |
| `isModuleImplemented(module)` | `(AppModule) => boolean` | — | `true` si el módulo está en la lista. |

Efecto derivado (research R1, R3):

- `AVAILABLE_HOME_SCREENS` = `ventas, clientes, productos, proveedores, cobros` filtrado por
  `isModuleImplemented`. Hoy está vacía.
- `isHomeScreenAllowed(permissions, screen)` exige que la pantalla esté en `AVAILABLE_HOME_SCREENS` y que el rol
  tenga `view`. Con eso, el servidor rechaza una pantalla de inicio pendiente con 400
  `PREFERENCES_HOME_SCREEN_NOT_ALLOWED`.
- `User.homeScreen` no cambia de tipo ni se migra. Si un valor guardado apunta a un pendiente, se trata como no
  disponible.

## Elemento de menú (derivado en el cliente)

`apps/client/src/features/navigation/navItems.ts`. Se calcula en cada render a partir de
`AuthUser.permissions` y `IMPLEMENTED_MODULES`; no se guarda.

| Campo | Tipo | Origen |
|---|---|---|
| `module` | `AppModule` | Orden fijo: `ventas`, `clientes`, `productos`, `proveedores`, `cobros`, `ajustes` |
| `to` | `string` | `/<module>` |
| `label` | `string` | Ventas, Clientes, Productos, Proveedores, Cobros, Ajustes |
| `icon` | `ReactNode` | `NavIcons.tsx` |
| `pending` | `boolean` | `!isModuleImplemented(module)` |
| `section` | `'main' \| 'footer'` | `footer` solo para Ajustes, que va separado al final |

Reglas de visibilidad (FR-003, FR-004):

- Un módulo de negocio aparece si `can(permissions, module, 'view')`, esté implementado o pendiente.
- Ajustes aparece siempre.
- El activo no se guarda: lo calcula `NavLink` a partir de la ruta.

## Estado del menú en el equipo

| Clave | Valores | Por defecto | Alcance |
|---|---|---|---|
| Slice `navigation.collapsed` (Redux), persistido en `localStorage['navigation.collapsed']` | `'1'` (plegado), `'0'` (desplegado) | Sin valor → desplegado | Equipo y navegador; compartido por todos los usuarios del equipo. NEVER se envía al servidor (FR-014). |

Transiciones:

```text
sin valor ──(primer uso)──▶ desplegado
desplegado ──(botón plegar)──▶ plegado    [escribe '1']
plegado ──(botón desplegar)──▶ desplegado [escribe '0']
cualquier estado ──(ancho < 760 px)──▶ barra horizontal (el estado guardado no cambia)
almacenamiento no disponible ──▶ desplegado; el botón funciona solo durante la sesión
```

## Datos del usuario que se leen

Vienen de `AuthUser` (001/003/004) y no cambian:

- `name` y `roleName`: pie del menú.
- `permissions`: visibilidad.

El canal sale de `isDesktop()`.
