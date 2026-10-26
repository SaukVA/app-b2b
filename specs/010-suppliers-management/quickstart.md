# Quickstart: Gestión de proveedores

**Feature**: `010-suppliers-management` · Cómo comprobar de principio a fin que la feature funciona.

## Requisitos

- Dependencias instaladas (`npm install`) y Chromium para E2E (`npx playwright install chromium`, una vez).
- MongoDB local para la prueba manual: `docker compose up -d`.
- Usuarios de cada rol: Administrador (cuenta inicial `admin`), uno de Administración y uno de Almacén creados
  en Ajustes › Usuarios (003).

## Pruebas automáticas

```bash
npm test --workspace=packages/shared
```

Validadores: NIF, NIE y CIF válidos e inválidos; IBAN válido (ES91 2100 0418 4502 0005 1332), con un dígito
cambiado y con longitud incorrecta.

```bash
npm test --workspace=apps/server -- suppliers
```

Rutas y servicio contra MongoDB en memoria: alta (201), CIF duplicado en otro formato (409 con el nombre), CIF
español inválido y extranjero aceptado (400 / 201), código postal, IBAN y contactos (400), ficha (200 / 404),
edición con versión correcta (200, version + 1) y antigua (409), baja y reactivación, Almacén sin permiso de
escritura (403) y Comercial sin acceso (403), búsqueda por CIF en otro formato y orden alfabético.

```bash
npm test --workspace=apps/client -- suppliers BackLink TextArea
```

```bash
npm run test:e2e -- suppliers
```

## Prueba manual

1. `npm run dev --workspace=apps/server` y `npm run dev --workspace=apps/client`; entra como `admin`.
2. **Listado vacío**: Proveedores muestra «Todavía no hay proveedores» y la invitación a «Nuevo proveedor».
3. **Alta**: «Nuevo proveedor» abre el formulario a pantalla completa. Guarda sin rellenar nada: errores en
   Nombre, CIF, Dirección, Código postal y Población, resumen arriba y foco en Nombre. Rellena con un CIF español
   válido, código postal de 5 cifras, dos teléfonos con etiqueta, un IBAN válido y pedido mínimo 150 → se abre la
   ficha con «Proveedor creado.».
4. **CIF duplicado**: da de alta otro con el mismo CIF escrito con guion y en minúsculas → «Ya existe un proveedor
   con este CIF: <nombre>.».
5. **Extranjero**: con «Proveedor extranjero» marcado, un CIF `DE123456789` y código postal `10115` se guarda.
6. **Ficha**: ocupa toda la pantalla; IBAN en grupos de 4; pedido mínimo con el formato de importes; compras 0,00 €
   en el año y los cuatro trimestres; pie con «Creado por admin…».
7. **Flecha de retorno**: en el listado busca, marca «Mostrar dados de baja», elige 2T y abre un proveedor; la
   flecha y «Atrás» vuelven con esos criterios y el foco en la fila. Recarga la ficha: sigue abierta.
8. **Edición y descartar**: «Editar proveedor», cambia el plazo y pulsa la flecha → «¿Descartar los cambios?».
9. **Conflicto**: abre la edición del mismo proveedor en dos pestañas; guarda en una y luego en la otra → aviso de
   conflicto con «Cargar datos actuales», sin perder lo escrito hasta pulsarlo.
10. **Baja y reactivación**: «Dar de baja» → diálogo con el nombre → desaparece del listado y el contador baja;
    con «Mostrar dados de baja» aparece con «Baja»; «Reactivar» lo devuelve.
11. **Permisos**: con Almacén no hay «Nuevo proveedor», «Editar proveedor» ni «Dar de baja», y
    `/proveedores/nuevo` muestra acceso denegado.
12. **Enlace roto**: abre `/proveedores/000000000000000000000000` → listado con el aviso de proveedor inexistente.
13. **Móvil** (< 760 px): listado con Proveedor y Compras año; ficha y formulario en una columna.

## Swagger

`http://localhost:<PUERTO_SERVER>/api-docs`: aparecen `GET/POST /suppliers`, `GET/PUT /suppliers/{id}` y
`PATCH /suppliers/{id}/status`, iguales a [contracts/suppliers-api.openapi.yaml](contracts/suppliers-api.openapi.yaml).
