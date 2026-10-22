# Diseño visual «Albarán»

> Copia del lienzo publicado: https://claude.ai/artifact/8tNZ1JTHbiRh11kfnay9Ya (fuente de verdad).
> Última sincronización: 2026-10-14 (versión `1791974205-d3c3` del lienzo).

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
| Borrador | `#EEF0EC` / `#4A5058` | — |
| Pendiente · Stock bajo · Invitado | `#FDF3D7` / `#7A5300` | `#3A3014` / `#E8C66A` |
| Servido | `#E3ECFA` / `#1E4C9A` | — |
| Facturado · Disponible · Activo · Conectado | `#E2F1E8` / `#1F6B3F` | `#1B3326` / `#7FD3A0` |
| Cobro parcial | `#F1E6F7` / `#6A2C8A` | — |
| Vencido · Sin stock · Bloqueado · Error | `#FBE4E1` / `#A12A1C` | `#3A1D1A` / `#F09A8E` |

«—» = el lienzo no define variante oscura todavía.

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
- **EmptyState** (sin datos en un listado): título Sans 18/600 `ink` + texto 14/400 `ink2`, centrados, padding 32, sin color de estado ni icono; `role="status"` para que se anuncie al aparecer. Primer uso: Productos, «Todavía no hay productos · El catálogo se cargará desde el sistema anterior.» (006). También en Clientes, «Todavía no hay clientes · La cartera se cargará desde el sistema anterior.» (007). *Aún no está en el lienzo publicado.*
- **Error de un listado**: en la zona de estado del panel, `Alert` de error (`role="alert"`, se anuncia de inmediato) con un mensaje sin detalles técnicos y, debajo, botón secundario «Reintentar» que vuelve a pedir el listado con los mismos criterios; padding 16, gap 12, alineado a la izquierda. Nunca a la vez que el EmptyState. Primer uso: «No se ha podido cargar el listado de productos.» (006). También en Clientes, «No se ha podido cargar el listado de clientes.» (007). *Aún no está en el lienzo publicado.*
- **Barra de progreso** (stock / riesgo, componente `ProgressBar`): 4 px de alto, pista `surface2`, relleno del color del umbral (el mismo que el texto de los sellos). `role="meter"` con el porcentaje en `aria-valuetext`; el relleno se limita a 0–100 % aunque el valor lo supere. Siempre acompaña a la cifra en Mono: el color nunca es la única señal. Primer uso: «Riesgo usado» de Clientes (007); un cliente sin riesgo máximo muestra el texto «Sin límite» (`ink2`), sin barra ni color.
- **Tarjeta KPI**: panel blanco, etiqueta + cifra Mono 32 + línea de alerta en rojo.
- **Paginación**: texto Mono `1–8 de N`, botones secundarios «Anterior»/«Siguiente», deshabilitados en `#9AA1A9`.
- **Cabecera de detalle**: etiqueta + título 22/600 + metadatos Mono 13, cerrada por regla de 2 px `ink`.
- **Iconos**: SVG de trazo inline 18 px, `stroke-width: 1.8`; nunca emoji.
- **Logotipo provisional**: cuadrado de 36 px (40 en login), fondo `accent`, inicial «M» en Mono 600.
- **Barra lateral** (tablero «Sistema visual», sección «Barra lateral»):
  - Orden: Ventas, Clientes, Productos, Proveedores y Cobros; Ajustes separado al final (`margin-top: auto`). Solo se muestran los módulos que el rol puede ver.
  - Elemento: alto mínimo 44, padding 0 12, gap 12, radio 6, Sans 14/500 en `navText`. Activo: fondo `navActive`, texto `navTextActive` 14/600, icono en `navIconActive`.
  - Iconos de trazo 18 px, `stroke-width: 1.8`; Ventas (albarán con líneas) y Cobros (pila de monedas) son nuevos.
  - **Pendiente** (módulo sin implementar): etiqueta en `disabled` (`#9AA1A9`, 6,8:1 en claro y 7,5:1 en oscuro), enfocable pero sin navegar, y sello «Pendiente» sobre `--nav` con los colores oscuros del sello de aviso en los dos temas (`#3A3014` / `#E8C66A`, 7,9:1), Mono 10/600, alto 20, padding 0 6, radio 4. Versión reducida para el menú plegado: punto de 8 px `#E8C66A` en la esquina del icono con anillo de 2 px del color `nav` (10,7:1 en claro y 11,8:1 en oscuro); el texto «Pendiente» se conserva oculto visualmente.
  - **Plegada**: 72 px, solo iconos centrados y el logotipo. La etiqueta aparece flotante a la derecha al pasar el ratón y con `:focus-visible` (fondo `#262B31`, texto `navTextActive`, Sans 13/500, radio 6). El pie deja solo «Cerrar sesión» como icono con etiqueta flotante.
  - **Botón de plegar**: botón de icono 44×44 encima del pie, borde 1 px `#2C3238`, `aria-label` «Plegar menú» / «Desplegar menú» y `aria-expanded`; el icono gira al plegar. No aparece por debajo de 760 px.

## Responsive

Los tableros usan **container queries** (`container-name: app`) con un único punto de corte a **760 px**:

- La barra lateral pasa a barra horizontal superior *sticky* con scroll horizontal; se ocultan el texto de marca, los datos del usuario y el botón de plegar. Se ve igual esté plegada o no.
- Padding del contenido: `16px 16px 32px`, gap 16.
- `.desk` (tablas) se oculta y `.mob` (tarjetas) se muestra.
- `.hide-m` oculta columnas o bloques secundarios (p. ej. «Plazo» en proveedores, textos del hero de login).
- Login: el panel oscuro se reduce a una franja con la marca y el formulario sube arriba.

Las pantallas de escritorio son fluidas (anchura de referencia 1440 px); las versiones móviles del lienzo (390 px) reutilizan el mismo tablero de escritorio importado, no son diseños independientes.

## Pantallas

| Pantalla | Tablero escritorio | Tablero móvil | Contenido |
|---|---|---|---|
| Sistema visual | `Main.dc.html` | — | Tokens, tipografía, componentes |
| Productos | `Productos.dc.html` | `ProductosMovil.dc.html` | Filtros (búsqueda, categoría, subcategoría, proveedor, solo stock bajo), tabla con stock/mín., precio y estado, importar CSV |
| Clientes | `Clientes.dc.html` | `ClientesMovil.dc.html` | Listado con riesgo usado y saldo + ficha lateral con historial reciente |
| Proveedores | `Proveedores.dc.html` | `ProveedoresMovil.dc.html` | Listado con plazo y compras del año + productos asociados y pedido de compra sugerido |
| Ajustes | `Ajustes.dc.html` | `AjustesMovil.dc.html` | Tabs Apariencia (tema, densidad, formato, inicio), Base de datos (estado de la conexión; web de solo lectura, escritorio con cadena de conexión editable) y Usuarios (alta directa con contraseña inicial, listado Activo/Bloqueado, menú por fila con editar, restablecer contraseña y bloquear/desbloquear, diálogos de confirmación, aviso de primer Administrador y matriz de permisos de solo lectura). Ajustes del tablero: `plataforma` (Web/Escritorio), `conexion` (Conectado/Error) y `primerAcceso` (cuenta inicial «admin») |
| Login | `Login.dc.html` | `LoginMovil.dc.html` | Hero oscuro + formulario, estado de error, indicador de servidor |

**Pendientes de diseño**: Panel (`Dashboard`), Ventas, Nueva venta y Cobros. Los tableros ya enlazan a `Dashboard.dc.html`, `Ventas.dc.html` y `NuevaVenta.dc.html`, que todavía no existen.

Roles que aparecen en los diseños: Administrador, Comercial, Almacén, Administración (matriz de permisos en Ajustes › Usuarios). En la aplicación, los roles y la matriz se guardan en la base de datos (spec 003): la matriz pinta una columna por rol guardado, y el diseño muestra los valores iniciales.

Estados de usuario: solo **Activo** y **Bloqueado** (no hay invitaciones). Colores de estado: Activo `okBg`/`okFg`; Bloqueado `#FBE4E1`/`#A12A1C` (oscuro `#3A1D1A`/`#F09A8E`). Aviso (primer acceso, cierre de sesiones al cambiar de base de datos): `#FDF3D7`/`#6B4900` con borde `#E9CF8A` (oscuro `#3A3014`/`#E8C66A`, borde `#5C4A1C`). La acción destructiva «Bloquear» usa `#A12A1C` con texto blanco (oscuro `#F09A8E` con texto `#16191D`).

## Carpeta `canvas/`

Copia literal de los ficheros `project/` del lienzo (`canvas.json` + un `*.dc.html` por tablero). Son especificación visual: dependen del runtime del editor (`support.js`, `<x-dc>`, `<sc-for>`, `{{…}}`) y no se abren sueltos en el navegador. Los textos entre corchetes (`[NOMBRE EMPRESA]`, `[N]`, `[CIF]`…) son marcadores de contenido real.

Si se modifica el lienzo, refrescar esta carpeta y este README en el mismo cambio.
