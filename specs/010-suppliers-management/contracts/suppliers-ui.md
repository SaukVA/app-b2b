# Contrato de UI: Gestión de proveedores

**Feature**: `010-suppliers-management` · Diseño: tablero «Proveedores» (`docs/design/canvas/Proveedores.dc.html`
y `ProveedoresMovil.dc.html`).

## Rutas

| Dirección | Pantalla | Acceso |
|---|---|---|
| `/proveedores?q&includeInactive&quarter&page` | Listado | ver |
| `/proveedores/nuevo` | Alta (pantalla completa) | editar; sin permiso → pantalla de acceso denegado de 005 |
| `/proveedores/:id?<criterios del listado>` | Ficha (pantalla completa) | ver |
| `/proveedores/:id/editar?<criterios del listado>` | Edición (pantalla completa) | editar |

- `quarter` (1–4) se omite cuando es el trimestre en curso; un valor no válido se sustituye por el en curso.
- Ficha inexistente (404) → `/proveedores` con aviso «El enlace apunta a un proveedor que no existe. Busca el
  proveedor en el listado.» y botón «Entendido».
- La flecha de retorno de la ficha (`BackLink`, texto «Proveedores», `aria-label` «Volver al listado de
  proveedores») lleva a `/proveedores` con los mismos criterios y deja el foco en la fila del proveedor (también
  con «Atrás» del navegador).
- La flecha del formulario lleva al listado (alta) o a la ficha (edición). Con cambios sin guardar, cualquier
  salida abre el diálogo de descartar.

## Listado

- Cabecera: «Proveedores», contador «N activos» / «N proveedores» (009) y, con permiso de editar, botón
  «Nuevo proveedor».
- Filtros: búsqueda «Nombre o CIF», «Mostrar dados de baja» y grupo «Gasto por trimestre · <año>» con 1T–4T
  (`aria-pressed`).
- Columnas: Proveedor (nombre, población debajo y sello «Baja»), CIF, Plazo, «Gasto <T>», Compras año. En
  estrecho (< 760 px): solo Proveedor y Compras año.
- Cada fila es un enlace a su ficha.
- Estados (009): cargando, error «No se ha podido cargar el listado de proveedores.» con «Reintentar», «Todavía
  no hay proveedores» + «Los proveedores se cargarán desde el sistema anterior.» (+ «Mientras tanto, puedes dar de
  alta uno con «Nuevo proveedor».» con permiso de editar), «Ningún proveedor coincide con la búsqueda».

## Ficha

- Cabecera: nombre (h1), sello «Baja» si lo está, «CIF <cif>» (+ « (extranjero)»), y con permiso de editar
  «Editar proveedor» y «Dar de baja» / «Reactivar».
- Columna izquierda: «Datos fiscales» (Nombre, CIF, Dirección, Código postal, Población), «Contacto» (Persona de
  contacto; «Teléfono · <etiqueta>» como `tel:`; «Correo · <etiqueta>» como `mailto:`; sin etiqueta → «sin
  etiqueta»), «Pago» (Forma de pago, IBAN en grupos de 4).
- Columna derecha: «Compras <año>» con el total y los cuatro trimestres («Importes sin IVA»), «Pedidos» (Web como
  enlace externo, Plazo de entrega «N días» / «1 día» / «—», Pedido mínimo con `UserMoney` o «Sin pedido
  mínimo»), «Observaciones» (o «Sin observaciones.»).
- Pie: «Creado por <login> el <fecha hora>» y «Modificado por <login> el <fecha hora>».
- Dato vacío: «—».
- Tras guardar: `Alert` informativo «Proveedor creado.» / «Cambios guardados.»; tras cambiar el estado: «<nombre>
  dado de baja.» / «<nombre> reactivado.».
- Cargando: «Cargando proveedor…», con `aria-busy="true"`.
- Error al cargar: «No se ha podido cargar el proveedor.» con «Reintentar».
- El aviso de guardado o de cambio de estado lleva `role="status"`.

## Diálogo de baja

- Título «¿Dar de baja a <nombre>?»; texto «Dejará de aparecer en el listado. No se borra ningún dato: podrás verlo
  con «Mostrar dados de baja» y reactivarlo cuando quieras.»; botones «Cancelar» y «Dar de baja».
- «Reactivar» no pide confirmación.

## Formulario (alta y edición)

- Título «Nuevo proveedor» / «Editar proveedor»; subtítulo «Los campos con * son obligatorios.» / nombre.
- Secciones y campos:
  - Identificación: «Nombre *», «CIF *», casilla «Proveedor extranjero» («Acepta un identificador fiscal y un
    código postal de otro país.»).
  - Dirección fiscal («Hace falta para las facturas.»): «Dirección *», «Código postal *», «Población *».
  - Pago: «Forma de pago» (`Select`), «IBAN».
  - Pedidos: «Web donde se hacen los pedidos», «Plazo de entrega (días)» («Déjalo vacío si varía de un pedido a
    otro.»), «Pedido mínimo (€)» con `UserMoneyField` («Déjalo vacío si no tiene.»).
  - Contacto: «Persona de contacto»; «Teléfonos» y «Correos», filas «Etiqueta» + «Número» / «Correo» + botón
    quitar (`aria-label` «Quitar teléfono N»), botón «Añadir teléfono» / «Añadir correo» y contador «N de 5».
  - «Observaciones» (`TextArea`).
- Botones: «Cancelar» y «Crear proveedor» / «Guardar cambios».
- Errores junto al campo (`aria-invalid`, `aria-describedby`) y resumen arriba «Revisa estos campos: …»; el foco
  va al primer campo con error. Textos:
  - «Escribe el nombre del proveedor.» · «Escribe el CIF.» · «No es un NIF o CIF español válido. Si el proveedor es
    extranjero, marca «Proveedor extranjero».» · «Ya existe un proveedor con este CIF: <nombre>.»
  - «Escribe la dirección.» · «Escribe el código postal.» · «El código postal español tiene 5 cifras.» · «Escribe
    la población.»
  - «El IBAN no es válido. Revisa que esté completo y bien escrito.» · «Escribe una dirección web, por ejemplo
    www.proveedor.es.» · «Escribe un número de días entre 0 y 365.» · «Escribe un importe mayor que 0, con 2
    decimales como mucho.»
  - «Escribe un teléfono de 6 a 20 cifras.» · «Escribe un correo válido, por ejemplo nombre@proveedor.es.»
- Conflicto (409 versión): `Alert` de aviso «Otro usuario ha cambiado este proveedor mientras lo editabas. Carga
  los datos actuales y repite tus cambios.» con botón «Cargar datos actuales».
- Error al guardar (red o 5xx): `Alert` de error «No se ha podido guardar el proveedor. Lo que has escrito sigue
  aquí; vuelve a intentarlo.»
- Sin permiso (403 al guardar, en alta o en edición): `Alert` de error «Ya no tienes permiso para editar
  proveedores.» sin perder lo escrito.
- Error de validación del servidor (400): se traduce a errores junto a cada campo; lo que no corresponde a un campo
  va al resumen.

## Diálogo de descartar cambios

- Título «¿Descartar los cambios?»; texto «Lo que has escrito en el formulario se perderá.»; botones «Seguir
  editando» y «Descartar cambios».

## Accesibilidad

- Todo operable con teclado; objetivos de 44 px; foco visible.
- Sellos y avisos legibles por su texto; avisos con `role="status"` o `role="alert"` según corresponda.
- Al volver de la ficha (con la flecha o con «Atrás» del navegador), el foco queda en la fila del último proveedor
  abierto; al abrir el formulario, en el primer campo.
