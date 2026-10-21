# Feature Specification: Pantalla provisional de Clientes

**Feature Branch**: `007-customers-placeholder`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "Pantalla provisional de Clientes en la aplicación B2B de venta a mayoristas (web y
escritorio). Hoy Clientes aparece en el menú como «Pendiente» y no se puede abrir. Se quiere que se pueda abrir,
con la estructura del diseño «Albarán» (búsqueda y listado de clientes mayoristas con riesgo usado y saldo
pendiente). La cartera real se cargará en el futuro desde una base de datos antigua, así que en esta entrega la
pantalla pide el listado al servidor y el servidor responde siempre con un listado vacío, sin leer la base de
datos. Historias: 1) Un usuario cuyo rol tiene acceso a Clientes (Administrador, Comercial y Administración según
la matriz de permisos; Almacén no) lo abre desde el menú y ve la estructura de la pantalla. 2) Con el listado
vacío, ve un aviso claro de que todavía no hay clientes porque se cargarán desde el sistema anterior. 3) Si el
servidor no responde o devuelve un error, ve un mensaje de error distinto del aviso de «sin datos». Reglas:
Clientes pasa a ser un módulo implementado (se activa en el menú y se puede elegir como pantalla de inicio); los
roles sin acceso no lo ven; la búsqueda se envía al servidor, que la valida y responde igualmente con un listado
vacío, para fijar desde ya el contrato del listado; los botones de acción del diseño, como «Nuevo cliente», no se
muestran. Fuera de alcance: alta y edición de clientes, ficha lateral con historial reciente, condiciones
comerciales y migración de datos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir Clientes y ver su estructura (Priority: P1) 🎯 MVP

Un usuario cuyo rol tiene acceso a Clientes (Administrador, Comercial y Administración, según la matriz de
permisos) pulsa Clientes en el menú, que ya no aparece como «Pendiente», y llega a la pantalla de Clientes. Ve el
título, el número de fichas, la búsqueda de clientes y el listado con sus columnas (cliente con su población,
riesgo usado, saldo y último pedido), tal como los define el diseño «Albarán». Al entrar, la pantalla pide el
listado al servidor.

**Why this priority**: es la base de la feature. Sin una pantalla accesible no hay dónde mostrar los avisos ni
dónde cargar la cartera cuando se migre, y deja fijado cómo se pide el listado.

**Independent Test**: con un usuario Comercial (editar) y otro de Administración (solo ver), se pulsa Clientes en
el menú y se comprueba que se abre la pantalla con su título, la búsqueda y las cabeceras del listado, y que se ha
hecho la petición del listado al servidor. Con un usuario Almacén se comprueba que Clientes no aparece.

**Acceptance Scenarios**:

1. **Given** un usuario cuyo rol puede ver o editar Clientes, **When** mira el menú, **Then** Clientes aparece
   como enlace normal, sin la marca «Pendiente».
2. **Given** ese usuario, **When** pulsa Clientes, **Then** se abre la pantalla de Clientes y el menú marca
   Clientes como activo.
3. **Given** la pantalla de Clientes, **When** termina de cargar, **Then** se ven el título, el número de fichas
   (0), la búsqueda de clientes y las cabeceras del listado.
4. **Given** la pantalla de Clientes, **When** el usuario mira las acciones, **Then** no aparecen «Nuevo cliente»,
   la ficha lateral ni sus acciones («Nueva venta», «Editar ficha», «Ver ventas»).
5. **Given** un usuario cuyo rol puede ver Clientes, **When** va a Ajustes › Apariencia, **Then** puede elegir
   Clientes como pantalla de inicio.
6. **Given** un usuario Almacén (sin acceso a Clientes), **When** mira el menú o intenta abrir la pantalla por
   dirección, **Then** Clientes no aparece y no puede abrirla.
7. **Given** una pantalla estrecha, **When** el usuario abre Clientes, **Then** la estructura se adapta a la
   versión móvil del diseño (listado en tarjetas en lugar de tabla).

---

### User Story 2 - Entender que la cartera aún no está cargada (Priority: P1)

Con el listado vacío, el usuario ve en lugar de las filas un aviso claro: todavía no hay clientes porque la cartera
se cargará desde el sistema anterior. Puede escribir una búsqueda: la pantalla vuelve a pedir el listado al
servidor con ese texto y el resultado sigue vacío, con el mismo aviso.

**Why this priority**: sin el aviso, una pantalla vacía parece un fallo o una cartera borrada. Es lo que hace que
la pantalla provisional sea comprensible.

**Independent Test**: se abre Clientes, se comprueba que aparece el aviso de cartera pendiente de carga, se busca
un texto y se comprueba que se pide el listado al servidor con ese texto y que el aviso sigue visible.

**Acceptance Scenarios**:

1. **Given** el servidor devuelve un listado vacío, **When** se carga la pantalla, **Then** el usuario ve un aviso
   que dice que todavía no hay clientes porque se cargarán desde el sistema anterior, y no ve filas ni
   paginación.
2. **Given** la pantalla con el aviso, **When** el usuario escribe en la búsqueda, **Then** la pantalla pide el
   listado al servidor con ese texto y sigue mostrando el mismo aviso (no el de «ningún cliente coincide»).
3. **Given** la petición en curso, **When** el usuario mira la pantalla, **Then** ve que se está cargando, sin que
   aparezca antes de tiempo el aviso de «sin datos».
4. **Given** un lector de pantalla, **When** termina la carga, **Then** se anuncia el aviso de cartera pendiente
   de carga.

---

### User Story 3 - Distinguir un error de la cartera vacía (Priority: P2)

Si el servidor no responde o devuelve un error, el usuario ve un mensaje de error comprensible, distinto del
aviso de cartera pendiente de carga, y puede volver a intentarlo sin salir de la pantalla.

**Why this priority**: evita que un fallo de conexión se confunda con una cartera vacía. Con datos reales será
imprescindible, pero en esta entrega el listado siempre está vacío.

**Independent Test**: con el servidor detenido o devolviendo un error, se abre Clientes y se comprueba que
aparece el mensaje de error (no el aviso de cartera pendiente) y que «Reintentar» vuelve a pedir el listado; con
el servidor de nuevo disponible, aparece el aviso de cartera pendiente.

**Acceptance Scenarios**:

1. **Given** el servidor no responde, **When** se carga la pantalla, **Then** el usuario ve un mensaje que dice
   que no se ha podido cargar el listado de clientes, con la opción «Reintentar», y no ve el aviso de cartera
   pendiente.
2. **Given** el servidor devuelve un error, **When** se carga la pantalla, **Then** el usuario ve el mismo mensaje
   de error, sin detalles técnicos.
3. **Given** el mensaje de error, **When** el usuario pulsa «Reintentar» y el servidor ya responde, **Then**
   desaparece el error y se muestra el aviso de cartera pendiente.
4. **Given** el mensaje de error, **When** el usuario lo mira, **Then** el error se entiende por el texto, no solo
   por el color, y los lectores de pantalla lo anuncian.

---

### Edge Cases

- Búsqueda con espacios al principio o al final: se ignoran; una búsqueda solo de espacios equivale a no buscar.
- Búsqueda más larga de lo permitido: la pantalla no deja escribir más del máximo y el servidor rechaza un texto
  más largo con un error de validación.
- Criterios no válidos enviados al servidor (página negativa, texto demasiado largo…): el servidor los rechaza con
  un error de validación y la pantalla muestra el mensaje de error de la historia 3.
- Varias peticiones seguidas al escribir rápido: la pantalla muestra solo el resultado de la última y no lanza una
  petición por cada tecla.
- La sesión caduca mientras se pide el listado: se aplica el comportamiento de sesión caducada de
  001-user-login.
- El rol del usuario pierde el acceso a Clientes con la pantalla abierta: en cuanto la sesión recoge el cambio
  (máximo 15 minutos, 003-user-management) el menú deja de mostrar Clientes y una nueva petición del listado se
  rechaza por falta de permiso.
- Un usuario tenía Clientes como pantalla de inicio de antes de 005: vuelve a funcionar como pantalla de inicio.
- Un usuario Almacén tenía Clientes como pantalla de inicio: se aplica la regla de pantalla no disponible de
  004-appearance-preferences.
- Escritorio sin conexión con su base de datos: la pantalla se comporta igual que con un error del servidor (no
  hay modo sin conexión, 002-desktop-local-backend).

## Requirements *(mandatory)*

### Functional Requirements

**Acceso**

- **FR-001**: Clientes MUST pasar a ser un módulo implementado: el menú MUST mostrarlo como enlace normal, sin la
  marca «Pendiente», y el selector de pantalla de inicio de 004-appearance-preferences MUST ofrecerlo a los roles
  que pueden verlo.
- **FR-002**: La pantalla de Clientes MUST estar disponible en la web y en el escritorio, solo con sesión
  iniciada, y solo para los roles con permiso de editar o de solo ver Clientes según la matriz de permisos de
  003-user-management. Los demás roles NEVER MUST verla ni en el menú ni por dirección.
- **FR-003**: En esta entrega, los permisos de editar y de solo ver MUST mostrar la misma pantalla, porque no hay
  acciones de edición.

**Estructura de la pantalla**

- **FR-004**: La pantalla MUST mostrar el título «Clientes», el número de fichas del listado, una búsqueda de
  clientes por texto y el listado con las columnas del diseño «Albarán»: cliente (con su población), riesgo usado
  (porcentaje del riesgo máximo), saldo pendiente y fecha del último pedido.
- **FR-005**: La pantalla NEVER MUST mostrar «Nuevo cliente», la ficha lateral de cliente ni sus acciones
  («Nueva venta», «Editar ficha», «Ver ventas»).
- **FR-006**: Con el listado vacío, la paginación NEVER MUST mostrarse.

**Listado y criterios**

- **FR-007**: Al abrir la pantalla, y cada vez que el usuario cambia la búsqueda, la pantalla MUST pedir el
  listado al servidor con los criterios elegidos: texto de búsqueda y página. Al escribir en la búsqueda, MUST
  esperar a que el usuario deje de teclear antes de pedirlo, y MUST mostrar solo el resultado de la última
  petición.
- **FR-008**: El servidor MUST exigir sesión iniciada y permiso de ver Clientes para responder al listado, y MUST
  validar los criterios recibidos: texto de búsqueda de 100 caracteres como máximo (sin contar los espacios del
  principio y del final) y página entera positiva. Los criterios no válidos MUST rechazarse con un error de
  validación.
- **FR-009**: En esta entrega, el servidor MUST responder siempre a una petición válida con un listado vacío y un
  total de 0 fichas, sin leer ni escribir clientes en la base de datos.
- **FR-010**: La respuesta del listado MUST tener ya la forma definitiva: los clientes de la página (con los datos
  de las columnas de FR-004), el total de fichas, la página y el tamaño de página. Así, cargar la cartera real no
  cambiará lo que recibe la pantalla.

**Estados de la pantalla**

- **FR-011**: Mientras se pide el listado, la pantalla MUST indicar que está cargando y NEVER MUST mostrar a la vez
  el aviso de «sin datos» ni el de error.
- **FR-012**: Si el listado llega vacío, la pantalla MUST mostrar, en lugar de las filas, un aviso que diga que
  todavía no hay clientes porque la cartera se cargará desde el sistema anterior. El aviso MUST ser el mismo con y
  sin búsqueda.
- **FR-013**: Si el servidor no responde o devuelve un error, la pantalla MUST mostrar un mensaje que diga que no
  se ha podido cargar el listado de clientes, distinto del aviso de FR-012 y sin detalles técnicos, con una opción
  «Reintentar» que vuelve a pedir el listado con los mismos criterios.
- **FR-014**: El aviso de «sin datos» y el mensaje de error MUST entenderse por su texto, no solo por el color, y
  los lectores de pantalla MUST anunciarlos al aparecer.

**Diseño y accesibilidad**

- **FR-015**: La pantalla MUST seguir el sistema visual «Albarán» en tema claro y oscuro, respetar la densidad de
  tablas de 004-appearance-preferences y, por debajo del corte responsive, mostrar la versión móvil del diseño
  (listado en tarjetas). Los controles MUST ser operables con teclado y tener un objetivo táctil mínimo de 44 px.
- **FR-016**: Cuando el listado tenga clientes (futuro), el saldo pendiente MUST mostrarse con el formato de
  importes del usuario (004-appearance-preferences), y el riesgo usado como porcentaje con el semáforo de umbrales
  del diseño, nunca como importe.
- **FR-017**: Si el aviso de pantalla vacía y el mensaje de error ya se diseñan para Productos
  (006-products-placeholder), Clientes MUST reutilizar el mismo diseño cambiando solo el texto; si no, su diseño
  MUST definirse en `docs/design/` antes de implementarse.

### Key Entities

- **Cliente (listado)**: cliente mayorista tal como aparece en el listado. Atributos: nombre, población, riesgo
  máximo, saldo pendiente, riesgo usado (saldo pendiente sobre riesgo máximo, en porcentaje) y fecha del último
  pedido (opcional). En esta entrega no hay ninguno; se define para fijar el contrato del listado.
- **Criterios del listado**: texto de búsqueda y página.
- **Página de resultados**: clientes de la página, total de fichas, página y tamaño de página.
- **Usuario, rol y permisos**: definidos en 001-user-login y 003-user-management; aquí solo se lee el permiso de
  ver Clientes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario con acceso llega a la pantalla de Clientes desde cualquier pantalla con un solo clic o
  toque en el menú.
- **SC-002**: El 100 % de las veces que se abre Clientes, o que se cambia la búsqueda, se pide el listado al
  servidor con los criterios elegidos.
- **SC-003**: En el 100 % de los casos, el usuario ve el aviso de cartera pendiente de carga o el mensaje de
  error, nunca los dos a la vez ni una pantalla en blanco.
- **SC-004**: Con el servidor disponible, el aviso de cartera pendiente aparece en menos de 2 segundos desde que
  se abre la pantalla.
- **SC-005**: El 100 % de los usuarios Almacén (y de cualquier rol sin acceso) no pueden ver la pantalla ni
  obtener el listado por ninguna vía.
- **SC-006**: En una prueba con usuarios, 9 de cada 10 entienden, sin ayuda, que la cartera aún no se ha cargado
  y que no se trata de un error.

## Assumptions

- La sesión, la protección de pantallas y el cierre por caducidad existen (001-user-login); la matriz de permisos
  es la de 003-user-management (Clientes: Administrador y Comercial editan; Administración solo ve; Almacén sin
  acceso); tema, densidad, formato de importes y pantalla de inicio son los de 004-appearance-preferences; el menú
  y la regla de módulo implementado son los de 005-app-navigation.
- El escritorio usa su backend local (002-desktop-local-backend); la pantalla se comporta igual en web y
  escritorio.
- El tamaño de página es el del diseño (8 fichas), aunque en esta entrega no se llega a usar.
- La búsqueda se aplicará en el futuro sobre el nombre y la población del cliente; en esta entrega solo se
  valida.
- Esta spec es independiente de 006-products-placeholder; si 006 se implementa antes, Clientes sigue su mismo
  patrón de pantalla provisional (aviso, error y contrato del listado).
- La cartera se cargará en una spec futura de migración desde la base de datos antigua.
- Fuera de alcance: alta y edición de clientes; ficha lateral con datos de contacto e historial reciente;
  condiciones comerciales y tarifas; migración de datos; exportar el listado.
