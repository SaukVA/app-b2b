# Quickstart: validar las preferencias de apariencia (004-appearance-preferences)

Guía de validación de extremo a extremo. El endpoint y los datos están en
[contracts/preferences-api.openapi.yaml](contracts/preferences-api.openapi.yaml) y
[data-model.md](data-model.md).

## Requisitos previos

Los de [003-user-management/quickstart.md](../003-user-management/quickstart.md): Node.js ≥ 22.12, Docker,
`.env` creado a partir de `.env.example`, y un Administrador real ya creado. Además, dos usuarios de prueba:
`ana@empresa.es` (Comercial) y `luis@empresa.es` (Almacén).

```powershell
npm install
docker compose up -d
```

## 1. Tests automáticos

```powershell
npm run lint
npm test --workspaces
npm run test:e2e
```

Resultado esperado: todo en verde, incluidos los tests del módulo `preferences` (servidor), `money.ts`,
`OptionGroup`, `Money`, `MoneyField` y `features/preferences` (cliente).

## 2. Tema (US1)

1. Entra como Ana por primera vez.
   **Esperado**: tema Claro y, en **Ajustes › Apariencia**, "Claro" marcado (también como texto).
2. Elige "Oscuro".
   **Esperado**: toda la aplicación pasa a oscuro en menos de 1 s, sin recargar ni pulsar "Guardar".
3. Cierra sesión.
   **Esperado**: el login se muestra en oscuro (último tema del equipo).
4. Entra como Ana desde el escritorio (`npm run dev --workspace=apps/desktop`).
   **Esperado**: oscuro desde el primer momento, sin destello claro.
5. En el mismo navegador, entra como Luis (que nunca cambió el tema).
   **Esperado**: el login en oscuro (último tema del equipo) y, al entrar, Claro, sin destello oscuro antes
   de la pantalla de inicio.
6. Como Ana, elige "Según el sistema" y cambia el modo claro/oscuro del sistema operativo (o, en Chrome,
   DevTools › Rendering › `prefers-color-scheme`).
   **Esperado**: la aplicación cambia en menos de 2 s, sin recargar.
7. Revisa `localStorage` en DevTools.
   **Esperado**: solo `appearance.lastTheme` con el último tema, sin email ni id de usuario.

## 3. Pantalla de inicio (US2)

1. Como Ana, abre el selector "Pantalla de inicio".
   **Esperado**: solo pantallas que existen y a las que Comercial tiene acceso (Ventas, Clientes, Productos y
   Cobros, pero no Proveedores).
2. Elige "Clientes", cierra sesión y vuelve a entrar.
   **Esperado**: llegas a Clientes.
3. Cierra sesión, abre `/ventas` sin sesión y entra como Ana.
   **Esperado**: llegas a Ventas, no a Clientes (orden de 001).
4. Con Swagger y el token de Ana, haz `PATCH /preferences` con `{ "homeScreen": "proveedores" }`.
   **Esperado**: 400 `PREFERENCES_HOME_SCREEN_NOT_ALLOWED`.
5. Como Administrador, cambia en MongoDB `permissions.clientes` del rol Comercial a `none` (o cambia a Ana a
   un rol sin Clientes) y haz que Ana vuelva a entrar.
   **Esperado**: llega a Productos y en Apariencia aparece "Productos" seleccionada. En la base de datos,
   `homeScreen` sigue siendo `clientes`.
6. Inserta en `roles` un rol sin acceso a Productos (por ejemplo, `{ key: "Repartidor", name: "Repartidor",
   isAdmin: false, order: 5, permissions: { ventas: "view" } }`), da de alta un usuario con él y entra.
   **Esperado**: llega a Ventas (primera pantalla permitida), sin bucle de redirecciones.

## 4. Formato de importes (US3)

Todavía no hay pantallas con importes: se valida con los tests de `money.ts`, `Money` y `MoneyField`.

1. `npm test --workspace=apps/client -- money`
   **Esperado**:
   - `1248.5` → "1.248,50 €" y "€ 1,248.50".
   - `-35` → "-35,00 €" y "€ -35.00".
   - `1234567.899` → "1.234.567,90 €" y "€ 1,234,567.90".
   - Con el formato `es`, "1.248,50" y "1248,5" se aceptan y "1,248.50" se rechaza con "Formato esperado:
     1.248,50". Con `en`, al revés.
   - El mismo importe introducido en los dos formatos da exactamente el mismo número.
2. Cambia el formato en Apariencia y recarga.
   **Esperado**: el selector conserva "€ 1,248.50".

## 5. Densidad de tablas (US4)

1. Como Administrador, da de alta usuarios hasta llenar el listado de **Ajustes › Usuarios** y cuenta las
   filas visibles a 1440 × 900 en Cómoda.
2. Elige "Compacta".
   **Esperado**: al menos un 25 % más de filas visibles y los botones de opciones de cada fila siguen
   midiendo 44 × 44 px.
3. Reduce la ventana a menos de 760 px.
   **Esperado**: las tarjetas se ven igual con las dos densidades.

## 6. Errores de guardado y dos equipos (edge cases)

1. Para el servidor y elige "Oscuro".
   **Esperado**: la aplicación pasa a oscuro y aparece "No se ha podido guardar…". Vuelve a arrancar el
   servidor, cierra sesión y entra: se usa el último tema guardado.
2. Con Ana en dos navegadores, cambia la densidad en uno y recarga el otro.
   **Esperado**: el segundo la recoge al recargar.

## 7. Cuenta inicial

1. Vacía la base de datos, entra con `admin` / `admin` y cambia el tema a Oscuro.
   **Esperado**: se aplica y se guarda.
2. Crea el primer Administrador.
   **Esperado**: el nuevo usuario entra en Claro; las preferencias de `admin` desaparecen con la cuenta.
