# Diseño visual «Albarán»

> Copia del lienzo publicado: https://claude.ai/artifact/8tNZ1JTHbiRh11kfnay9Ya (fuente de verdad, cuenta de la
> organización; el mismo que cita `CLAUDE.md`).
> Última sincronización: 2026-10-26 (versión `1793034141-8cb8` del lienzo).
> El lienzo https://claude.ai/artifact/X2XQnZS79ic8pV4rvk1crS (otra cuenta) se conserva como histórico: se sincronizó
> con él el 2026-10-26 (versión `1792960403-1706`) y no tiene la nueva página de Proveedores.

La estética toma prestado el lenguaje del albarán y la hoja de pedido: líneas finas, cifras en monoespaciada bien alineadas y sellos de estado. Densa para quien trabaja con ella ocho horas al día; legible a un metro en el puesto del almacén.

## Principios

1. **Las cifras mandan**: importes, cantidades, códigos y fechas en IBM Plex Mono, alineados a la derecha en tablas.
2. **Un solo acento** (óxido), reservado a la acción principal y al foco.
3. **El estado se lee siempre como texto**; el color solo lo refuerza.

## Color

### Tema claro (por defecto)

| Token | Nombre | Hex | Uso |
|---|---|---|---|
| `bg` | Papel | `#F3F4F1` | Fondo de la aplicación |
| `surface` | Blanco | `#FFFFFF` | Paneles, tablas, inputs |
| `surface2` | — | `#EEF0EC` | Cabeceras de tabla, pistas de barras, tabs |
| `border` | Línea | `#D9DCD5` | Bordes de panel y separadores |
| `borderRow` | — | `#E4E6E1` | Separador entre filas de tabla |
| `control` | — | `#C5C9C1` | Borde de inputs y botones secundarios |
| `ink` | Tinta | `#16191D` | Texto principal, barra lateral, regla de título (2 px) |
| `ink2` | Grafito | `#4A5058` | Texto secundario, etiquetas, cabeceras |
| `ink3` | Niebla | `#6B717A` | Ayudas y metadatos |
| `disabled` | — | `#9AA1A9` | Texto deshabilitado; texto secundario en la barra lateral |
| `nav` | — | `#16191D` | Fondo de la barra lateral |
| `navActive` | — | `#262B31` | Elemento activo de la barra lateral |
| `navText` | — | `#C9CDD2` | Enlaces inactivos de la barra lateral |
| `navIconActive` | — | `#F08A5D` | Icono del elemento activo |
| `navTextActive` | — | `#E8EAE6` | Texto del elemento activo de la barra lateral (igual en los dos temas) |
| `accent` | Óxido | `#B4430F` | Acción principal, foco, enlaces |
| `accentHover` | — | `#8A320A` | Hover de enlaces |
| `onAccent` | — | `#FFFFFF` | Texto sobre acento |
| `accentSoft` | Óxido claro | `#FBEDE5` | Fila seleccionada, opción marcada |

### Tema oscuro

| Token | Hex |
|---|---|
| `bg` | `#111417` |
| `surface` | `#1A1E23` |
| `surface2` | `#23282E` |
| `border` | `#2F353C` |
| `control` | `#3A4148` |
| `ink` | `#E8EAE6` |
| `ink2` | `#B3B9C0` |
| `ink3` | `#949BA3` |
| `nav` | `#0B0D0F` |
| `navActive` | `#23282E` |
| `navTextActive` | `#E8EAE6` |
| `accent` | `#E8794A` |
| `onAccent` | `#16191D` |
| `accentSoft` | `#3A2419` |

Tema seleccionable en Ajustes: **Claro**, **Oscuro** o **Según el sistema**; se guarda por usuario y aplica en web y escritorio.

### Sellos de estado (fondo / texto)

| Estado | Claro | Oscuro |
|---|---|---|
| Borrador · Baja | `#EEF0EC` / `#4A5058` | — |
| Pendiente · Stock bajo · Invitado | `#FDF3D7` / `#7A5300` | `#3A3014` / `#E8C66A` |
| Servido | `#E3ECFA` / `#1E4C9A` | — |
| Facturado · Disponible · Activo · Conectado | `#E2F1E8` / `#1F6B3F` | `#1B3326` / `#7FD3A0` |
| Cobro parcial | `#F1E6F7` / `#6A2C8A` | — |
| Vencido · Sin stock · Bloqueado · Error | `#FBE4E1` / `#A12A1C` | `#3A1D1A` / `#F09A8E` |

«—» = el lienzo no define variante oscura todavía.

«Baja» (proveedor dado de baja, 009) usa el sello neutro (`StatusStamp tone="neutral"`), junto al nombre en la fila y en la tarjeta: no es una alerta. *Aún no está en el lienzo publicado.*

Anatomía del sello: alto 24 px, padding 0 8 px, radio 4 px, Plex Mono 11/600, `letter-spacing: 0.06em`, mayúsculas, cuadradito de 6×6 px (radio 1) del color del texto delante de la etiqueta.

Semáforo de umbrales (riesgo de cliente, stock): verde `#1F6B3F` < 50 % ≤ ámbar `#7A5300` < 80 % ≤ rojo `#A12A1C`.

## Tipografía

Fuentes: **IBM Plex Sans** (400, 500, 600, 700) e **IBM Plex Mono** (400, 500, 600), desde Google Fonts. Fallback: `system-ui, sans-serif` / `monospace`.

| Rol | Fuente · tamaño/peso | Notas |
|---|---|---|
| Display (login) | Sans 48/600 | `line-height: 1.05`, `letter-spacing: -0.02em` |
| Título de pantalla | Sans 28/600 | `letter-spacing: -0.01em` |
| Título de panel | Sans 22/600 | |
| Sección | Sans 18/600 | |
| Cuerpo | Sans 14/400 | `line-height: 1.5` |
| Etiqueta | Sans 12/500 | mayúsculas, `letter-spacing: 0.06em`, color `ink2` |
| Cabecera de tabla | Sans 11/600 | mayúsculas, `letter-spacing: 0.06em`, fondo `surface2` |
| Cifras | Mono 13–14/500 | `font-variant-numeric: tabular-nums`, alineadas a la derecha |
| KPI | Mono 32–36/500 | `letter-spacing: -0.02em` |

Formato de importes por defecto: `1.248,50 €` (`formatMoney`, `apps/client/src/utils/money.ts`; `es-ES` no agrupa los miles de números de 4 cifras). Ajustes permite `€ 1,248.50`.

## Espaciado, radios y tamaños

- Escala base 4: `4, 8, 12, 16, 24, 32, 48` px.
- Radios: **4** sello · **6** control (botón, input) · **8** grupo de tabs / tarjeta de opción · **10** panel.
- Altura mínima de control y objetivo táctil: **44 px** (48 px en el formulario de login).
- Barra lateral: 232 px desplegada y 72 px plegada; contenido principal con padding `24px 32px 48px` y gap 20 px.

## Componentes

- **Botón primario**: fondo `accent`, texto `onAccent`, Sans 14/600, alto 44, padding 0 18, radio 6, icono opcional 18 px.
- **Botón secundario**: fondo `surface`, borde 1 px `control`, texto `ink`.
- **Botón terciario**: transparente, texto `ink2` subrayado (`text-underline-offset: 3px`).
- **Botón de icono**: 44×44, borde `control`, `aria-label` obligatorio.
- **Input**: alto 44, padding 0 12, borde 1 px `control`, radio 6. Foco: borde 2 px `accent`. Error: borde 1 px `#A12A1C` + mensaje 12 px en el mismo color. Inputs numéricos en Mono y alineados a la derecha.
- **Etiqueta de campo**: estilo «Etiqueta» encima del control, gap 6.
- **Tabla**: dentro de panel blanco con borde y radio 10; cabecera en `surface2`; filas separadas por `borderRow`; fila seleccionada en `accentSoft`. En móvil se sustituye por tarjetas (`article`). La zona de estado del listado (cargando, sin datos, error) va bajo las filas, dentro del mismo panel (separada por `borderRow`); en móvil, en una tarjeta propia bajo las demás. Mientras carga, el listado lleva `aria-busy`.
- **EmptyState** (sin datos en un listado): título Sans 18/600 `ink` + texto 14/400 `ink2`, centrados, padding 32, sin color de estado ni icono; `role="status"` para que se anuncie al aparecer. Primer uso: Productos, «Todavía no hay productos · El catálogo se cargará desde el sistema anterior.» (006). También en Clientes, «Todavía no hay clientes · La cartera se cargará desde el sistema anterior.» (007), y en Proveedores, «Todavía no hay proveedores · Los proveedores se cargarán desde el sistema anterior.» (009). *Aún no está en el lienzo publicado.*
- **Error de un listado**: en la zona de estado del panel, `Alert` de error (`role="alert"`, se anuncia de inmediato) con un mensaje sin detalles técnicos y, debajo, botón secundario «Reintentar» que vuelve a pedir el listado con los mismos criterios; padding 16, gap 12, alineado a la izquierda. Nunca a la vez que el EmptyState. Primer uso: «No se ha podido cargar el listado de productos.» (006). También en Clientes, «No se ha podido cargar el listado de clientes.» (007), y en Proveedores, «No se ha podido cargar el listado de proveedores.» (009). *Aún no está en el lienzo publicado.*
- **Filtro de bajas** (Proveedores, 009): casilla «Mostrar dados de baja» a la derecha de la búsqueda, con el mismo `Checkbox` que «Solo stock bajo» de Productos; desmarcada por defecto. Marcada, el listado incluye los proveedores dados de baja y el contador pasa de «N activos» a «N proveedores». En estrecho, debajo de la búsqueda. La búsqueda de Proveedores usa el placeholder «Nombre o CIF» (en el lienzo, «Nombre del proveedor»). *Aún no está en el lienzo publicado.*
- **Barra de progreso** (stock / riesgo, componente `ProgressBar`): 4 px de alto, pista `surface2`, relleno del color del umbral (el mismo que el texto de los sellos). `role="meter"` con el porcentaje en `aria-valuetext`; el relleno se limita a 0–100 % aunque el valor lo supere. Siempre acompaña a la cifra en Mono: el color nunca es la única señal. Primer uso: «Riesgo usado» de Clientes (007); un cliente sin riesgo máximo muestra el texto «Sin límite» (`ink2`), sin barra ni color.
- **Tarjeta KPI**: panel blanco, etiqueta + cifra Mono 32 + línea de alerta en rojo.
- **Paginación**: texto Mono `1–8 de N`, botones secundarios «Anterior»/«Siguiente», deshabilitados en `#9AA1A9`.
- **Cabecera de detalle**: etiqueta + título 22/600 + metadatos Mono 13, cerrada por regla de 2 px `ink`.
- **Iconos**: SVG de trazo inline 18 px, `stroke-width: 1.8`; nunca emoji.
- **Sin marca**: las pantallas de la aplicación no muestran logotipo, nombre de empresa ni el lema «Venta a mayoristas» (ni en la barra lateral ni en el login).
- **Barra lateral** (tablero «Sistema visual», sección «Barra lateral»):
  - Orden: Ventas, Clientes, Productos, Proveedores, Cobros y Acciones (icono de rayo); Ajustes separado al final (`margin-top: auto`). Solo se muestran los módulos que el rol puede ver.
  - Elemento: alto mínimo 44, padding 0 12, gap 12, radio 6, Sans 14/500 en `navText`. Activo: fondo `navActive`, texto `navTextActive` 14/600, icono en `navIconActive`.
  - Iconos de trazo 18 px, `stroke-width: 1.8`; Ventas (albarán con líneas) y Cobros (pila de monedas) son nuevos.
  - **Pendiente** (módulo sin implementar): etiqueta en `disabled` (`#9AA1A9`, 6,8:1 en claro y 7,5:1 en oscuro), enfocable pero sin navegar, y sello «Pendiente» sobre `--nav` con los colores oscuros del sello de aviso en los dos temas (`#3A3014` / `#E8C66A`, 7,9:1), Mono 10/600, alto 20, padding 0 6, radio 4. Versión reducida para el menú plegado: punto de 8 px `#E8C66A` en la esquina del icono con anillo de 2 px del color `nav` (10,7:1 en claro y 11,8:1 en oscuro); el texto «Pendiente» se conserva oculto visualmente.
  - **Plegada**: 72 px, solo iconos centrados. La etiqueta aparece flotante a la derecha al pasar el ratón y con `:focus-visible` (fondo `#262B31`, texto `navTextActive`, Sans 13/500, radio 6). El pie deja solo «Cerrar sesión» como icono con etiqueta flotante.
  - **Plegar menú**: un elemento más de la lista, con el mismo estilo que los demás pero en `disabled` (`#9AA1A9`). Va justo debajo de Ajustes, con doble chevrón y el texto «Plegar menú» / «Desplegar menú», y lleva `aria-expanded`. El icono gira al plegar. No aparece por debajo de 760 px.
  - **Pie de usuario**: separado por una línea de 1 px `#2C3238`, en una sola fila:
    - avatar de 36 px (fondo `#262B31`, icono de persona);
    - nombre (13/600) y rol · plataforma (12/400 `#9AA1A9`), recortados con puntos suspensivos;
    - botón de icono «Cerrar sesión» de 44×44 a la derecha, con `aria-label` y `title`.

    Al pasar el ratón por encima, el botón de plegar y el de cerrar sesión toman fondo `#262B31`, y al enfocarlos con teclado muestran un contorno de 2 px `#F08A5D`. Plegado: sin avatar, solo el botón de cerrar sesión. En móvil: solo el botón de cerrar sesión.

## Responsive

Los tableros usan **container queries** (`container-name: app`) con un único punto de corte a **760 px**:

- La barra lateral pasa a barra horizontal superior *sticky* con scroll horizontal; se ocultan los datos del usuario y el botón de plegar. Se ve igual esté plegada o no.
- Padding del contenido: `16px 16px 32px`, gap 16.
- `.desk` (tablas) se oculta y `.mob` (tarjetas) se muestra.
- `.hide-m` oculta columnas o bloques secundarios (p. ej. «Plazo» en proveedores, textos del hero de login).
- Login: el panel oscuro se oculta y solo queda el formulario, centrado en la pantalla.

Las pantallas de escritorio son fluidas (anchura de referencia 1440 px); las versiones móviles del lienzo (390 px) reutilizan el mismo tablero de escritorio importado, no son diseños independientes.

## Pantallas

| Pantalla | Tablero escritorio | Tablero móvil | Contenido |
|---|---|---|---|
| Sistema visual | `Main.dc.html` | — | Tokens, tipografía, componentes |
| Productos | `Productos.dc.html` | `ProductosMovil.dc.html` | Filtros (búsqueda, categoría, subcategoría, proveedor, solo stock bajo), tabla con stock/mín., precio y estado, importar CSV |
| Clientes | `Clientes.dc.html` | `ClientesMovil.dc.html` | Listado con riesgo usado y saldo + ficha lateral con historial reciente |
| Proveedores | `Proveedores.dc.html` | `ProveedoresMovil.dc.html` | Diseño de la spec 010 (sustituye al tablero anterior). Listado a ancho completo: búsqueda «Nombre o CIF», «Mostrar dados de baja», selector «Gasto por trimestre» (1T–4T), columnas proveedor (con población y sello «Baja»), CIF, plazo, gasto del trimestre y compras del año, paginación de 10; estados de carga, error con «Reintentar», sin proveedores, sin coincidencias y enlace a un proveedor inexistente. Al pulsar un proveedor, la ficha ocupa toda la pantalla con la flecha de retorno «Proveedores»: datos fiscales, contacto (persona, teléfonos y correos con etiqueta), pago (forma de pago e IBAN en grupos de 4), compras 2026 por trimestre sin IVA, pedidos (web, plazo, pedido mínimo), observaciones y pie «Creado por / Modificado por»; «Editar proveedor», «Dar de baja» con diálogo y «Reactivar». Alta y edición a pantalla completa con flecha de retorno, campos obligatorios (nombre, CIF, dirección, código postal, población), «Proveedor extranjero», pedido mínimo como importe opcional, errores por campo con resumen, conflicto de edición, error al guardar y diálogo «¿Descartar los cambios?». Ajustes del tablero: `rol` y `escena`. Implementado: 009 (listado provisional) |
| Acciones | `Acciones.dc.html` | `AccionesMovil.dc.html` | Página de acciones masivas: Exportar (facturas de clientes, facturas de proveedores, albaranes), Registrar (ingresar factura con base, IVA y adjunto) e Informes (resumen de IVA trimestral, libro de facturas), con historial «Últimas acciones». Sin implementar |
| Ajustes | `Ajustes.dc.html` | `AjustesMovil.dc.html` | Tabs Apariencia (tema, densidad, formato, inicio) y Usuarios (alta directa con contraseña inicial, listado Activo/Bloqueado, menú por fila con editar, restablecer contraseña y bloquear/desbloquear, diálogos de confirmación, aviso de primer Administrador y matriz de permisos de solo lectura). Ajustes del tablero: `plataforma` (Web/Escritorio) y `primerAcceso` (cuenta inicial «admin») |
| Login | `Login.dc.html` | `LoginMovil.dc.html` | Hero oscuro + formulario, estado de error, indicador de servidor |

**Pendientes de diseño**: Panel (`Dashboard`), Ventas, Nueva venta y Cobros. Los tableros ya enlazan a `Dashboard.dc.html`, `Ventas.dc.html` y `NuevaVenta.dc.html`, que todavía no existen.

Roles que aparecen en los diseños: Administrador, Comercial, Almacén, Administración (matriz de permisos en Ajustes › Usuarios). En la aplicación, los roles y la matriz se guardan en la base de datos (spec 003): la matriz pinta una columna por rol guardado, y el diseño muestra los valores iniciales.

Estados de usuario: solo **Activo** y **Bloqueado** (no hay invitaciones). Colores de estado: Activo `okBg`/`okFg`; Bloqueado `#FBE4E1`/`#A12A1C` (oscuro `#3A1D1A`/`#F09A8E`). Aviso (primer acceso): `#FDF3D7`/`#6B4900` con borde `#E9CF8A` (oscuro `#3A3014`/`#E8C66A`, borde `#5C4A1C`). La acción destructiva «Bloquear» usa `#A12A1C` con texto blanco (oscuro `#F09A8E` con texto `#16191D`).

## Carpeta `canvas/`

Copia literal de los ficheros `project/` del lienzo (`canvas.json` + un `*.dc.html` por tablero). Son especificación visual: dependen del runtime del editor (`support.js`, `<x-dc>`, `<sc-for>`, `{{…}}`) y no se abren sueltos en el navegador. Los textos entre corchetes (`[N]`, `[CIF]`, `[USUARIO]`…) son marcadores de contenido real.

Si se modifica el lienzo, refrescar esta carpeta y este README en el mismo cambio.
