# Quickstart: Pantalla provisional de Proveedores (009-suppliers-placeholder)

Guía para comprobar la feature de principio a fin. El contrato de la API está en
[contracts/suppliers-api.openapi.yaml](contracts/suppliers-api.openapi.yaml), el de la pantalla en
[contracts/suppliers-ui.md](contracts/suppliers-ui.md) y los tipos en [data-model.md](data-model.md).

## 1. Requisitos previos

```powershell
npm install
docker compose up -d
npx playwright install chromium   # una vez por equipo
```

## 2. Tests automáticos

```powershell
npm test --workspace=packages/shared
npm test --workspace=apps/server -- suppliers preferences
npm test --workspace=apps/client
npm run test:e2e -- suppliers navigation
npm run lint
```

Cobertura esperada:

- `shared`: `IMPLEMENTED_MODULES` con `proveedores`.
- `server`: servicio (página vacía con `page` y `pageSize` 10) y rutas: 200 vacío para Administrador,
  Administración y Almacén, con y sin `includeInactive=true`; 401 sin sesión; 403 con Comercial; 400 con `q` de
  101 caracteres, `page=0` o `includeInactive=si`.
- `client`: `parseSupplierCriteria`/`serializeSupplierCriteria`, `suppliersSlice` (respuesta obsoleta
  ignorada), `formatLeadTime` («—», «1 día», «N días»), `SupplierFilters`, `SuppliersTable` (sello «Baja»,
  plazo y compras) y la página (contador «activos»/«proveedores», cargando, vacío, error y «Reintentar»).
- Ajustados: `modules.test`, `navItems.test`, `AppearanceForm.pendingModules`, `homeRoute.test` y
  `e2e/navigation.spec`, que ya no usan Proveedores como pendiente.
- E2E: `e2e/suppliers.spec.ts` nuevo.

## 3. Comprobación manual (web)

```powershell
npm run dev --workspace=apps/server
npm run dev --workspace=apps/client
```

| # | Pasos | Resultado esperado |
|---|---|---|
| 3.1 | Iniciar sesión como Administración y pulsar Proveedores | «Proveedores» en el menú sin «Pendiente»; se abre `/proveedores` y queda activo. |
| 3.2 | Mirar la pantalla | Título, «0 activos», búsqueda con placeholder «Nombre o CIF», casilla «Mostrar dados de baja» desmarcada y cabeceras Proveedor, Plazo y Compras año. Sin «Nuevo proveedor» ni ficha lateral. |
| 3.3 | Mirar debajo de las cabeceras | «Todavía no hay proveedores · Los proveedores se cargarán desde el sistema anterior.» Sin paginación. |
| 3.4 | Escribir «levante» en la búsqueda | En DevTools › Red, una sola petición `GET /api/suppliers?q=levante` tras dejar de teclear. La dirección pasa a `/proveedores?q=levante`. El aviso no cambia. |
| 3.5 | Marcar «Mostrar dados de baja» | Petición inmediata con `includeInactive=true`; el contador pasa a «0 proveedores»; el aviso no cambia. «Atrás» desmarca la casilla. |
| 3.6 | Recargar | La búsqueda y la casilla se conservan. |
| 3.7 | Abrir `/proveedores?page=abc&q=&includeInactive=si` | La dirección se normaliza a `/proveedores` y se muestra el aviso, sin error. |
| 3.8 | Detener el servidor y recargar | «No se ha podido cargar el listado de proveedores.» con «Reintentar»; no aparece el aviso. Al arrancar el servidor y pulsar «Reintentar», vuelve el aviso. |
| 3.9 | Estrechar la ventana a 390 px | Listado en modo tarjetas, sin «Plazo»; el aviso se ve igual. |
| 3.10 | Iniciar sesión como Almacén | Misma pantalla que Administración (solo ver). |
| 3.11 | Iniciar sesión como Comercial y abrir `/proveedores` | Proveedores no aparece en el menú y la dirección lleva a su pantalla de inicio. |
| 3.12 | Ajustes › Apariencia | «Proveedores» aparece en «Pantalla de inicio» para los roles que lo ven. |
| 3.13 | Tema Oscuro y densidad Compacta | La pantalla cambia al momento. |
| 3.14 | `curl` sin token a `/api/suppliers` y con Comercial | 401 `AUTH_UNAUTHENTICATED` y 403 `AUTH_FORBIDDEN`. |
| 3.15 | `/api-docs` | `GET /suppliers` documentado con `q`, `includeInactive`, `page` y `SupplierListPage`. |

## 4. Comprobación en escritorio

```powershell
npm run dev --workspace=apps/desktop
```

- Repetir 3.1–3.6: mismo comportamiento con el backend local.
- Con la base de datos configurada inaccesible, la pantalla muestra el mensaje de error (no hay modo sin
  conexión, 002).

## 5. Diseño

- `docs/design/README.md` registra el uso en Proveedores de `EmptyState` y del error de listado, el filtro
  «Mostrar dados de baja», el sello «Baja» y el placeholder «Nombre o CIF» (FR-017, FR-018).
