# Feature Specification: Gestión de proveedores

**Feature Branch**: `010-suppliers-management`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Gestión de proveedores: alta, ficha, edición y baja. Sustituye la pantalla provisional
de Proveedores (009), que hoy muestra siempre un listado vacío, por una gestión real de proveedores en web y
escritorio. Actores y permisos (los de 009): Administrador y Administración pueden crear, editar, dar de baja y
reactivar; Almacén solo puede ver el listado y la ficha. Historias: 1) Alta de proveedor (P1): botón «Nuevo
proveedor» que abre un formulario con nombre y CIF (obligatorios), dirección, código postal y población, teléfonos y
correos de contacto (varios, cada uno con una etiqueta libre, p. ej. «información» o «facturación»), página web
(dónde se hacen los pedidos), plazo de entrega habitual en días (opcional; hay proveedores con plazo fijo y otros
variable), pedido mínimo (casilla «tiene pedido mínimo» con un importe opcional en €) y observaciones libres
(representante, otros datos). 2) Ficha lateral (P1): al pulsar un proveedor del listado se abre un panel lateral con
sus datos, según el diseño «Albarán» de Proveedores (CIF, plazo de entrega, pedido mínimo, contactos, web,
observaciones). En móvil, la ficha ocupa toda la pantalla. 3) Edición (P1): «Editar proveedor» desde la ficha, con el
mismo formulario y las mismas validaciones que el alta. 4) Baja y reactivación (P2): un proveedor nunca se borra; se
da de baja y se puede reactivar. El filtro «Mostrar dados de baja» y la marca «Baja» de 009 se mantienen. Reglas: el
CIF es único entre todos los proveedores, incluidos los dados de baja. Los importes se muestran con el formato de
importes del usuario. La columna «Compras año» del listado se mantiene como en 009 (sin IVA, desde el 1 de enero) y
vale 0 mientras no exista el módulo de compras. El listado, la búsqueda por nombre o CIF y la paginación siguen como
en 009, ahora con datos reales. Diseño: el formulario de alta y edición no está en el lienzo «Albarán»; se diseñará
en el lienzo antes de /speckit-plan, siguiendo los tokens y componentes de docs/design/README.md. Fuera de alcance:
credenciales de la web del proveedor (spec aparte), productos asociados, pedido de compra sugerido y «Generar pedido
de compra» (circuito de compra, aplazado), ordenar por productos en falta, compras por trimestre y modelo 347 (página
de acciones masivas, aplazada), catálogos del proveedor, borrar proveedores. Origen: docs/discovery/001-proveedores.md
(N-01 a N-07, P-05, P-06, P-07)."

> **Nota**: la descripción de entrada se conserva tal como se escribió. Donde choca con el resto de la spec (ficha en
> panel lateral, dirección opcional, casilla de pedido mínimo, compras por trimestre fuera de alcance, sin persona de
> contacto, forma de pago ni IBAN), mandan las Clarifications y los requisitos.

## Clarifications

### Session 2026-10-26

- Q: ¿La dirección, el código postal y la población del proveedor deben ser obligatorios al darlo de alta? → A:
  Sí, obligatorios (confirmado con el cliente el 2026-10-26; sustituye a la decisión inicial de dejarlos opcionales
  con la marca «Datos fiscales incompletos», que se elimina).
- Q: ¿Trabaja el cliente con proveedores extranjeros, o todos tienen un NIF/CIF español? → A: Se comprueba el NIF/CIF
  español por defecto; una casilla «Proveedor extranjero» desactiva la comprobación y acepta cualquier identificador
  fiscal.
- Q: ¿Hay que guardar quién y cuándo dio de alta, modificó, dio de baja o reactivó cada proveedor? → A: Se guarda
  quién y cuándo lo creó y quién y cuándo hizo el último cambio (incluidas baja y reactivación), y se muestra al pie
  de la ficha. Sin historial completo de cambios.
- Q: ¿Se van a cargar los proveedores del programa actual del cliente, o se darán de alta todos a mano? → A: Se
  cargarán más adelante, en otra spec: el aviso de listado vacío sigue diciendo que se cargarán desde el sistema
  anterior y, a quien puede editar, le permite además dar de alta uno a mano.
- Q: ¿Qué cambia al combinar la propuesta de diseño con el tablero «Proveedores» original? → A: La ficha deja de ser
  un panel lateral y ocupa toda la pantalla, con una flecha de retorno al listado; el proveedor gana persona de
  contacto, forma de pago e IBAN; el listado y la ficha muestran el gasto por trimestre. La pestaña «Productos y
  pedido» del diseño sigue fuera de alcance. El cliente confirmó la ficha a pantalla completa el 2026-10-26.
- Q: ¿El pedido mínimo se indica con una casilla, con un importe o con ambos? → A: Solo con un importe en euros,
  opcional; vacío significa sin pedido mínimo. Se descarta la casilla (confirmado con el cliente el 2026-10-26).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dar de alta un proveedor (Priority: P1) 🎯 MVP

Un usuario Administrador o Administración pulsa «Nuevo proveedor» en la pantalla de Proveedores y rellena el
formulario: nombre, CIF, dirección, código postal y población (obligatorios); la persona de contacto y uno o
varios teléfonos y correos, cada uno con una etiqueta libre («información», «facturación», «representante»…); la
forma de pago y el IBAN; la página web donde se hacen los pedidos; el plazo de entrega habitual en días; el importe
del pedido mínimo, si lo tiene; y observaciones libres. Al guardar, se abre la ficha del proveedor.

**Why this priority**: sin proveedores dados de alta no hay nada que consultar ni editar, y el listado de 009 sigue
vacío. Es lo que convierte la pantalla provisional en una herramienta útil: el cliente necesita estos datos para
facturar y para contactar con cada proveedor (origen: N-01 a N-04, N-06, N-07).

**Independent Test**: con un usuario Administración se da de alta un proveedor con todos los campos y otro solo con
los obligatorios; ambos aparecen en el listado con su nombre y plazo, y su ficha muestra lo introducido. Con un usuario
Almacén se comprueba que «Nuevo proveedor» no aparece.

**Acceptance Scenarios**:

1. **Given** un usuario con permiso de editar Proveedores, **When** abre la pantalla de Proveedores, **Then** ve el
   botón «Nuevo proveedor».
2. **Given** el formulario de alta, **When** el usuario rellena los campos obligatorios y guarda, **Then** el proveedor se crea
   activo, se abre su ficha a pantalla completa y, al volver con la flecha de retorno, aparece en el listado.
2a. **Given** el formulario de alta, **When** el usuario elige «Pagaré» como forma de pago e introduce un IBAN con
   espacios, **Then** la ficha muestra la forma de pago y el IBAN en grupos de cuatro caracteres.
3. **Given** el formulario de alta, **When** el usuario añade dos teléfonos («información» y «pedidos») y un correo
   («facturación»), **Then** la ficha muestra los tres contactos con sus etiquetas, en el orden en que se añadieron.
4. **Given** el formulario de alta, **When** introduce 150 en «Pedido mínimo», **Then** la ficha muestra el pedido
   mínimo con el formato de importes del usuario; si lo deja vacío, la ficha muestra «Sin pedido mínimo».
5. **Given** el formulario de alta sin nombre, CIF, dirección, código postal o población, **When** el usuario intenta
   guardar, **Then** no se guarda y cada campo que falta muestra su error junto al campo.
6. **Given** que ya existe un proveedor, activo o dado de baja, con el CIF «B12345678», **When** el usuario intenta
   dar de alta otro con «b-12345678», **Then** no se guarda y el campo CIF indica que ya existe un proveedor con ese
   CIF, con su nombre.
6a. **Given** el formulario de alta, **When** el usuario escribe un IBAN con los dígitos de control mal, un correo
   sin «@» o un código postal español de 4 cifras, **Then** no se guarda y cada campo muestra su propio error.
7. **Given** el formulario con datos introducidos, **When** el usuario cancela, **Then** se le pide confirmación antes
   de descartar los cambios y no se crea ningún proveedor.
7a. **Given** el formulario de alta, **When** el usuario escribe un CIF español con el dígito de control mal,
   **Then** no se guarda y el campo indica que el NIF/CIF no es válido; **When** marca «Proveedor extranjero» e
   introduce «DE123456789», **Then** se guarda.
8. **Given** un usuario Almacén, **When** abre la pantalla de Proveedores, **Then** no ve «Nuevo proveedor» y el
   servidor rechaza cualquier intento de crear un proveedor por falta de permiso.

---

### User Story 2 - Consultar la ficha de un proveedor (Priority: P1)

Cualquier usuario con acceso a Proveedores pulsa un proveedor del listado y su ficha ocupa toda la pantalla (sin el
listado): datos fiscales, contacto, pago, compras del año desglosadas por trimestre, pedidos (web, plazo, pedido
mínimo) y observaciones. Una flecha de retorno arriba a la izquierda le devuelve al listado tal como lo dejó.

**Why this priority**: es como el cliente consulta a diario los datos de un proveedor (a quién llamar, dónde pedir,
cuánto tarda, cómo se le paga). A pantalla completa los datos caben sin apretarse, también en el puesto del almacén
(origen: P-06 y decisión de diseño del 2026-10-26).

**Independent Test**: con proveedores dados de alta, un usuario Almacén pulsa uno del listado y comprueba que la
ficha ocupa toda la pantalla, que muestra todos sus datos, que no hay acciones de edición y que la flecha de retorno
le devuelve al listado con la misma búsqueda, filtro, trimestre y página.

**Acceptance Scenarios**:

1. **Given** el listado con proveedores, **When** el usuario pulsa uno, **Then** el listado deja de verse y la
   ficha del proveedor ocupa toda el área de contenido, con la flecha de retorno «Proveedores» arriba.
2. **Given** el listado con una búsqueda, el filtro de bajas activado, el trimestre 2T y la página 2, **When** el
   usuario abre una ficha y pulsa la flecha de retorno, **Then** vuelve al listado con esos mismos criterios y página.
3. **Given** una ficha abierta, **When** el usuario pulsa la flecha de retorno o usa «Atrás» del navegador, **Then**
   vuelve al listado y el foco queda en la fila del proveedor que tenía abierto.
3a. **Given** una ficha abierta, **When** el usuario la mira, **Then** ve las compras del año y su desglose en los
   cuatro trimestres, que suman lo mismo que el total del año.
4. **Given** un proveedor con web, **When** el usuario pulsa el enlace de la ficha, **Then** la web se abre fuera de
   la aplicación, sin cerrar la ficha.
5. **Given** un proveedor sin plazo de entrega, sin pedido mínimo o sin contactos, **When** se abre su ficha,
   **Then** esos datos se muestran como «—» o «Sin pedido mínimo», nunca como 0 ni vacíos sin explicación.
6. **Given** una ficha abierta, **When** el usuario recarga la pantalla o comparte el enlace, **Then** se vuelve a
   abrir la ficha del mismo proveedor con los mismos criterios del listado.
7. **Given** un usuario Almacén, **When** abre una ficha, **Then** no ve «Editar proveedor», «Dar de baja» ni
   «Reactivar».
8. **Given** una pantalla estrecha, **When** el usuario pulsa un proveedor, **Then** la ficha ocupa toda la pantalla
   igual que en escritorio, con sus secciones una debajo de otra, y la flecha de retorno le devuelve al listado en la
   misma posición.

---

### User Story 3 - Editar un proveedor (Priority: P1)

Un usuario Administrador o Administración pulsa «Editar proveedor» en la ficha y modifica cualquier dato con el
mismo formulario y las mismas validaciones que en el alta. Al guardar, la ficha y el listado muestran los datos
nuevos.

**Why this priority**: los datos de un proveedor cambian (teléfonos, plazos, representante) y un dato fiscal
desactualizado acaba en facturas incorrectas.

**Independent Test**: con un usuario Administrador se edita un proveedor cambiando el nombre, el plazo y un correo,
y se comprueba que la ficha y el listado se actualizan; se intenta poner el CIF de otro proveedor y se comprueba el
error.

**Acceptance Scenarios**:

1. **Given** un usuario con permiso de editar y una ficha abierta, **When** pulsa «Editar proveedor», **Then** se
   abre el formulario con los datos actuales.
2. **Given** el formulario de edición, **When** cambia el nombre y el plazo y guarda, **Then** la ficha y la fila del
   listado muestran los valores nuevos.
3. **Given** el formulario de edición, **When** quita un teléfono y guarda, **Then** la ficha deja de mostrarlo.
4. **Given** el formulario de edición, **When** pone el CIF de otro proveedor, **Then** no se guarda y el campo CIF
   indica que ya existe un proveedor con ese CIF.
5. **Given** el formulario de edición, **When** vacía el pedido mínimo y guarda, **Then** la ficha muestra «Sin
   pedido mínimo».
6. **Given** un proveedor dado de baja, **When** un usuario con permiso de editar abre su ficha, **Then** también
   puede editarlo.

---

### User Story 4 - Dar de baja y reactivar un proveedor (Priority: P2)

Un usuario Administrador o Administración da de baja desde la ficha un proveedor con el que ya no trabaja. El
proveedor desaparece del listado por defecto, pero no se borra: con «Mostrar dados de baja» sigue apareciendo con la
marca «Baja», y desde su ficha se puede reactivar.

**Why this priority**: el cliente necesita conservar el historial de sus proveedores (las compras futuras se
asociarán a ellos), pero no quiere ver en el día a día los que ya no usa. No bloquea el alta ni la edición.

**Independent Test**: se da de baja un proveedor y se comprueba que desaparece del listado y que el contador baja;
se activa «Mostrar dados de baja», se comprueba que aparece con la marca «Baja», se reactiva y vuelve al listado
normal.

**Acceptance Scenarios**:

1. **Given** un usuario con permiso de editar y la ficha de un proveedor activo, **When** pulsa «Dar de baja»,
   **Then** se le pide confirmación indicando el nombre del proveedor.
2. **Given** la confirmación, **When** la acepta, **Then** el proveedor queda dado de baja, desaparece del listado
   con el filtro desactivado, el contador de activos baja en uno, la ficha muestra la marca «Baja» y el pie de la
   ficha indica quién y cuándo hizo el cambio.
3. **Given** «Mostrar dados de baja» activado, **When** el usuario mira el listado, **Then** el proveedor dado de
   baja aparece con la marca «Baja».
4. **Given** la ficha de un proveedor dado de baja, **When** el usuario pulsa «Reactivar», **Then** el proveedor
   vuelve a estar activo y aparece en el listado con el filtro desactivado.
5. **Given** cualquier usuario, **When** busca una forma de borrar un proveedor, **Then** no existe: ni en la
   pantalla ni en el servidor.

---

### Edge Cases

- **CIF con distinto formato**: mayúsculas y minúsculas, espacios, guiones y puntos no cuentan al comparar CIF
  («b-12.345.678» es el mismo CIF que «B12345678»). El CIF se guarda en mayúsculas y sin separadores.
- **Dos usuarios dan de alta a la vez el mismo CIF**: solo se guarda el primero; el segundo recibe el error de CIF
  duplicado.
- **Dos usuarios editan a la vez el mismo proveedor**: al guardar el segundo, se le avisa de que otro usuario ha
  cambiado el proveedor mientras lo editaba y se le muestran los datos actuales para que repita sus cambios; nunca
  se sobrescriben en silencio.
- **El proveedor de la dirección no existe** (enlace antiguo o mal escrito): se muestra el listado y un aviso de que
  el proveedor no existe.
- **IBAN con espacios o en minúsculas**: se acepta, se guarda en mayúsculas y sin espacios, y se muestra en grupos de
  cuatro caracteres. Un IBAN con los dígitos de control mal se rechaza con un error junto al campo.
- **Trimestre sin compras o futuro** (4T en octubre): muestra 0,00 €, nunca vacío.
- **Ficha abierta de un proveedor que otro usuario da de baja**: la ficha se actualiza al volver a pedirla; si el
  filtro de bajas está desactivado, el proveedor desaparece del listado en la siguiente carga.
- **Nombres repetidos**: dos proveedores pueden llamarse igual si tienen distinto CIF; el listado los muestra a ambos.
- **Web sin protocolo** («www.ejemplo.com»): se acepta y se guarda como dirección segura («https://…»).
- **Formulario con contactos vacíos** (una fila de teléfono sin número): las filas vacías se ignoran al guardar.
- **Búsqueda sin resultados**: con proveedores dados de alta, una búsqueda que no encuentra nada muestra «Ningún
  proveedor coincide con la búsqueda», distinto del aviso de listado vacío.
- **Primer uso, sin proveedores**: el aviso de listado vacío sigue diciendo que los proveedores se cargarán desde el
  sistema anterior; a quien puede editar le indica además que puede dar de alta uno a mano, y a quien solo puede
  ver solo le informa.
- **El rol pierde el permiso de editar con el formulario abierto**: al guardar, el servidor lo rechaza por falta de
  permiso y el formulario lo indica sin perder lo escrito hasta que el usuario lo cierre.
- **La sesión caduca con el formulario abierto**: se aplica el comportamiento de sesión caducada de 001-user-login.
- **Escritorio sin conexión con su base de datos**: guardar falla con un mensaje de error sin detalles técnicos y el
  formulario conserva lo escrito (no hay modo sin conexión, 002-desktop-local-backend).

## Requirements *(mandatory)*

### Functional Requirements

**Acceso y permisos**

- **FR-001**: La pantalla de Proveedores MUST seguir disponible en web y escritorio para los roles con permiso de
  ver o editar Proveedores según la matriz de 003-user-management (Administrador y Administración editan; Almacén
  solo ve; Comercial sin acceso).
- **FR-002**: Solo los roles con permiso de editar Proveedores MUST ver «Nuevo proveedor», «Editar proveedor», «Dar de
  baja» y «Reactivar». El servidor MUST rechazar crear, editar, dar de baja o reactivar a cualquier usuario sin ese
  permiso, aunque la petición no venga de la pantalla.
- **FR-003**: El servidor MUST exigir sesión iniciada y permiso de ver Proveedores para devolver el listado y la
  ficha de un proveedor.

**Datos del proveedor**

- **FR-004**: Un proveedor MUST tener estos datos:
  - Nombre: obligatorio, de 1 a 120 caracteres.
  - CIF: obligatorio; se guarda en mayúsculas y sin espacios, guiones ni puntos. Por defecto MUST ser un NIF o CIF
    español válido, con su dígito de control correcto.
  - Proveedor extranjero: casilla (por defecto, no). Marcada, el CIF no se comprueba como español y se acepta
    cualquier identificador fiscal de 3 a 20 letras y números (una vez quitados los separadores).
  - Dirección (hasta 200 caracteres), código postal y población (hasta 100 caracteres): obligatorios. El código
    postal de un proveedor español MUST tener 5 cifras; el de un proveedor extranjero, de 3 a 10 letras, números,
    espacios o guiones.
  - Persona de contacto: opcional, hasta 120 caracteres.
  - Teléfonos: de 0 a 5, cada uno con número (de 6 a 20 caracteres: dígitos, espacios, «+», «-», paréntesis) y
    etiqueta libre opcional (hasta 40 caracteres).
  - Correos: de 0 a 5, cada uno con una dirección de correo válida y etiqueta libre opcional (hasta 40 caracteres).
  - Forma de pago: una de «Transferencia 30 días», «Transferencia 60 días», «Domiciliación bancaria», «Pagaré» o
    «Contado»; por defecto, «Transferencia 30 días».
  - IBAN: opcional; si se indica, MUST ser un IBAN válido (formato y dígitos de control). Se guarda en mayúsculas y sin
    espacios, y se muestra en grupos de cuatro caracteres.
  - Web: opcional, una dirección web válida; si no lleva protocolo se guarda con «https://».
  - Plazo de entrega habitual: opcional, número entero de días naturales entre 0 y 365.
  - Pedido mínimo: importe opcional en euros, mayor que 0 y con hasta 2 decimales. Vacío significa que el proveedor
    no tiene pedido mínimo.
  - Observaciones: opcional, texto libre de hasta 2.000 caracteres.
  - Estado: activo o dado de baja; todo proveedor nuevo nace activo.
- **FR-005**: El CIF MUST ser único entre todos los proveedores, activos o dados de baja, comparándolo ya
  normalizado (FR-004). Un CIF repetido MUST rechazarse en el alta y en la edición indicando el nombre del proveedor
  que ya lo tiene.
- **FR-006**: El servidor MUST validar todos los datos de FR-004 en el alta y en la edición, quitando los espacios del
  principio y del final de los textos, y MUST rechazar los no válidos con un error de validación por campo, que la
  pantalla muestra junto a cada campo.

**Alta y edición**

- **FR-007**: «Nuevo proveedor» MUST abrir un formulario vacío con los datos de FR-004; «Editar proveedor» MUST abrir
  el mismo formulario con los datos actuales. Los teléfonos y correos MUST poder añadirse, quitarse y etiquetarse uno
  a uno, y el formulario MUST impedir añadir más del máximo.
- **FR-008**: El formulario MUST validar en pantalla los campos obligatorios y los formatos antes de enviar, mostrar
  los errores junto a cada campo y llevar el foco al primer campo con error. NEVER MUST perder lo escrito por un
  error de validación o de servidor.
- **FR-009**: Al guardar un alta, el proveedor MUST aparecer en el listado y su ficha MUST abrirse; al guardar una
  edición, la ficha y la fila del listado MUST mostrar los datos nuevos. En ambos casos MUST mostrarse una
  confirmación breve de que se ha guardado.
- **FR-010**: Cancelar un formulario con cambios sin guardar MUST pedir confirmación antes de descartarlos; sin
  cambios, MUST cerrarse directamente.
- **FR-011**: Si otro usuario ha modificado el proveedor desde que se abrió el formulario de edición, guardar MUST
  rechazarse con un aviso que lo explique y MUST ofrecer recargar los datos actuales; NEVER MUST sobrescribirse en
  silencio el cambio del otro usuario.

**Ficha del proveedor**

- **FR-012**: Pulsar un proveedor del listado MUST abrir su ficha a pantalla completa: el listado deja de verse y la
  ficha ocupa toda el área de contenido (el menú lateral de la aplicación se mantiene). La ficha MUST mostrar:
  cabecera con nombre, marca «Baja» si lo está y CIF (con la indicación «extranjero» si lo es); datos fiscales
  (dirección, código postal y población); contacto (persona de contacto, teléfonos y correos con sus etiquetas,
  que se pueden pulsar para llamar o escribir); pago (forma de pago e IBAN); compras del año con su desglose por
  trimestre (FR-021a); pedidos (web como enlace que se abre fuera de la aplicación, plazo de entrega «N días» o «—»
  y pedido mínimo: importe o «Sin pedido mínimo»); y observaciones respetando los saltos de línea.
- **FR-012b**: Cada proveedor MUST guardar quién (usuario) y cuándo (fecha y hora) lo creó, y quién y cuándo hizo
  el último cambio; dar de baja y reactivar cuentan como cambio. La ficha MUST mostrarlo al pie («Creado por … el …
  · Modificado por … el …»). No se guarda el historial de cambios anteriores.
- **FR-013**: La ficha abierta MUST formar parte de la dirección de la pantalla junto con los criterios del listado
  de 009, de modo que se conserve al recargar, al usar «Atrás» y al compartir el enlace. Un proveedor inexistente en
  la dirección MUST mostrar el listado y un aviso de que no existe.
- **FR-014**: La ficha MUST tener arriba a la izquierda una flecha de retorno con el texto «Proveedores» (botón de
  44 px como mínimo, con nombre accesible «Volver al listado de proveedores»). La flecha y «Atrás» del navegador MUST
  devolver al listado con la misma búsqueda, filtro de bajas, trimestre y página, y con el foco en la fila del
  proveedor que estaba abierto. El formulario de alta y edición MUST abrirse también a pantalla completa con su
  propia flecha de retorno (al listado en el alta, a la ficha en la edición), sujeta a FR-010.
- **FR-015**: Por debajo del corte responsive, la ficha MUST comportarse igual, con sus secciones apiladas en una
  sola columna.
- **FR-016**: La ficha NEVER MUST mostrar en esta entrega los productos asociados, el pedido de compra sugerido ni
  «Generar albarán» / «Generar pedido de compra» (la pestaña «Productos y pedido» del diseño queda para el circuito
  de compra).

**Baja y reactivación**

- **FR-017**: «Dar de baja» MUST pedir confirmación con el nombre del proveedor y, al confirmar, MUST marcarlo como
  dado de baja sin borrar ninguno de sus datos. «Reactivar» MUST devolverlo a activo sin confirmación.
- **FR-018**: NEVER MUST existir una forma de borrar un proveedor, ni en la pantalla ni en el servidor.
- **FR-019**: Un proveedor dado de baja MUST poder consultarse y editarse; la ficha MUST mostrar la marca «Baja».

**Listado**

- **FR-020**: El listado, la búsqueda por nombre o CIF, el filtro «Mostrar dados de baja», el contador, la paginación
  de 10 en 10 y los criterios en la dirección MUST comportarse como en 009, ahora con los proveedores guardados. La
  búsqueda por CIF MUST encontrar al proveedor aunque se escriba con otro formato (FR-005). El orden del listado MUST
  ser alfabético por nombre.
- **FR-021**: La columna «Compras año» MUST mantenerse como en 009 (importe sin IVA comprado desde el 1 de enero del
  año en curso) y, mientras no exista el módulo de compras, MUST valer 0 para todos los proveedores, mostrado con el
  formato de importes del usuario.
- **FR-021a**: El listado MUST tener un selector «Gasto por trimestre» con 1T, 2T, 3T y 4T del año en curso (por
  defecto, el trimestre en curso) y una columna «Gasto <trimestre>» con el importe sin IVA comprado al proveedor en
  ese trimestre. El trimestre elegido MUST formar parte de los criterios de la dirección (como en FR-007a de 009) y
  un valor no válido MUST sustituirse por el trimestre en curso. La ficha MUST mostrar los cuatro trimestres del año
  y su suma MUST coincidir con «Compras año». Mientras no exista el módulo de compras, todos valen 0. El selector
  NEVER MUST mostrarse como importe con IVA: el resumen con IVA para el modelo 347 sigue en la página de Acciones.
- **FR-021b**: El listado MUST mostrar además la columna CIF. En estrecho, el listado MUST mostrar solo el proveedor
  (con sus marcas) y «Compras año».
- **FR-022**: Sin ningún proveedor guardado, el aviso de listado vacío MUST mantener el texto de 009 (todavía no hay
  proveedores porque se cargarán desde el sistema anterior) y, a quien puede editar, MUST añadir que puede dar de
  alta uno con «Nuevo proveedor»; a quien solo puede ver, solo informar. Con proveedores guardados y una búsqueda o filtro sin resultados, MUST mostrarse «Ningún proveedor
  coincide con la búsqueda», distinto del aviso anterior.
- **FR-023**: Los estados de carga y de error del listado («No se ha podido cargar el listado de proveedores» con
  «Reintentar») MUST seguir como en 009. La ficha y el guardado MUST tener sus propios mensajes de carga y de error,
  sin detalles técnicos.

**Diseño y accesibilidad**

- **FR-024**: El listado, la ficha, el formulario, el diálogo de baja, el diálogo de descartar cambios y los avisos
  (carga, error, proveedor inexistente, conflicto de edición, error al guardar) MUST seguir el tablero «Proveedores»
  (`Proveedores.dc.html`, y `ProveedoresMovil.dc.html` en estrecho) del diseño «Albarán», que sustituye al tablero
  anterior de Proveedores. La sección «Acceso a la web del proveedor» la añadirá la spec 011.
- **FR-025**: Los importes (pedido mínimo, compras del año, gasto por trimestre) MUST mostrarse y pedirse con el formato de importes del
  usuario de 004-appearance-preferences; el plazo de entrega NEVER MUST mostrarse como importe.
- **FR-026**: La pantalla, la ficha y el formulario MUST seguir el sistema visual «Albarán» en tema claro y oscuro,
  ser operables por completo con teclado, tener un objetivo táctil mínimo de 44 px, asociar cada error a su campo
  de forma que lo anuncien los lectores de pantalla, y anunciar la confirmación de guardado.

### Key Entities

- **Proveedor**: empresa a la que el cliente compra. Atributos: nombre, CIF (único, normalizado), proveedor
  extranjero (sí/no), dirección, código
  postal, población, persona de contacto, teléfonos, correos, forma de pago, IBAN, web, plazo de entrega habitual en días, pedido mínimo (importe
  opcional), observaciones, estado (activo o dado de baja), creado por y cuándo, último cambio por y cuándo, y
  compras del año y gasto de cada trimestre del año (calculados, sin IVA; 0 hasta que exista el módulo de compras). Sustituye a «Proveedor (listado)» de 009, que pasa a ser una vista resumida suya.
- **Contacto del proveedor**: teléfono o correo con una etiqueta libre opcional. Pertenece a un único proveedor;
  máximo 5 teléfonos y 5 correos por proveedor.
- **Criterios del listado** y **Página de resultados**: los de 009, ampliados con el trimestre elegido y el proveedor
  abierto en la ficha.
- **Usuario, rol y permisos**: definidos en 001-user-login y 003-user-management; aquí se leen los permisos de ver y
  editar Proveedores.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario con permiso de editar da de alta un proveedor con nombre, CIF, dirección completa, un
  teléfono y un correo en menos de 2 minutos.
- **SC-002**: Desde el listado, cualquier usuario con acceso ve los datos de contacto de un proveedor con un solo
  clic o toque.
- **SC-003**: El 100 % de los intentos de guardar un CIF ya existente (en cualquier formato) se rechazan con el
  nombre del proveedor que lo tiene.
- **SC-004**: El 100 % de las acciones de crear, editar, dar de baja o reactivar hechas por usuarios sin permiso de
  editar se rechazan, por cualquier vía.
- **SC-005**: Ningún proveedor se pierde: el 100 % de los dados de baja siguen apareciendo con «Mostrar dados de baja»
  y se pueden reactivar.
- **SC-006**: Con 1.000 proveedores guardados, el listado, la búsqueda y la apertura de una ficha responden en menos
  de 2 segundos.
- **SC-007**: En una prueba con usuarios, 9 de cada 10 completan el alta de un proveedor y encuentran después su
  teléfono de facturación sin ayuda.

## Assumptions

- La sesión, la protección de pantallas y la caducidad son las de 001-user-login; la matriz de permisos, la de
  003-user-management; tema, densidad, formato de importes y pantalla de inicio, los de 004-appearance-preferences; el
  menú, el de 005-app-navigation; el escritorio usa su backend local (002-desktop-local-backend).
- Esta spec parte de 009-suppliers-placeholder: el listado, sus criterios, sus estados y su contrato se mantienen y
  pasan a devolver los proveedores guardados.
- Decisiones aprobadas en `/speckit-detect` (2026-10-26): nombre y CIF obligatorios; CIF único entre todos los
  proveedores, incluidos los dados de baja; contactos como listas de teléfonos y correos con etiqueta libre; el
  formulario se diseña en el lienzo «Albarán» antes de `/speckit-plan`.
- Pedido mínimo como importe opcional en €, sin casilla (P-05 del resumen, confirmado con el cliente el 2026-10-26).
  El aviso cuando un pedido no llega al mínimo pertenece al circuito de compra y no entra aquí.
- Supuestos del equipo sin respaldo en la transcripción, mantenidos por buena práctica: el aviso de edición
  simultánea (FR-011) y las metas de rendimiento y de prueba con usuarios (SC-006 y SC-007).
- Los límites de longitud y de número de contactos (5 teléfonos y 5 correos) son valores razonables por defecto,
  ajustables en `/speckit-clarify`.
- Los proveedores del sistema anterior se cargarán en una spec futura de migración (clarificación del 2026-10-26);
  hasta entonces, el listado solo muestra los dados de alta a mano. Esa carga tendrá que respetar las reglas de esta
  spec (CIF válido salvo extranjeros, CIF único, dirección completa), decidir qué hacer con los proveedores
  antiguos sin dirección y resolver los dados de alta a mano que coincidan por CIF.
- El orden alfabético por nombre es el orden por defecto; ordenar por productos en falta queda para cuando exista la
  relación entre productos y proveedores.
- Persona de contacto, forma de pago, IBAN, gasto por trimestre y ficha a pantalla completa vienen de combinar la
  propuesta de diseño con el tablero «Proveedores» original (decisión del 2026-10-26); no salen de la transcripción.
  La lista de formas de pago es la del tablero.
- El gasto por trimestre del listado y de la ficha es sin IVA, coherente con «Compras año». El resumen con IVA para
  el modelo 347 (P-04 del resumen) sigue siendo cosa de la página de Acciones.
- El IBAN lo ven todos los roles con acceso a Proveedores, igual que el resto de la ficha; solo las credenciales de la
  web (spec 011) se reservan al Administrador.
- Fuera de alcance: credenciales de la web del proveedor (spec 011); la pestaña «Productos y pedido» del diseño
  (productos asociados, cantidades, pedido de compra sugerido y «Generar albarán»), que pertenece al circuito de
  compra aplazado (C-02 del resumen); todo el circuito de compra del resumen: albarán de compra y factura (N-10),
  alta rápida de producto desde el albarán (N-11, C-01), lista de compra (N-12), buscador de productos al pedir
  (N-13), precio de la última compra (N-14) y sus reglas (R-01 a R-04 y R-07); ordenar por productos en falta; el modelo 347 con IVA (página de Acciones);
  catálogos del proveedor; borrar proveedores; migración desde el sistema anterior; importar o exportar proveedores.
- Origen de los requisitos: `docs/discovery/001-proveedores.md` (N-01 a N-07, P-05, P-06, P-07, P-11) y la decisión
  de diseño del 2026-10-26.
