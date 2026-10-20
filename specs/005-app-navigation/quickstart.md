# Quickstart: Menú lateral de navegación (005-app-navigation)

Guía para comprobar la feature de principio a fin. Los detalles del comportamiento están en
[contracts/navigation-ui.md](contracts/navigation-ui.md) y el modelo, en [data-model.md](data-model.md).

## 1. Requisitos previos

- El diseño de R11 ya está en el lienzo y en `docs/design/` (menú plegado, sello «Pendiente», iconos de Ventas y
  Cobros).
- Dependencias instaladas y MongoDB local:

```powershell
npm install
docker compose up -d
```

## 2. Tests automáticos

```powershell
npm test --workspace=packages/shared
npm test --workspace=apps/client
npm test --workspace=apps/server -- preferences
npm run test:e2e -- navigation appearance
npm run lint
```

Cobertura esperada:

- `shared`: `isModuleImplemented` y `AVAILABLE_HOME_SCREENS` derivada.
- `client`: `NavBar`, `navItems`, `navigationSlice`, `useNavCollapsed`, `AppNav` y `homeRoute`.
- `server`: rechazo de una pantalla de inicio pendiente.
- E2E: `e2e/navigation.spec.ts` y `e2e/appearance.spec.ts` ajustado.

## 3. Comprobación manual (web)

```powershell
npm run dev --workspace=apps/server
npm run dev --workspace=apps/client
```

| # | Pasos | Resultado esperado |
|---|---|---|
| 3.1 | Iniciar sesión como Administrador | Llega a Ajustes › Apariencia. El menú muestra Ventas, Clientes, Productos, Proveedores y Cobros con «Pendiente», y Ajustes separado y activo. |
| 3.2 | Pulsar «Ventas»; tabular hasta él y pulsar Intro | No cambia de pantalla. El foco se detiene en él y el lector de pantalla anuncia «Ventas, Pendiente, no disponible». |
| 3.3 | Escribir `/clientes` en la barra de direcciones | Redirige a Ajustes › Apariencia. |
| 3.4 | Abrir Ajustes › Usuarios | Ajustes sigue activo (`aria-current="page"`). |
| 3.5 | Mirar el pie del menú | Nombre, «Administrador · Web» y «Cerrar sesión». |
| 3.6 | Iniciar sesión como un rol sin `view` en Cobros | Cobros no aparece. |
| 3.7 | Como Administrador, cambiar el rol de un usuario con sesión abierta en otra ventana y esperar a la renovación (≤ 15 min, o forzarla recargando) | El menú de ese usuario muestra los módulos del nuevo rol. |
| 3.8 | Pulsar «Plegar menú» | Solo iconos y logotipo. El nombre aparece al pasar el ratón y al tabular. El contenido se ensancha. |
| 3.9 | Recargar | Sigue plegado. En DevTools, `localStorage['navigation.collapsed'] === '1'`. |
| 3.10 | Estrechar la ventana a 390 px | Barra superior fija, desplazable hasta «Cerrar sesión», sin botón de plegar. Al ensanchar vuelve plegado. |
| 3.11 | Cambiar a tema Oscuro en Apariencia | El menú cambia al momento; con densidad Compacta el menú no cambia. |
| 3.12 | Cerrar sesión desde el menú | Vuelve al login, sin menú. |

## 4. Comprobación en escritorio

```powershell
npm run dev --workspace=apps/desktop
```

- El pie muestra «Escritorio».
- La pantalla de configuración de base de datos no muestra el menú.
- El estado plegado se mantiene al reiniciar la aplicación.

## 5. Pantalla de inicio (efecto en 004)

- En Ajustes › Apariencia no aparece el selector «Pantalla de inicio» mientras no haya módulos implementados.
- `PATCH /api/preferences` con `{ "homeScreen": "clientes" }` responde 400
  `PREFERENCES_HOME_SCREEN_NOT_ALLOWED` (Swagger en `/api-docs`).
