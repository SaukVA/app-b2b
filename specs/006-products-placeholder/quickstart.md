# Quickstart: Pantalla provisional de Productos (006-products-placeholder)

Guía para comprobar la feature de principio a fin. El contrato de la API está en
[contracts/products-api.openapi.yaml](contracts/products-api.openapi.yaml), el de la pantalla en
[contracts/products-ui.md](contracts/products-ui.md) y los tipos en [data-model.md](data-model.md).

## 1. Requisitos previos

```powershell
npm install
docker compose up -d
npx playwright install chromium   # una vez por equipo
```

## 2. Tests automáticos

```powershell
npm test --workspace=packages/shared
npm test --workspace=apps/server -- products preferences
npm test --workspace=apps/client
npm run test:e2e -- products navigation smoke
npm run lint
```

Cobertura esperada:

- `shared`: `productStatus` (0 → Sin stock, bajo el mínimo → Stock bajo, resto → Disponible) e
  `IMPLEMENTED_MODULES` con `productos`.
- `server`: servicio (página vacía con `page` y `pageSize`) y rutas: 200 vacío para Administrador, Almacén,
  Comercial y Administración; 401 sin sesión; 403 con un rol sin `productos`; 400 con `q` de 101 caracteres,
  `page=0` o `category=a b`; 200 vacío con un identificador bien formado inexistente.
- `client`: `parseProductCriteria`/`serializeProductCriteria`, `productsSlice` (respuesta obsoleta
  ignorada), `useDebouncedValue`, `EmptyState` y la página (cargando, vacío, error y «Reintentar»).
- E2E: `e2e/products.spec.ts` nuevo; `navigation` y `smoke` ajustados a Productos implementado.

## 3. Comprobación manual (web)

```powershell
npm run dev --workspace=apps/server
npm run dev --workspace=apps/client
```

| # | Pasos | Resultado esperado |
|---|---|---|
| 3.1 | Iniciar sesión con un rol que ve Productos | Llega a `/productos` (pantalla de inicio por defecto). «Productos» en el menú sin «Pendiente» y activo. |
| 3.2 | Mirar la pantalla | Título, «0 referencias», búsqueda, Categoría/Subcategoría (solo «Todas»), Proveedor (solo «Todos»), «Solo stock bajo» y cabeceras Código, Producto, Categoría, Stock, Precio, Estado. Sin «Importar CSV» ni «Nuevo producto». |
| 3.3 | Mirar debajo de las cabeceras | «Todavía no hay productos · El catálogo se cargará desde el sistema anterior.» Sin paginación. |
| 3.4 | Escribir «aceite» en la búsqueda | En DevTools › Red, una sola petición `GET /api/products?q=aceite` tras dejar de teclear. La dirección pasa a `/productos?q=aceite`. El aviso no cambia. |
| 3.5 | Marcar «Solo stock bajo» y recargar | La dirección lleva `lowStock=true`; tras recargar la casilla sigue marcada y la búsqueda se conserva. |
| 3.6 | Pulsar «Atrás» del navegador | Vuelve a los criterios anteriores. |
| 3.7 | Abrir `/productos?page=0&q=` | La dirección se normaliza a `/productos` y se muestra el aviso. |
| 3.8 | Detener el servidor y pulsar «Reintentar» o recargar | «No se ha podido cargar el listado de productos.» con «Reintentar»; no aparece el aviso de catálogo. Al arrancar el servidor y pulsar «Reintentar», vuelve el aviso. |
| 3.9 | Estrechar la ventana a 390 px | Filtros apilados y listado en modo tarjetas; el aviso se ve igual. |
| 3.10 | Ajustes › Apariencia | «Productos» aparece en «Pantalla de inicio». |
| 3.11 | Tema Oscuro y densidad Compacta | La pantalla cambia al momento. |
| 3.12 | `curl` sin token a `/api/products` y con un rol sin acceso | 401 `AUTH_UNAUTHENTICATED` y 403 `AUTH_FORBIDDEN`. |
| 3.13 | `/api-docs` | `GET /products` documentado con sus parámetros y `ProductListPage`. |

## 4. Comprobación en escritorio

```powershell
npm run dev --workspace=apps/desktop
```

- Repetir 3.1–3.5: mismo comportamiento con el backend local.
- Con la base de datos configurada inaccesible, la pantalla muestra el mensaje de error (no hay modo sin
  conexión, 002).

## 5. Diseño

- `docs/design/README.md` documenta `EmptyState` y el estado de error del listado (FR-018).
