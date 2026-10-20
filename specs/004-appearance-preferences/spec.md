# Feature Specification: Preferencias personales (Ajustes › Apariencia)

**Feature Branch**: `004-appearance-preferences`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Preferencias personales en Ajustes › Apariencia de la aplicación B2B de venta a
mayoristas. Cualquier usuario con sesión iniciada configura su propia apariencia. Se guarda por usuario y se
aplica en la web y en el escritorio, en cuanto la cambia y en sus próximas sesiones. Historias: 1) Tema: Claro
(por defecto), Oscuro o Según el sistema, que sigue en vivo la configuración del equipo. 2) Densidad de tablas:
Cómoda (por defecto) o Compacta. 3) Formato de importes: "1.248,50 €" (por defecto) o "€ 1,248.50". Se aplica a
todas las cifras monetarias de la aplicación. 4) Pantalla de inicio: el usuario la elige entre las pantallas
existentes a las que su rol tiene acceso. Por defecto es Productos mientras no exista el Panel. Si pierde el
acceso a la pantalla elegida, se usa la pantalla por defecto. Fuera de alcance: color de acento, idioma,
preferencias globales de empresa."

## Clarifications

### Session 2026-10-16

- Q: ¿Qué separador decimal acepta un campo de importe de un formulario? → A: El del formato elegido: coma con
  "1.248,50 €" y punto con "€ 1,248.50"; el valor guardado no depende del formato.
- Q: ¿Con qué tema se muestra la pantalla de inicio de sesión, antes de saber quién es el usuario? → A: Con el
  último tema usado en ese equipo, o Claro si no hay ninguno.

### Session 2026-10-19

- Q: ¿Qué pantallas cuentan como «existentes» para el selector de pantalla de inicio, si hoy las de negocio
  son provisionales? → A: Toda pantalla con ruta en la aplicación, aunque su contenido sea provisional
  (Ventas, Clientes, Productos, Proveedores y Cobros); el Panel se añade cuando exista.
- Q: ¿A qué pantalla va un usuario cuyo rol no tiene acceso a la pantalla por defecto? → A: A la primera
  pantalla permitida para su rol, por orden (Ventas, Clientes, Productos, Proveedores, Cobros); si no tiene
  ninguna, a Ajustes › Apariencia.
- Q: ¿Una preferencia cambiada en otro equipo se aplica sola al renovarse la sesión en segundo plano? → A: No;
  solo al recargar o al iniciar sesión. La renovación en segundo plano no toca las preferencias aplicadas.
- Q: ¿Cómo se vuelve a intentar guardar una preferencia que no se pudo guardar? → A: Solo con el aviso; para
  reintentar, el usuario vuelve a elegir la opción (aunque ya esté marcada).
- Q: ¿Los campos de importe aceptan más de dos decimales? → A: No; como mucho 2 decimales. Un valor con más se
  rechaza indicando el formato esperado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Elegir el tema (Priority: P1)

Cualquier usuario abre Ajustes › Apariencia y elige el tema Claro, Oscuro o Según el sistema. La aplicación
cambia al momento, sin guardar aparte ni recargar, y conserva su elección en sus próximas sesiones, tanto en la
web como en el escritorio. Con "Según el sistema", la aplicación sigue en vivo el modo claro u oscuro del equipo.

**Why this priority**: es la preferencia más visible y la que más influye en la comodidad diaria (almacén con
poca luz, jornadas largas frente a la pantalla). Además, el resto de preferencias se apoyan en la misma forma de
guardar y aplicar.

**Independent Test**: un usuario elige Oscuro, cierra sesión, entra desde el otro canal (web o escritorio) y
comprueba que la aplicación aparece en oscuro; después elige Según el sistema, cambia el modo del sistema
operativo y comprueba que la aplicación cambia sin intervenir.

**Acceptance Scenarios**:

1. **Given** un usuario que nunca ha cambiado el tema, **When** entra en la aplicación, **Then** se muestra en
   tema Claro y en Ajustes › Apariencia aparece marcado "Claro".
2. **Given** un usuario en Ajustes › Apariencia, **When** elige "Oscuro", **Then** toda la aplicación pasa a tema
   oscuro de inmediato, sin recargar ni pulsar "Guardar".
3. **Given** un usuario que eligió "Oscuro" en la web, **When** inicia sesión en el escritorio (o al revés),
   **Then** la aplicación se muestra en tema oscuro.
4. **Given** un usuario con "Según el sistema" y el equipo en modo claro, **When** el equipo pasa a modo oscuro
   con la aplicación abierta, **Then** la aplicación cambia a oscuro sin recargar ni intervención del usuario.
5. **Given** dos usuarios que comparten el mismo equipo con temas distintos, **When** cada uno inicia sesión,
   **Then** cada uno ve su propio tema.

---

### User Story 2 - Elegir la pantalla de inicio (Priority: P2)

El usuario elige con qué pantalla empieza al iniciar sesión, entre las pantallas que existen y a las que su rol
tiene acceso. Si deja de tener acceso a la pantalla elegida (por ejemplo, porque le cambian el rol), empieza en
la pantalla por defecto.

**Why this priority**: ahorra un paso cada día a quien siempre trabaja en el mismo módulo, pero la aplicación es
usable sin ello.

**Independent Test**: un Comercial elige Ventas como inicio, cierra sesión y vuelve a entrar llegando a Ventas;
después un Administrador le cambia el rol a uno sin acceso a Ventas y al volver a entrar llega a la pantalla por
defecto.

**Acceptance Scenarios**:

1. **Given** un usuario en Ajustes › Apariencia, **When** abre el selector de pantalla de inicio, **Then** solo
   aparecen las pantallas ya disponibles en la aplicación a las que su rol tiene acceso (editar o solo ver).
2. **Given** un usuario que eligió "Clientes" como inicio, **When** inicia sesión sin haber intentado abrir otra
   pantalla concreta, **Then** llega a Clientes.
3. **Given** un usuario que nunca eligió pantalla de inicio, **When** inicia sesión, **Then** llega a la pantalla
   por defecto (Productos mientras no exista el Panel).
4. **Given** un usuario cuya pantalla elegida ya no está permitida para su rol, **When** inicia sesión, **Then**
   llega a la pantalla por defecto y en Ajustes › Apariencia aparece seleccionada la pantalla por defecto.
5. **Given** un usuario que intentaba abrir una pantalla concreta antes de identificarse, **When** inicia sesión,
   **Then** llega a esa pantalla y no a su pantalla de inicio (regla de 001-user-login).

---

### User Story 3 - Elegir el formato de importes (Priority: P2)

El usuario elige cómo se muestran los importes: "1.248,50 €" (por defecto) o "€ 1,248.50". El formato se aplica a
todas las cifras monetarias que muestra la aplicación.

**Why this priority**: afecta a la lectura de precios, ventas y cobros, que es el núcleo del negocio, pero el
formato por defecto ya es el habitual en España.

**Independent Test**: se elige "€ 1,248.50" y se recorren las pantallas con importes (listados, fichas, totales)
comprobando que todos usan ese formato; se vuelve al formato por defecto y se comprueba lo mismo.

**Acceptance Scenarios**:

1. **Given** un usuario que nunca ha cambiado el formato, **When** ve un importe de mil doscientos cuarenta y
   ocho euros con cincuenta, **Then** se muestra "1.248,50 €".
2. **Given** un usuario que elige "€ 1,248.50", **When** vuelve a cualquier pantalla con importes, **Then** todos
   se muestran con ese formato, incluidos totales y negativos (por ejemplo "€ -35.00" frente a "-35,00 €").
3. **Given** cualquier formato elegido, **When** se muestra un importe, **Then** siempre lleva dos decimales y el
   símbolo del euro.
4. **Given** cualquier formato elegido, **When** el usuario introduce un importe en un formulario, **Then** el
   campo acepta el separador decimal del formato elegido.

---

### User Story 4 - Elegir la densidad de tablas (Priority: P3)

El usuario elige entre densidad Cómoda (por defecto) o Compacta para las tablas. En Compacta, las filas ocupan
menos alto y caben más registros en pantalla.

**Why this priority**: mejora la productividad de quien consulta listados largos, pero no cambia lo que se puede
hacer.

**Independent Test**: se elige Compacta, se abre un listado con muchos registros y se comprueba que caben más
filas en la misma pantalla que con Cómoda.

**Acceptance Scenarios**:

1. **Given** un usuario que nunca ha cambiado la densidad, **When** abre cualquier listado, **Then** se muestra
   con densidad Cómoda.
2. **Given** un usuario que elige "Compacta", **When** abre cualquier listado en pantalla de ordenador, **Then**
   se ven al menos un 25 % más de filas que con Cómoda en la misma ventana.
3. **Given** densidad Compacta, **When** se muestra un listado, **Then** los botones y controles de cada fila
   siguen teniendo el tamaño táctil mínimo del diseño.

---

### Edge Cases

- No se puede guardar la preferencia (sin conexión o error del servidor): el cambio se ve en la pantalla, se avisa
  de que no se ha podido guardar y en la próxima sesión se usa el último valor guardado.
- El mismo usuario tiene sesión abierta en dos equipos y cambia una preferencia en uno: el otro la recoge al
  recargar o al volver a iniciar sesión, nunca a mitad de la sesión (la renovación automática de la sesión no
  cambia las preferencias aplicadas).
- El equipo o navegador no informa del modo claro/oscuro con "Según el sistema": se usa el tema Claro.
- Pantalla de inicio de sesión (todavía sin usuario identificado): se muestra con el último tema usado en ese
  equipo; si no hay ninguno, con el tema Claro.
- Al iniciar sesión no debe verse un destello del tema equivocado antes de aplicar el del usuario.
- La cuenta inicial "admin" también puede cambiar sus preferencias; desaparecen con ella al crear el primer
  usuario real.
- Se crea una pantalla nueva (por ejemplo, el Panel): pasa a aparecer en el selector para los roles con acceso, y
  los usuarios que no eligieron ninguna empiezan en la nueva pantalla por defecto.
- Un rol sin acceso a la pantalla por defecto (por ejemplo, uno creado en la base de datos que solo ve Ventas):
  empieza en la primera pantalla permitida para su rol o, si no tiene ninguna, en Ajustes › Apariencia.
- Importes muy grandes o con más de dos decimales almacenados: se muestran redondeados a dos decimales con
  separador de miles en ambos formatos.

## Requirements *(mandatory)*

### Functional Requirements

**General**

- **FR-001**: Todo usuario con sesión iniciada, de cualquier rol, MUST poder abrir Ajustes › Apariencia y cambiar
  sus propias preferencias. NEVER MUST poder ver ni cambiar las de otro usuario.
- **FR-002**: Cada preferencia MUST aplicarse en cuanto el usuario la cambia, sin botón "Guardar" ni recarga, y
  MUST guardarse asociada al usuario.
- **FR-003**: Las preferencias guardadas MUST aplicarse al iniciar sesión, en la web y en el escritorio, en
  cualquier equipo.
- **FR-004**: Si una preferencia no se puede guardar, el sistema MUST avisar al usuario y MUST NOT dar el cambio
  por guardado. No hay reintento automático ni botón aparte: volver a elegir la opción, aunque ya esté marcada,
  MUST intentar guardarla de nuevo.

**Tema**

- **FR-005**: El usuario MUST poder elegir entre Claro (por defecto), Oscuro y Según el sistema, con los colores
  del diseño «Albarán» para cada tema.
- **FR-006**: Con "Según el sistema", la aplicación MUST seguir en vivo el modo claro u oscuro del equipo, sin
  recargar. Si el equipo no informa del modo, MUST usar Claro.
- **FR-007**: La pantalla de inicio de sesión MUST mostrarse con el último tema usado en ese equipo (si fue "Según
  el sistema", siguiendo el modo del equipo), o con Claro si no hay ninguno, también tras cerrar sesión. Al entrar
  MUST aplicarse el tema del usuario sin mostrar antes otro distinto. En el equipo solo se recuerda el tema, nunca
  quién lo usó.

**Densidad de tablas**

- **FR-008**: El usuario MUST poder elegir densidad Cómoda (por defecto) o Compacta, que se aplica a todas las
  tablas de la aplicación.
- **FR-009**: La densidad Compacta MUST mostrar al menos un 25 % más de filas en el mismo espacio que la Cómoda y
  MUST mantener el tamaño táctil mínimo de los controles.

**Formato de importes**

- **FR-010**: El usuario MUST poder elegir entre "1.248,50 €" (por defecto: punto de miles, coma decimal, símbolo
  detrás con espacio) y "€ 1,248.50" (coma de miles, punto decimal, símbolo delante con espacio).
- **FR-011**: El formato elegido MUST aplicarse a todas las cifras monetarias que muestra la aplicación (listados,
  fichas, formularios, totales y resúmenes), siempre con dos decimales y signo menos en los negativos.
- **FR-012**: Los campos de importe de los formularios MUST aceptar el separador decimal del formato elegido (coma
  con "1.248,50 €", punto con "€ 1,248.50"), con el separador de miles de ese formato opcional y como mucho 2
  decimales. Un valor que no encaje en el formato elegido (incluido uno con más de 2 decimales) MUST rechazarse
  indicando el formato esperado, nunca interpretarse ni redondearse de otra forma.
  El valor guardado MUST ser el mismo sea cual sea el formato con el que se introdujo.
- **FR-013**: El formato de importes NEVER MUST afectar a cantidades no monetarias (unidades, stock), fechas ni
  códigos.

**Pantalla de inicio**

- **FR-014**: El selector de pantalla de inicio MUST ofrecer solo las pantallas que ya existen en la aplicación y a
  las que el rol del usuario tiene acceso (editar o solo ver) según la matriz de permisos. Una pantalla existe si
  tiene ruta en la aplicación, aunque su contenido sea todavía provisional.
- **FR-015**: La pantalla de inicio por defecto MUST ser el Panel; mientras no exista, MUST ser Productos. Si el
  rol del usuario no tiene acceso a ella, MUST usarse la primera pantalla permitida para su rol en este orden:
  Ventas, Clientes, Productos, Proveedores, Cobros; si no tiene ninguna, Ajustes › Apariencia.
- **FR-016**: Si la pantalla elegida deja de estar disponible para el usuario, el sistema MUST llevarle a la
  pantalla por defecto y MUST mostrarla como seleccionada en Ajustes › Apariencia.
- **FR-017**: La pantalla de inicio MUST respetar el orden de destino de 001-user-login: primero la pantalla que se
  intentaba abrir, después la elegida y, por último, la pantalla por defecto.

**Accesibilidad**

- **FR-018**: Todos los controles de Ajustes › Apariencia MUST estar etiquetados, ser operables con teclado,
  indicar la opción seleccionada también como texto (no solo por color) y adaptarse a móvil según el diseño
  «Albarán» (pantallas "Ajustes" y "Ajustes · móvil").

### Key Entities

- **Preferencias de apariencia**: conjunto de opciones personales de un usuario. Atributos: tema (Claro, Oscuro,
  Según el sistema), densidad de tablas (Cómoda, Compacta), formato de importes ("1.248,50 €", "€ 1,248.50") y
  pantalla de inicio (una pantalla o ninguna). Pertenece a un único usuario y tiene valores por defecto.
- **Usuario**: definido en 001-user-login y 003-user-management; aquí solo se le asocian sus preferencias.
- **Pantalla de inicio candidata**: pantalla existente de la aplicación (Panel, Ventas, Clientes, Productos,
  Proveedores, Cobros) que puede elegirse si el rol del usuario tiene acceso según la matriz de permisos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un cambio de cualquier preferencia se ve aplicado en menos de 1 segundo desde que el usuario lo
  selecciona.
- **SC-002**: En el 100 % de los inicios de sesión, en web y en escritorio, la aplicación se muestra con las
  preferencias guardadas del usuario, sin destello de otro tema.
- **SC-003**: Con "Según el sistema", la aplicación cambia de tema en menos de 2 segundos después de que cambie el
  modo del equipo.
- **SC-004**: El 100 % de las cifras monetarias de las pantallas existentes se muestran con el formato elegido.
- **SC-005**: Con densidad Compacta caben al menos un 25 % más de filas en pantalla que con Cómoda.
- **SC-006**: Ningún usuario llega nunca, como pantalla de inicio, a una pantalla a la que su rol no tiene acceso.

## Assumptions

- La autenticación, el destino tras iniciar sesión y el dato de pantalla de inicio preferida ya existen
  (001-user-login); la matriz de permisos por rol es la de 003-user-management.
- Ajustes › Apariencia es accesible a todos los roles aunque la fila "Ajustes" de la matriz sea "sin acceso" para
  los roles distintos de Administrador: esa fila se refiere a las pestañas de administración (coherente con
  003-user-management).
- Las preferencias se guardan por usuario, no por equipo: el mismo usuario ve la misma apariencia en todos sus
  equipos. Lo único que se recuerda por equipo es el último tema usado, para la pantalla de inicio de sesión.
- La densidad Compacta solo cambia las tablas en pantalla de ordenador; en móvil los listados se muestran como
  tarjetas y no cambian.
- El formato "€ 1,248.50" solo cambia la presentación: la moneda es siempre el euro y no hay conversión.
- Pantallas existentes hoy (con ruta, aunque con contenido provisional): Ventas, Clientes, Productos, Proveedores
  y Cobros. El Panel se añade al selector cuando exista su pantalla.
- Fuera de alcance: color de acento, idioma, tamaño de letra, preferencias globales de empresa y preferencias por
  equipo distintas de las del usuario.
