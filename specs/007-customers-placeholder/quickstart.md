# Quickstart: Pantalla provisional de Clientes (007-customers-placeholder)

Guía para comprobar la feature de principio a fin. El contrato de la API está en
[contracts/customers-api.openapi.yaml](contracts/customers-api.openapi.yaml), el de la pantalla en
[contracts/customers-ui.md](contracts/customers-ui.md) y los tipos en [data-model.md](data-model.md).

## 1. Requisitos previos

```powershell
npm install
docker compose up -d
npx playwright install chromium   # una vez por equipo
```

## 2. Tests automáticos

```powershell
npm test --workspace=packages/shared
npm test --workspace=apps/server -- customers preferences
npm test --workspace=apps/client
npm run test:e2e -- customers navigation
npm run lint
```

Cobertura esperada:

- `shared`: `customerRiskUsed` (sin límite con `null` y con 0, saldo a favor → 0, más de 100 %),
  `customerRiskLevel` (49 → low, 50 → medium, 80 → high) e `IMPLEMENTED_MODULES` con `clientes`.
- `server`: servicio (página vacía con `page` y `pageSize` 10) y rutas: 200 vacío para Administrador, Comercial
  y Administración; 401 sin sesión; 403 con Almacén; 400 con `q` de 101 caracteres o `page=0`.
- `client`: `parseCustomerCriteria`/`serializeCustomerCriteria`, `customersSlice` (respuesta obsoleta
  ignorada), `formatOrderDate`, `ProgressBar`, `CustomersTable` (riesgo con barra y «Sin límite») y la página
  (cargando, vacío, error y «Reintentar»).
- E2E: `e2e/customers.spec.ts` nuevo; `navigation` ajustado a Clientes implementado.

## 3. Comprobación manual (web)

```powershell
npm run dev --workspace=apps/server
npm run dev --workspace=apps/client
```

| # | Pasos | Resultado esperado |
|---|---|---|
| 3.1 | Iniciar sesión como Comercial y pulsar Clientes | «Clientes» en el menú sin «Pendiente»; se abre `/clientes` y queda activo. |
| 3.2 | Mirar la pantalla | Título, «0 fichas», búsqueda y cabeceras Cliente, Riesgo usado, Saldo, Último pedido. Sin «Nuevo cliente» ni ficha lateral. |
| 3.3 | Mirar debajo de las cabeceras | «Todavía no hay clientes · La cartera se cargará desde el sistema anterior.» Sin paginación. |
| 3.4 | Escribir «ferretería» en la búsqueda | En DevTools › Red, una sola petición `GET /api/customers?q=ferreter%C3%ADa` tras dejar de teclear. La dirección pasa a `/clientes?q=…`. El aviso no cambia. |
| 3.5 | Recargar y pulsar «Atrás» | Tras recargar, la búsqueda se conserva; «Atrás» vuelve a los criterios anteriores. |
| 3.6 | Abrir `/clientes?page=abc&q=` | La dirección se normaliza a `/clientes` y se muestra el aviso, sin error. |
| 3.7 | Detener el servidor y recargar | «No se ha podido cargar el listado de clientes.» con «Reintentar»; no aparece el aviso. Al arrancar el servidor y pulsar «Reintentar», vuelve el aviso. |
| 3.8 | Estrechar la ventana a 390 px | Listado en modo tarjetas; el aviso se ve igual. |
| 3.9 | Iniciar sesión como Administración | Misma pantalla que Comercial (solo ver). |
| 3.10 | Iniciar sesión como Almacén y abrir `/clientes` | Clientes no aparece en el menú y la dirección lleva a su pantalla de inicio. |
| 3.11 | Ajustes › Apariencia | «Clientes» aparece en «Pantalla de inicio» para los roles que lo ven. |
| 3.12 | Tema Oscuro y densidad Compacta | La pantalla cambia al momento. |
| 3.13 | `curl` sin token a `/api/customers` y con Almacén | 401 `AUTH_UNAUTHENTICATED` y 403 `AUTH_FORBIDDEN`. |
| 3.14 | `/api-docs` | `GET /customers` documentado con sus parámetros y `CustomerListPage`. |

## 4. Comprobación en escritorio

```powershell
npm run dev --workspace=apps/desktop
```

- Repetir 3.1–3.5: mismo comportamiento con el backend local.
- Con la base de datos configurada inaccesible, la pantalla muestra el mensaje de error (no hay modo sin
  conexión, 002).

## 5. Diseño

- `docs/design/README.md` registra el uso en Clientes de `EmptyState` y del error de listado, la columna de
  riesgo con «Sin límite» y el componente `ProgressBar` (FR-017).
