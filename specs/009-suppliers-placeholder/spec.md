# Feature Specification: Pantalla provisional de Proveedores

**Feature Branch**: `009-suppliers-placeholder`

**Created**: 2026-10-23

**Status**: Draft

**Input**: User description: "Pantalla provisional de Proveedores en la aplicación B2B de venta a mayoristas (web y
escritorio). Hoy Proveedores aparece en el menú como «Pendiente» y no se puede abrir. Se quiere que se pueda abrir,
con la estructura del diseño «Albarán»: título, número de proveedores activos, búsqueda de proveedores y listado con
las columnas proveedor, plazo y compras del año. En móvil el listado se muestra en tarjetas y la columna «Plazo» se
oculta. Los proveedores reales se cargarán en el futuro desde una base de datos antigua, así que en esta entrega la
pantalla pide el listado al servidor y el servidor responde siempre con un listado vacío, sin leer la base de datos.
Historias: 1) Un usuario cuyo rol tiene acceso a Proveedores (Administrador y Administración pueden editar, Almacén
solo ver y Comercial no tiene acceso, según la matriz de permisos) lo abre desde el menú y ve la estructura de la
pantalla. 2) Con el listado vacío, ve un aviso claro de que todavía no hay proveedores porque se cargarán desde el
sistema anterior; si busca, se vuelve a pedir el listado y sigue viendo el mismo aviso. 3) Si el servidor no
responde o devuelve un error, ve un mensaje de error distinto del aviso de «sin datos», sin detalles técnicos y con
la opción «Reintentar». Reglas: Proveedores pasa a ser un módulo implementado (se activa en el menú y se puede
elegir como pantalla de inicio); los roles sin acceso no lo ven ni pueden abrirlo por dirección; el servidor exige
sesión y permiso de ver Proveedores, valida los criterios (búsqueda de 100 caracteres como máximo, página entera
positiva) y responde con la forma definitiva del listado (proveedores de la página, total, página y tamaño de
página, 10 por página); la búsqueda y la página forman parte de la dirección y se conservan al recargar, al usar
«Atrás» y al compartir el enlace, y los valores no válidos de la dirección se sustituyen por los de por defecto; el
aviso de «sin datos» y el error reutilizan los ya definidos para Productos y Clientes; los botones de acción del
diseño («Nuevo proveedor», «Editar proveedor») no se muestran. [DUDA: la columna «Plazo» del diseño, ¿es el plazo
de entrega del proveedor o el plazo de pago acordado?, y ¿en qué unidad se expresa (días)?] Fuera de alcance: alta
y edición de proveedores, ficha lateral con productos asociados, pedido de compra sugerido y «Generar pedido de
compra», compras y migración de datos."

## Clarifications

### Session 2026-10-23

- Q: ¿La columna «Plazo» del listado de proveedores es el plazo de entrega del proveedor, en días? → A: Sí: plazo
  de entrega en días naturales, como número entero; se muestra «N días», o «—» si no se conoce.
- Q: ¿Las «Compras año» del listado son las del año natural en curso o las de los últimos 12 meses? → A: Año
  natural en curso (del 1 de enero hasta hoy), importe sin IVA.
- Q: ¿El listado debe incluir ya el nº de productos asociados y el nº bajo mínimos para el subtítulo de la fila? →
  A: No: la fila muestra solo el nombre del proveedor; el subtítulo llegará con la ficha de proveedor.
- Q: ¿El listado muestra solo los proveedores activos o también los dados de baja? → A: Todos, con un filtro
  «Mostrar dados de baja» desactivado por defecto; con el filtro activado, los dados de baja aparecen marcados
  como «Baja».
- Q: ¿Sobre qué datos del proveedor buscará el texto de la búsqueda? → A: Nombre o CIF; el texto de ayuda de la
  búsqueda es «Nombre o CIF».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir Proveedores y ver su estructura (Priority: P1) 🎯 MVP

Un usuario cuyo rol tiene acceso a Proveedores (Administrador y Administración pueden editar; Almacén solo ver,
según la matriz de permisos) pulsa Proveedores en el menú, que ya no aparece como «Pendiente», y llega a la
pantalla de Proveedores. Ve el título, el número de proveedores activos, la búsqueda de proveedores, el filtro
«Mostrar dados de baja» (desactivado) y el listado con sus columnas (proveedor, plazo de entrega y compras del año), tal como los define el diseño «Albarán». Al entrar, la
pantalla pide el listado al servidor.

**Why this priority**: es la base de la feature. Sin una pantalla accesible no hay dónde mostrar los avisos ni dónde
cargar los proveedores cuando se migren, y deja fijado cómo se pide el listado.

**Independent Test**: con un usuario Administración (editar) y otro Almacén (solo ver), se pulsa Proveedores en el
menú y se comprueba que se abre la pantalla con su título, la búsqueda y las cabeceras del listado, y que se ha
hecho la petición del listado al servidor. Con un usuario Comercial se comprueba que Proveedores no aparece.

**Acceptance Scenarios**:

1. **Given** un usuario cuyo rol puede ver o editar Proveedores, **When** mira el menú, **Then** Proveedores aparece
   como enlace normal, sin la marca «Pendiente».
2. **Given** ese usuario, **When** pulsa Proveedores, **Then** se abre la pantalla de Proveedores y el menú marca
   Proveedores como activo.
3. **Given** la pantalla de Proveedores, **When** termina de cargar, **Then** se ven el título, el número de
   proveedores activos (0), la búsqueda de proveedores, el filtro «Mostrar dados de baja» desactivado y las
   cabeceras del listado (Proveedor, Plazo y Compras año).
4. **Given** la pantalla de Proveedores, **When** el usuario mira las acciones, **Then** no aparecen «Nuevo
   proveedor», la ficha lateral ni sus acciones («Editar proveedor», «Generar pedido de compra»).
5. **Given** un usuario cuyo rol puede ver Proveedores, **When** va a Ajustes › Apariencia, **Then** puede elegir
   Proveedores como pantalla de inicio.
6. **Given** un usuario Comercial (sin acceso a Proveedores), **When** mira el menú o intenta abrir la pantalla por
   dirección, **Then** Proveedores no aparece y no puede abrirla.
7. **Given** una pantalla estrecha, **When** el usuario abre Proveedores, **Then** la estructura se adapta a la
   versión móvil del diseño: listado en tarjetas y sin la columna «Plazo».

---

### User Story 2 - Entender que los proveedores aún no están cargados (Priority: P1)

Con el listado vacío, el usuario ve en lugar de las filas un aviso claro: todavía no hay proveedores porque se
cargarán desde el sistema anterior. Puede escribir una búsqueda o activar «Mostrar dados de baja»: la pantalla vuelve
a pedir el listado al servidor con esos criterios y el resultado sigue vacío, con el mismo aviso.

**Why this priority**: sin el aviso, una pantalla vacía parece un fallo o unos datos borrados. Es lo que hace que la
pantalla provisional sea comprensible.

**Independent Test**: se abre Proveedores, se comprueba que aparece el aviso de proveedores pendientes de carga, se
busca un texto y se comprueba que se pide el listado al servidor con ese texto y que el aviso sigue visible.

**Acceptance Scenarios**:

1. **Given** el servidor devuelve un listado vacío, **When** se carga la pantalla, **Then** el usuario ve un aviso
   que dice que todavía no hay proveedores porque se cargarán desde el sistema anterior, y no ve filas ni
   paginación.
2. **Given** la pantalla con el aviso, **When** el usuario escribe en la búsqueda, **Then** la pantalla pide el
   listado al servidor con ese texto y sigue mostrando el mismo aviso (no el de «ningún proveedor coincide»).
2a. **Given** la pantalla con el aviso, **When** el usuario activa o desactiva «Mostrar dados de baja», **Then** la
   pantalla pide el listado al servidor con ese criterio, vuelve a la página 1 y sigue mostrando el mismo aviso.
3. **Given** la petición en curso, **When** el usuario mira la pantalla, **Then** ve que se está cargando, sin que
   aparezca antes de tiempo el aviso de «sin datos».
4. **Given** un lector de pantalla, **When** termina la carga, **Then** se anuncia el aviso de proveedores
   pendientes de carga.

---

### User Story 3 - Distinguir un error del listado vacío (Priority: P2)

Si el servidor no responde o devuelve un error, el usuario ve un mensaje de error comprensible, distinto del aviso
de proveedores pendientes de carga, y puede volver a intentarlo sin salir de la pantalla.

**Why this priority**: evita que un fallo de conexión se confunda con un listado vacío. Con datos reales será
imprescindible, pero en esta entrega el listado siempre está vacío.

**Independent Test**: con el servidor detenido o devolviendo un error, se abre Proveedores y se comprueba que
aparece el mensaje de error (no el aviso de proveedores pendientes) y que «Reintentar» vuelve a pedir el listado;
con el servidor de nuevo disponible, aparece el aviso de proveedores pendientes.

**Acceptance Scenarios**:

1. **Given** el servidor no responde, **When** se carga la pantalla, **Then** el usuario ve un mensaje que dice que
   no se ha podido cargar el listado de proveedores, con la opción «Reintentar», y no ve el aviso de proveedores
   pendientes.
2. **Given** el servidor devuelve un error, **When** se carga la pantalla, **Then** el usuario ve el mismo mensaje
   de error, sin detalles técnicos.
3. **Given** el mensaje de error, **When** el usuario pulsa «Reintentar» y el servidor ya responde, **Then**
   desaparece el error y se muestra el aviso de proveedores pendientes.
4. **Given** el mensaje de error, **When** el usuario lo mira, **Then** el error se entiende por el texto, no solo
   por el color, y los lectores de pantalla lo anuncian.

---

### Edge Cases

- Búsqueda con espacios al principio o al final: se ignoran; una búsqueda solo de espacios equivale a no buscar.
- Búsqueda más larga de lo permitido: la pantalla no deja escribir más del máximo y el servidor rechaza un texto
  más largo con un error de validación.
- Criterios no válidos enviados al servidor (página negativa, texto demasiado largo…): el servidor los rechaza con
  un error de validación y la pantalla muestra el mensaje de error de la historia 3.
- Criterios no válidos escritos a mano en la dirección (`?page=abc`, búsqueda demasiado larga…): la pantalla los
  sustituye por los valores por defecto y corrige la dirección antes de pedir el listado (FR-007a), sin error.
  Lo mismo con un valor del filtro de bajas que no sea «sí» o «no»: se toma como desactivado.
- Varias peticiones seguidas al escribir rápido: la pantalla muestra solo el resultado de la última y no lanza una
  petición por cada tecla.
- La sesión caduca mientras se pide el listado: se aplica el comportamiento de sesión caducada de 001-user-login.
- El rol del usuario pierde el acceso a Proveedores con la pantalla abierta: en cuanto la sesión recoge el cambio
  (máximo 15 minutos, 003-user-management) el menú deja de mostrar Proveedores y una nueva petición del listado se
  rechaza por falta de permiso.
- Un usuario tenía Proveedores como pantalla de inicio de antes de 005: vuelve a funcionar como pantalla de inicio.
- Un usuario Comercial tenía Proveedores como pantalla de inicio: se aplica la regla de pantalla no disponible de
  004-appearance-preferences.
- Escritorio sin conexión con su base de datos: la pantalla se comporta igual que con un error del servidor (no hay
  modo sin conexión, 002-desktop-local-backend).

## Requirements *(mandatory)*

### Functional Requirements

**Acceso**

- **FR-001**: Proveedores MUST pasar a ser un módulo implementado: el menú MUST mostrarlo como enlace normal, sin la
  marca «Pendiente», y el selector de pantalla de inicio de 004-appearance-preferences MUST ofrecerlo a los roles
  que pueden verlo.
- **FR-002**: La pantalla de Proveedores MUST estar disponible en la web y en el escritorio, solo con sesión
  iniciada, y solo para los roles con permiso de editar o de solo ver Proveedores según la matriz de permisos de
  003-user-management. Los demás roles NEVER MUST verla ni en el menú ni por dirección.
- **FR-003**: En esta entrega, los permisos de editar y de solo ver MUST mostrar la misma pantalla, porque no hay
  acciones de edición.

**Estructura de la pantalla**

- **FR-004**: La pantalla MUST mostrar el título «Proveedores», el contador del listado, una búsqueda de proveedores
  por nombre o CIF (texto de ayuda «Nombre o CIF», en lugar del «Nombre del proveedor» del lienzo), un filtro
  «Mostrar dados de baja» desactivado por defecto y el listado con las columnas del diseño «Albarán»: proveedor, plazo de entrega
  y compras del año (importe sin IVA comprado al proveedor desde el 1 de enero del año en curso hasta hoy).
- **FR-004a**: Con el filtro desactivado, el listado MUST incluir solo proveedores activos y el contador MUST
  decir «N activos». Con el filtro activado, MUST incluir también los dados de baja, el contador MUST decir
  «N proveedores» y cada proveedor dado de baja MUST mostrar la marca «Baja», en la fila y en la tarjeta móvil.
- **FR-005**: La pantalla NEVER MUST mostrar «Nuevo proveedor», la ficha lateral de proveedor ni sus acciones
  («Editar proveedor», productos asociados, pedido de compra sugerido y «Generar pedido de compra»).
- **FR-006**: Con el listado vacío, la paginación NEVER MUST mostrarse.

**Listado y criterios**

- **FR-007**: Al abrir la pantalla, y cada vez que el usuario cambia la búsqueda o el filtro de bajas, la pantalla
  MUST pedir el listado al servidor con los criterios elegidos: texto de búsqueda, mostrar dados de baja (sí/no) y
  página. Al escribir en la búsqueda, MUST esperar a que
  el usuario deje de teclear antes de pedirlo, y MUST mostrar solo el resultado de la última petición.
- **FR-007a**: La búsqueda, el filtro de bajas y la página MUST formar parte de la dirección de la pantalla, de modo
  que se conserven al recargar, al usar «Atrás» y al compartir el enlace; al abrir una dirección con criterios, la
  pantalla MUST mostrarlos en la búsqueda y el filtro y pedir el listado con ellos. Cambiar la búsqueda o el filtro
  MUST volver a la página 1. Un valor no válido en la dirección (página no entera o no positiva, búsqueda de más de
  100 caracteres, filtro distinto de sí/no) MUST ignorarse, sustituirse por el valor por defecto (sin búsqueda,
  filtro desactivado, página 1) y corregirse en la dirección, sin mostrar error.
- **FR-008**: El servidor MUST exigir sesión iniciada y permiso de ver Proveedores para responder al listado, y MUST
  validar los criterios recibidos: texto de búsqueda de 100 caracteres como máximo (sin contar los espacios del
  principio y del final), filtro de bajas sí/no (desactivado si no se envía) y página entera positiva. Los criterios no válidos MUST rechazarse con un error de
  validación.
- **FR-009**: En esta entrega, el servidor MUST responder siempre a una petición válida con un listado vacío y un
  total de 0 proveedores, sin leer ni escribir proveedores en la base de datos.
- **FR-010**: La respuesta del listado MUST tener ya la forma definitiva: los proveedores de la página (con los
  datos de las columnas de FR-004 y si están activos o dados de baja), el total de proveedores, la página y el tamaño de página (10). Así, cargar los
  proveedores reales no cambiará lo que recibe la pantalla.

**Estados de la pantalla**

- **FR-011**: Mientras se pide el listado, la pantalla MUST indicar que está cargando y NEVER MUST mostrar a la vez
  el aviso de «sin datos» ni el de error.
- **FR-012**: Si el listado llega vacío, la pantalla MUST mostrar, en lugar de las filas, un aviso que diga que
  todavía no hay proveedores porque se cargarán desde el sistema anterior. El aviso MUST ser el mismo con y sin
  búsqueda.
- **FR-013**: Si el servidor no responde o devuelve un error, la pantalla MUST mostrar un mensaje que diga que no se
  ha podido cargar el listado de proveedores, distinto del aviso de FR-012 y sin detalles técnicos, con una opción
  «Reintentar» que vuelve a pedir el listado con los mismos criterios.
- **FR-014**: El aviso de «sin datos» y el mensaje de error MUST entenderse por su texto, no solo por el color, y
  los lectores de pantalla MUST anunciarlos al aparecer.

**Diseño y accesibilidad**

- **FR-015**: La pantalla MUST seguir el sistema visual «Albarán» en tema claro y oscuro, respetar la densidad de
  tablas de 004-appearance-preferences y, por debajo del corte responsive, mostrar la versión móvil del diseño
  (listado en tarjetas, sin la columna «Plazo»). Los controles MUST ser operables con teclado y tener un objetivo
  táctil mínimo de 44 px.
- **FR-016**: Cuando el listado tenga proveedores (futuro), las compras del año MUST mostrarse con el formato de
  importes del usuario (004-appearance-preferences), y el plazo de entrega como un número entero de días
  naturales seguido de «días» («3 días»), nunca como importe. Un proveedor sin plazo de entrega conocido MUST
  mostrar «—» en esa columna.
- **FR-017**: El aviso de pantalla vacía y el mensaje de error MUST reutilizar el EmptyState y el error de listado
  documentados por 006-products-placeholder en `docs/design/README.md`, cambiando solo el texto, y
  `docs/design/README.md` MUST registrar su uso en Proveedores en el mismo cambio.
- **FR-018**: El filtro «Mostrar dados de baja» y la marca «Baja» no están en el lienzo «Albarán»: el filtro MUST
  reutilizar el control del filtro «Solo stock bajo» de Productos y la marca, el sello de estado del sistema visual
  con texto (no solo color). `docs/design/README.md` MUST registrar ambos en el mismo cambio.

### Key Entities

- **Proveedor (listado)**: proveedor tal como aparece en el listado. Atributos: nombre, plazo de entrega en días
  naturales (entero, opcional), compras del año natural en curso (importe sin IVA) y estado (activo o dado de
  baja). La búsqueda se aplica también a su CIF, que no forma parte del listado. En esta entrega no hay ninguno;
  se define para fijar el contrato del listado.
- **Criterios del listado**: texto de búsqueda, mostrar dados de baja (sí/no, por defecto no) y página.
- **Página de resultados**: proveedores de la página, total de proveedores, página y tamaño de página.
- **Usuario, rol y permisos**: definidos en 001-user-login y 003-user-management; aquí solo se lee el permiso de ver
  Proveedores.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario con acceso llega a la pantalla de Proveedores desde cualquier pantalla con un solo clic o
  toque en el menú.
- **SC-002**: El 100 % de las veces que se abre Proveedores, o que se cambia la búsqueda o el filtro de bajas, se
  pide el listado al servidor con los criterios elegidos.
- **SC-003**: En el 100 % de los casos, el usuario ve el aviso de proveedores pendientes de carga o el mensaje de
  error, nunca los dos a la vez ni una pantalla en blanco.
- **SC-004**: Con el servidor disponible, el aviso de proveedores pendientes aparece en menos de 2 segundos desde
  que se abre la pantalla.
- **SC-005**: El 100 % de los usuarios Comercial (y de cualquier rol sin acceso) no pueden ver la pantalla ni
  obtener el listado por ninguna vía.
- **SC-006**: En una prueba con usuarios, 9 de cada 10 entienden, sin ayuda, que los proveedores aún no se han
  cargado y que no se trata de un error.

## Assumptions

- La sesión, la protección de pantallas y el cierre por caducidad existen (001-user-login); la matriz de permisos es
  la de 003-user-management (Proveedores: Administrador y Administración editan; Almacén solo ve; Comercial sin
  acceso); tema, densidad, formato de importes y pantalla de inicio son los de 004-appearance-preferences; el menú y
  la regla de módulo implementado son los de 005-app-navigation.
- El escritorio usa su backend local (002-desktop-local-backend); la pantalla se comporta igual en web y escritorio.
- «Plazo» es el **plazo de entrega** del proveedor en días: el tablero `Proveedores.dc.html` lo muestra como
  «3 días» en la fila y como «Entrega en 3 días» en la ficha (confirmado en la clarificación del 2026-10-23).
- El contador de la cabecera es el total del listado con los criterios elegidos: «N activos» con el filtro de bajas
  desactivado y «N proveedores» con él activado (clarificación del 2026-10-23). Dar de baja o reactivar un
  proveedor queda para la spec de alta y edición.
- El subtítulo de cada fila del diseño (número de productos asociados y cuántos están bajo mínimos) depende de los
  productos asociados y se añadirá con la ficha de proveedor; en esta entrega no forma parte del listado y la fila muestra solo el nombre (clarificación del 2026-10-23).
- El tamaño de página es de 10 proveedores, igual que Productos y Clientes, aunque en esta entrega no se llega a
  usar.
- La búsqueda se aplicará en el futuro sobre el nombre y el CIF del proveedor (clarificación del 2026-10-23); en
  esta entrega solo se valida. El CIF no se muestra en el listado: es un dato de la ficha.
- 006-products-placeholder y 007-customers-placeholder ya están en `develop`: Proveedores sigue su mismo patrón de
  pantalla provisional (aviso, error, criterios en la dirección y contrato del listado).
- Los proveedores se cargarán en una spec futura de migración desde la base de datos antigua.
- Fuera de alcance: alta y edición de proveedores; ficha lateral con datos (CIF, pedido mínimo), productos asociados,
  pedido de compra sugerido y «Generar pedido de compra»; compras; migración de datos; exportar el listado.
