# Feature Specification: Pantalla provisional de Productos

**Feature Branch**: `006-products-placeholder`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Pantalla provisional de Productos en la aplicación B2B de venta a mayoristas (web y
escritorio). Hoy Productos aparece en el menú como «Pendiente» y no se puede abrir. Se quiere que se pueda abrir,
con la estructura del diseño «Albarán» (búsqueda, filtros por categoría, subcategoría, proveedor y «solo stock
bajo», y listado con stock/mínimo, precio y estado). El catálogo real se cargará en el futuro desde una base de
datos antigua, así que en esta entrega la pantalla pide el listado al servidor y el servidor responde siempre con
un listado vacío, sin leer la base de datos. Historias: 1) Un usuario cuyo rol tiene acceso a Productos (ver o
editar, según la matriz de permisos) lo abre desde el menú y ve la estructura de la pantalla. 2) Con el listado
vacío, ve un aviso claro de que todavía no hay productos porque se cargarán desde el sistema anterior. 3) Si el
servidor no responde o devuelve un error, ve un mensaje de error distinto del aviso de «sin datos». Reglas:
Productos pasa a ser un módulo implementado (se activa en el menú y se puede elegir como pantalla de inicio); los
roles sin acceso no lo ven; la búsqueda y los filtros se envían al servidor, que los valida y responde igualmente
con un listado vacío, para fijar desde ya el contrato del listado; los botones de acción del diseño, como
«Importar CSV» y «Nuevo producto», no se muestran. Fuera de alcance: alta, edición y borrado de productos,
importar CSV, migración de datos, ficha de producto, tarifas y stock reales."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir Productos y ver su estructura (Priority: P1) 🎯 MVP

Un usuario cuyo rol tiene acceso a Productos (editar o solo ver, según la matriz de permisos) pulsa Productos en
el menú, que ya no aparece como «Pendiente», y llega a la pantalla de Productos. Ve el título, el número de
referencias, la búsqueda, los filtros (categoría, subcategoría, proveedor y «solo stock bajo») y el listado con
sus columnas (código, producto, categoría, stock / mínimo, precio y estado), tal como los define el diseño
«Albarán». Al entrar, la pantalla pide el listado al servidor.

**Why this priority**: es la base de la feature. Sin una pantalla accesible no hay dónde mostrar los avisos ni
dónde cargar el catálogo cuando se migre, y deja fijado cómo se pide el listado.

**Independent Test**: con un usuario Almacén (editar) y otro Comercial (solo ver), se pulsa Productos en el menú
y se comprueba que se abre la pantalla con su título, la búsqueda, los cuatro filtros y las cabeceras del
listado, y que se ha hecho la petición del listado al servidor.

**Acceptance Scenarios**:

1. **Given** un usuario cuyo rol puede ver o editar Productos, **When** mira el menú, **Then** Productos aparece
   como enlace normal, sin la marca «Pendiente».
2. **Given** ese usuario, **When** pulsa Productos, **Then** se abre la pantalla de Productos y el menú marca
   Productos como activo.
3. **Given** la pantalla de Productos, **When** termina de cargar, **Then** se ven el título, el número de
   referencias (0), la búsqueda, los filtros de categoría, subcategoría, proveedor y «solo stock bajo», y las
   cabeceras del listado.
4. **Given** la pantalla de Productos, **When** el usuario mira las acciones, **Then** no aparecen «Importar CSV»,
   «Nuevo producto» ni acciones por fila.
5. **Given** un usuario cuyo rol puede ver Productos, **When** va a Ajustes › Apariencia, **Then** puede elegir
   Productos como pantalla de inicio.
6. **Given** un usuario cuyo rol no tiene acceso a Productos, **When** mira el menú o intenta abrir la pantalla por
   dirección, **Then** Productos no aparece y no puede abrirla.
7. **Given** una pantalla estrecha, **When** el usuario abre Productos, **Then** la estructura se adapta a la
   versión móvil del diseño (listado en tarjetas en lugar de tabla).

---

### User Story 2 - Entender que el catálogo aún no está cargado (Priority: P1)

Con el listado vacío, el usuario ve en lugar de las filas un aviso claro: todavía no hay productos porque el
catálogo se cargará desde el sistema anterior. Puede escribir una búsqueda o cambiar los filtros: la pantalla
vuelve a pedir el listado al servidor con esos criterios y el resultado sigue vacío, con el mismo aviso.

**Why this priority**: sin el aviso, una pantalla vacía parece un fallo o un catálogo borrado. Es lo que hace que
la pantalla provisional sea comprensible.

**Independent Test**: se abre Productos, se comprueba que aparece el aviso de catálogo pendiente de carga, se
busca un texto, se marca «solo stock bajo» y se comprueba que en cada cambio se pide el listado al servidor con
los nuevos criterios y que el aviso sigue visible.

**Acceptance Scenarios**:

1. **Given** el servidor devuelve un listado vacío, **When** se carga la pantalla, **Then** el usuario ve un aviso
   que dice que todavía no hay productos porque se cargarán desde el sistema anterior, y no ve filas ni
   paginación.
2. **Given** la pantalla con el aviso, **When** el usuario escribe en la búsqueda, **Then** la pantalla pide el
   listado al servidor con ese texto y sigue mostrando el mismo aviso.
3. **Given** la pantalla con el aviso, **When** el usuario cambia un filtro o marca «solo stock bajo», **Then** la
   pantalla pide el listado al servidor con los criterios elegidos y sigue mostrando el mismo aviso.
4. **Given** la petición en curso, **When** el usuario mira la pantalla, **Then** ve que se está cargando, sin que
   aparezca antes de tiempo el aviso de «sin datos».
5. **Given** un lector de pantalla, **When** termina la carga, **Then** se anuncia el aviso de catálogo pendiente
   de carga.

---

### User Story 3 - Distinguir un error del catálogo vacío (Priority: P2)

Si el servidor no responde o devuelve un error, el usuario ve un mensaje de error comprensible, distinto del
aviso de catálogo pendiente de carga, y puede volver a intentarlo sin salir de la pantalla.

**Why this priority**: evita que un fallo de conexión se confunda con un catálogo vacío. Con datos reales será
imprescindible, pero en esta entrega el listado siempre está vacío.

**Independent Test**: con el servidor detenido o devolviendo un error, se abre Productos y se comprueba que
aparece el mensaje de error (no el aviso de catálogo pendiente) y que «Reintentar» vuelve a pedir el listado;
con el servidor de nuevo disponible, aparece el aviso de catálogo pendiente.

**Acceptance Scenarios**:

1. **Given** el servidor no responde, **When** se carga la pantalla, **Then** el usuario ve un mensaje que dice
   que no se ha podido cargar el listado de productos, con la opción «Reintentar», y no ve el aviso de catálogo
   pendiente.
2. **Given** el servidor devuelve un error, **When** se carga la pantalla, **Then** el usuario ve el mismo mensaje
   de error, sin detalles técnicos.
3. **Given** el mensaje de error, **When** el usuario pulsa «Reintentar» y el servidor ya responde, **Then**
   desaparece el error y se muestra el aviso de catálogo pendiente.
4. **Given** el mensaje de error, **When** el usuario lo mira, **Then** el error se entiende por el texto, no solo
   por el color, y los lectores de pantalla lo anuncian.

---

### Edge Cases

- Búsqueda con espacios al principio o al final: se ignoran; una búsqueda solo de espacios equivale a no buscar.
- Búsqueda más larga de lo permitido: la pantalla no deja escribir más del máximo y el servidor rechaza un texto
  más largo con un error de validación.
- Criterios no válidos enviados al servidor (filtro con un valor inexistente, página negativa…): el servidor los
  rechaza con un error de validación y la pantalla muestra el mensaje de error de la historia 3.
- Varias peticiones seguidas al escribir rápido: la pantalla muestra solo el resultado de la última y no lanza una
  petición por cada tecla.
- Selectores de categoría, subcategoría y proveedor: sin catálogo no hay opciones reales; solo ofrecen «Todas» o
  «Todos».
- La sesión caduca mientras se pide el listado: se aplica el comportamiento de sesión caducada de
  001-user-login.
- El rol del usuario pierde el acceso a Productos con la pantalla abierta: en cuanto la sesión recoge el cambio
  (máximo 15 minutos, 003-user-management) el menú deja de mostrar Productos y una nueva petición del listado se
  rechaza por falta de permiso.
- Un usuario tenía Productos como pantalla de inicio de antes de 005: vuelve a funcionar como pantalla de inicio.
- Escritorio sin conexión con su base de datos: la pantalla se comporta igual que con un error del servidor (no
  hay modo sin conexión, 002-desktop-local-backend).

## Requirements *(mandatory)*

### Functional Requirements

**Acceso**

- **FR-001**: Productos MUST pasar a ser un módulo implementado: el menú MUST mostrarlo como enlace normal, sin la
  marca «Pendiente», y el selector de pantalla de inicio de 004-appearance-preferences MUST ofrecerlo a los roles
  que pueden verlo.
- **FR-002**: La pantalla de Productos MUST estar disponible en la web y en el escritorio, solo con sesión
  iniciada, y solo para los roles con permiso de editar o de solo ver Productos según la matriz de permisos de
  003-user-management. Los demás roles NEVER MUST verla ni en el menú ni por dirección.
- **FR-003**: En esta entrega, los permisos de editar y de solo ver MUST mostrar la misma pantalla, porque no hay
  acciones de edición.

**Estructura de la pantalla**

- **FR-004**: La pantalla MUST mostrar el título «Productos», el número de referencias del listado, una búsqueda
  por texto, los filtros de categoría, subcategoría, proveedor y «solo stock bajo», y el listado con las columnas
  del diseño «Albarán»: código, producto (con su proveedor), categoría › subcategoría, stock / mínimo, precio y
  estado.
- **FR-005**: La pantalla NEVER MUST mostrar «Importar CSV», «Nuevo producto», la columna de acciones ni acciones
  por fila o por tarjeta.
- **FR-006**: Mientras no haya catálogo, los filtros de categoría y subcategoría MUST ofrecer solo «Todas», y el
  de proveedor solo «Todos». La búsqueda y «solo stock bajo» MUST poder usarse.
- **FR-007**: Con el listado vacío, la paginación NEVER MUST mostrarse.

**Listado y criterios**

- **FR-008**: Al abrir la pantalla, y cada vez que el usuario cambia la búsqueda o un filtro, la pantalla MUST
  pedir el listado al servidor con los criterios elegidos: texto de búsqueda, categoría, subcategoría, proveedor,
  «solo stock bajo» y página. Al escribir en la búsqueda, MUST esperar a que el usuario deje de teclear antes de
  pedirlo, y MUST mostrar solo el resultado de la última petición.
- **FR-009**: El servidor MUST exigir sesión iniciada y permiso de ver Productos para responder al listado, y MUST
  validar los criterios recibidos: texto de búsqueda de 100 caracteres como máximo (sin contar los espacios del
  principio y del final), filtros con formato válido y página entera positiva. Los criterios no válidos MUST
  rechazarse con un error de validación.
- **FR-010**: En esta entrega, el servidor MUST responder siempre a una petición válida con un listado vacío y un
  total de 0 referencias, sin leer ni escribir productos en la base de datos.
- **FR-011**: La respuesta del listado MUST tener ya la forma definitiva: los productos de la página (con los datos
  de las columnas de FR-004), el total de referencias, la página y el tamaño de página. Así, cargar el catálogo
  real no cambiará lo que recibe la pantalla.

**Estados de la pantalla**

- **FR-012**: Mientras se pide el listado, la pantalla MUST indicar que está cargando y NEVER MUST mostrar a la vez
  el aviso de «sin datos» ni el de error.
- **FR-013**: Si el listado llega vacío, la pantalla MUST mostrar, en lugar de las filas, un aviso que diga que
  todavía no hay productos porque el catálogo se cargará desde el sistema anterior. El aviso MUST ser el mismo con
  y sin búsqueda o filtros.
- **FR-014**: Si el servidor no responde o devuelve un error, la pantalla MUST mostrar un mensaje que diga que no
  se ha podido cargar el listado de productos, distinto del aviso de FR-013 y sin detalles técnicos, con una
  opción «Reintentar» que vuelve a pedir el listado con los mismos criterios.
- **FR-015**: El aviso de «sin datos» y el mensaje de error MUST entenderse por su texto, no solo por el color, y
  los lectores de pantalla MUST anunciarlos al aparecer.

**Diseño y accesibilidad**

- **FR-016**: La pantalla MUST seguir el sistema visual «Albarán» en tema claro y oscuro, respetar la densidad de
  tablas de 004-appearance-preferences y, por debajo del corte responsive, mostrar la versión móvil del diseño
  (listado en tarjetas). Los controles MUST ser operables con teclado y tener un objetivo táctil mínimo de 44 px.
- **FR-017**: Cuando el listado tenga productos (futuro), los precios MUST mostrarse con el formato de importes
  del usuario (004-appearance-preferences), y el stock y el mínimo como cantidades, nunca como importes.
- **FR-018**: El aviso de catálogo pendiente de carga y el mensaje de error no están en el lienzo «Albarán»: su
  diseño MUST definirse en `docs/design/` antes de implementarse.

### Key Entities

- **Producto (listado)**: referencia del catálogo tal como aparece en el listado. Atributos: código, nombre,
  proveedor, categoría, subcategoría (opcional), stock, stock mínimo, precio y estado (Disponible, Stock bajo o
  Sin stock). En esta entrega no hay ninguno; se define para fijar el contrato del listado.
- **Criterios del listado**: texto de búsqueda, categoría, subcategoría, proveedor, «solo stock bajo» y página.
- **Página de resultados**: productos de la página, total de referencias, página y tamaño de página.
- **Usuario, rol y permisos**: definidos en 001-user-login y 003-user-management; aquí solo se lee el permiso de
  ver Productos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario con acceso llega a la pantalla de Productos desde cualquier pantalla con un solo clic o
  toque en el menú.
- **SC-002**: El 100 % de las veces que se abre Productos, o que se cambia la búsqueda o un filtro, se pide el
  listado al servidor con los criterios elegidos.
- **SC-003**: En el 100 % de los casos, el usuario ve el aviso de catálogo pendiente de carga o el mensaje de
  error, nunca los dos a la vez ni una pantalla en blanco.
- **SC-004**: Con el servidor disponible, el aviso de catálogo pendiente aparece en menos de 2 segundos desde que
  se abre la pantalla.
- **SC-005**: El 100 % de los roles sin acceso a Productos no pueden ver la pantalla ni obtener el listado por
  ninguna vía.
- **SC-006**: En una prueba con usuarios, 9 de cada 10 entienden, sin ayuda, que el catálogo aún no se ha cargado
  y que no se trata de un error.

## Assumptions

- La sesión, la protección de pantallas y el cierre por caducidad existen (001-user-login); la matriz de permisos
  es la de 003-user-management (Productos: Administrador y Almacén editan; Comercial y Administración solo ven);
  tema, densidad, formato de importes y pantalla de inicio son los de 004-appearance-preferences; el menú y la
  regla de módulo implementado son los de 005-app-navigation.
- El escritorio usa su backend local (002-desktop-local-backend); la pantalla se comporta igual en web y
  escritorio.
- El tamaño de página es el del diseño (10 referencias), aunque en esta entrega no se llega a usar.
- La búsqueda se aplicará en el futuro sobre el código y el nombre del producto; en esta entrega solo se valida.
- El catálogo se cargará en una spec futura de migración desde la base de datos antigua, que también rellenará las
  opciones de los filtros de categoría, subcategoría y proveedor.
- Fuera de alcance: alta, edición y borrado de productos; importar CSV; migración de datos; ficha de producto;
  tarifas por tipo de cliente; stock y precios reales; exportar el listado.
