# Feature Specification: Menú lateral de navegación

**Feature Branch**: `005-app-navigation`

**Created**: 2026-10-20

**Status**: Draft

**Input**: User description: "Menú lateral de navegación de la aplicación de venta a mayoristas (web y
escritorio), común a todas las pantallas con sesión iniciada. 1) Enlace por módulo en el orden Ventas, Clientes,
Productos, Proveedores, Cobros y, separado al final, Ajustes; los módulos que el rol no puede ver no aparecen;
Ajustes siempre. 2) Enlace activo marcado, también para lectores de pantalla. 3) Pie con nombre, rol, canal y
"Cerrar sesión". 4) Módulos no implementados con la marca "Pendiente" y deshabilitados. 5) En pantallas anchas,
plegar a solo iconos y desplegar; el estado se recuerda en el equipo. 6) En pantallas estrechas, barra horizontal
fija arriba. Fuera de alcance: contenido de los módulos, diseño de Panel/Ventas/Nueva venta/Cobros, contadores en
los enlaces, nombre de empresa configurable y atajos de teclado."

## Clarifications

### Session 2026-10-20

- Q: Un módulo «Pendiente», ¿se puede abrir por dirección o como pantalla de inicio? → A: No, por ninguna vía.
  Por dirección se redirige a la pantalla de inicio, y el selector de pantalla de inicio de 004 solo ofrece
  módulos implementados.
- Q: Al navegar con el teclado, ¿se detiene en los módulos «Pendiente» o se los salta? → A: Se detiene: reciben
  el foco y se anuncian como no disponibles, pero activarlos no hace nada.
- Q: Sin estado recordado en el equipo, ¿cómo arranca el menú? → A: Siempre desplegado, sea cual sea el ancho
  de la ventana; después, lo último que eligió el usuario en ese equipo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegar entre los módulos de mi rol (Priority: P1)

Cualquier usuario con sesión ve, en todas las pantallas de la aplicación, un menú lateral con un enlace por cada
módulo que su rol puede ver, en este orden: Ventas, Clientes, Productos, Proveedores y Cobros. Ajustes aparece
siempre, separado al final de la lista. Pulsando un enlace pasa a ese módulo sin escribir direcciones.

**Why this priority**: sin menú no hay forma de moverse por la aplicación; es la base de todas las pantallas de
dominio que vendrán.

**Independent Test**: un Administrador y un usuario de Almacén inician sesión; cada uno ve solo los módulos que su
rol puede ver según la matriz de permisos, más Ajustes, y pulsando Ajustes llegan a Ajustes.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión, **When** abre cualquier pantalla de la aplicación, **Then** ve el menú lateral
   con los módulos en el orden Ventas, Clientes, Productos, Proveedores, Cobros y Ajustes separado al final.
2. **Given** un rol sin permiso de ver un módulo, **When** el usuario mira el menú, **Then** ese módulo no aparece
   (ni deshabilitado ni oculto a la vista pero presente para lectores de pantalla).
3. **Given** un usuario de cualquier rol, **When** mira el menú, **Then** Ajustes aparece y lleva a Ajustes.
4. **Given** la pantalla de inicio de sesión o la configuración de base de datos del escritorio, **When** se
   muestran, **Then** no aparece el menú.
5. **Given** un usuario al que un Administrador cambia el rol con la sesión abierta, **When** su sesión recoge el
   cambio, **Then** el menú muestra los módulos del nuevo rol sin cerrar sesión.

---

### User Story 2 - Saber en qué pantalla estoy (Priority: P1)

El enlace del módulo abierto aparece marcado como activo, de forma visible y anunciada por los lectores de
pantalla. En una subpantalla (por ejemplo, Ajustes › Usuarios) el activo es su módulo.

**Why this priority**: orientarse es parte de navegar; sin marca de activo el menú pierde la mitad de su función.

**Independent Test**: se abren Ajustes › Apariencia y Ajustes › Usuarios y se comprueba que en ambos casos
Ajustes aparece activo y que un lector de pantalla lo anuncia como la página actual.

**Acceptance Scenarios**:

1. **Given** el usuario en un módulo, **When** mira el menú, **Then** el enlace de ese módulo se distingue de los
   demás y solo ese enlace está marcado como activo.
2. **Given** el usuario en Ajustes › Usuarios, **When** mira el menú, **Then** el activo es Ajustes.
3. **Given** un lector de pantalla, **When** recorre el menú, **Then** anuncia el enlace activo como la página
   actual.

---

### User Story 3 - Ver quién soy y cerrar sesión (Priority: P1)

Al pie del menú se ven el nombre del usuario, su rol y el canal ("Web" o "Escritorio"), y el botón "Cerrar
sesión", que funciona igual que el cierre de sesión ya existente.

**Why this priority**: en puestos compartidos del almacén es imprescindible saber con qué cuenta se está
trabajando y poder salir desde cualquier pantalla.

**Independent Test**: un Comercial inicia sesión en la web y ve su nombre y "Comercial · Web" al pie del menú; en
el escritorio ve "Escritorio"; pulsa "Cerrar sesión" y vuelve al inicio de sesión sin poder volver atrás.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión en la web, **When** mira el pie del menú, **Then** ve su nombre, su rol y
   "Web".
2. **Given** un usuario con sesión en el escritorio, **When** mira el pie del menú, **Then** ve su nombre, su rol
   y "Escritorio".
3. **Given** cualquier pantalla con menú, **When** el usuario pulsa "Cerrar sesión", **Then** la sesión termina
   como define 001-user-login.
4. **Given** la cuenta inicial "admin", **When** mira el pie del menú, **Then** ve el nombre y el rol de esa
   cuenta.

---

### User Story 4 - Ver qué módulos están pendientes (Priority: P1)

Los módulos que todavía no están implementados aparecen en el menú con la marca "Pendiente", legible como texto, y
deshabilitados: no se pueden pulsar ni navegan. Cuando un módulo se implementa, su marca y su bloqueo desaparecen
sin cambiar nada más del menú.

**Why this priority**: hoy solo Ajustes tiene contenido real; sin la marca, el menú llevaría a pantallas vacías y
el usuario no sabría qué está disponible.

**Independent Test**: con solo Ajustes implementado, se comprueba que Ventas, Clientes, Productos, Proveedores y
Cobros (los que el rol puede ver) aparecen con "Pendiente", no responden al clic, al teclado ni al toque, y que
Ajustes funciona con normalidad.

**Acceptance Scenarios**:

1. **Given** un módulo no implementado que el rol puede ver, **When** el usuario mira el menú, **Then** el módulo
   aparece con la marca "Pendiente" escrita.
2. **Given** un módulo pendiente, **When** el usuario lo pulsa, lo toca o lo activa con el teclado, **Then** no
   cambia de pantalla.
3. **Given** un usuario que recorre el menú con el teclado, **When** llega a un módulo pendiente, **Then** el foco
   se detiene en él y el lector de pantalla lo anuncia con la palabra "Pendiente" y como no disponible.
4. **Given** un módulo que pasa a estar implementado, **When** el usuario mira el menú, **Then** el módulo aparece
   como un enlace normal, en la misma posición.
5. **Given** un módulo pendiente que el rol no puede ver, **When** el usuario mira el menú, **Then** no aparece.

---

### User Story 5 - Plegar y desplegar el menú (Priority: P2)

En pantallas anchas, el usuario puede plegar el menú a una barra estrecha de solo iconos y desplegarlo de nuevo
con un botón, para ganar espacio de trabajo. Plegado, cada icono muestra el nombre del módulo al pasar el ratón y
al recibir el foco, y siguen visibles el activo, la marca de pendiente (de forma reducida) y "Cerrar sesión". El
estado se recuerda en el propio equipo.

**Why this priority**: mejora la comodidad en listados anchos, pero el menú desplegado ya permite trabajar.

**Independent Test**: se pliega el menú, se comprueba que solo quedan iconos y el logotipo, que el nombre aparece
al pasar el ratón y al tabular, se recarga la aplicación y sigue plegado; se despliega y vuelve el menú completo.

**Acceptance Scenarios**:

1. **Given** el menú desplegado en una pantalla ancha, **When** el usuario pulsa el botón de plegar, **Then** el
   menú queda reducido a iconos y logotipo, y el contenido de la pantalla gana el espacio liberado.
2. **Given** el menú plegado, **When** el usuario pasa el ratón por un icono o le da el foco con el teclado,
   **Then** se muestra el nombre del módulo.
3. **Given** el menú plegado, **When** el usuario mira el menú, **Then** distingue el módulo activo, los módulos
   pendientes y el acceso a "Cerrar sesión".
4. **Given** el menú plegado, **When** el usuario recarga o vuelve a iniciar sesión en el mismo equipo, **Then** el
   menú sigue plegado.
5. **Given** un lector de pantalla, **When** llega al botón de plegar, **Then** anuncia si el menú está plegado o
   desplegado.

---

### User Story 6 - Navegar en pantallas estrechas (Priority: P2)

En pantallas estrechas (móvil o ventana por debajo del corte responsive del diseño), el menú pasa a ser una barra
horizontal fija arriba con desplazamiento horizontal. Se ocultan el texto de la marca y los datos del usuario,
pero "Cerrar sesión" sigue accesible. El plegado no aplica en este modo.

**Why this priority**: el diseño «Albarán» exige que la aplicación funcione en móvil, pero el uso principal es en
ordenador.

**Independent Test**: en una ventana de 390 px se comprueba que el menú es una barra superior que se mantiene al
desplazar la página, que se puede desplazar horizontalmente hasta "Cerrar sesión" y que no aparece el botón de
plegar.

**Acceptance Scenarios**:

1. **Given** una pantalla estrecha, **When** el usuario abre cualquier pantalla con menú, **Then** el menú aparece
   como barra horizontal arriba y sigue visible al desplazar el contenido.
2. **Given** más enlaces de los que caben, **When** el usuario desplaza la barra horizontalmente, **Then** llega a
   todos los módulos y a "Cerrar sesión".
3. **Given** una pantalla estrecha, **When** el usuario mira la barra, **Then** no ve el texto de la marca, ni sus
   datos, ni el botón de plegar.
4. **Given** el menú plegado en una pantalla ancha, **When** la ventana se estrecha por debajo del corte, **Then**
   se muestra la barra horizontal; al volver a ensancharla, el menú recupera el estado plegado.

---

### Edge Cases

- Se abre por dirección un módulo pendiente al que el rol tiene acceso: no se muestra; el usuario va a su
  pantalla de inicio.
- Un usuario tenía elegido como pantalla de inicio un módulo que ahora está pendiente (elegido antes de esta
  feature): se aplica la regla de pantalla no disponible de 004 y empieza en la pantalla por defecto o en la
  primera implementada que permita su rol; si no hay ninguna, en Ajustes › Apariencia.
- Mientras solo Ajustes esté implementado, todos los usuarios empiezan en Ajustes › Apariencia.
- Se intenta abrir por dirección un módulo que el rol no puede ver: se aplica la protección ya existente
  (001-user-login, 003-user-management); el menú no lo muestra.
- Un rol sin permiso de ver ningún módulo: el menú solo muestra Ajustes y el pie con el usuario.
- Varios usuarios comparten el equipo: el estado plegado o desplegado es del equipo, no de cada usuario.
- No se puede recordar el estado plegado en el equipo (almacenamiento no disponible): el menú arranca desplegado y
  el botón sigue funcionando durante la sesión.
- Nombre de usuario muy largo: se recorta sin desbordar el menú; el nombre completo sigue disponible al pasar el
  ratón y para lectores de pantalla.
- Cambio de tema con el menú abierto: el menú se adapta al momento, igual que el resto de la aplicación.
- La sesión caduca o se cierra por inactividad: el menú desaparece junto con la pantalla, como define
  001-user-login.

## Requirements *(mandatory)*

### Functional Requirements

**Contenido y permisos**

- **FR-001**: Toda pantalla con sesión iniciada MUST mostrar el menú de navegación. La pantalla de inicio de
  sesión y la configuración de base de datos del escritorio NEVER MUST mostrarlo.
- **FR-002**: El menú MUST mostrar los módulos en este orden: Ventas, Clientes, Productos, Proveedores, Cobros y,
  separado del resto al final, Ajustes.
- **FR-003**: El menú MUST mostrar solo los módulos que el rol del usuario puede ver (editar o solo ver) según la
  matriz de permisos de 003-user-management. Los módulos sin permiso NEVER MUST aparecer, ni siquiera
  deshabilitados.
- **FR-004**: Ajustes MUST aparecer para todos los roles, porque Ajustes › Apariencia es accesible a todos
  (004-appearance-preferences).
- **FR-005**: Cuando cambia el rol de un usuario con sesión abierta, el menú MUST mostrar los módulos del nuevo
  rol en cuanto la sesión recoge el cambio (máximo 15 minutos, 003-user-management), sin cerrar sesión ni
  recargar.

**Módulo activo**

- **FR-006**: El menú MUST marcar como activo el módulo de la pantalla abierta, también cuando es una subpantalla
  del módulo, de forma visible y anunciada como página actual por los lectores de pantalla. Solo un elemento
  MUST estar activo a la vez.

**Usuario y cierre de sesión**

- **FR-007**: El pie del menú MUST mostrar el nombre del usuario, el nombre de su rol y el canal ("Web" o
  "Escritorio").
- **FR-008**: El menú MUST ofrecer "Cerrar sesión", con el mismo comportamiento que define 001-user-login.

**Módulos pendientes**

- **FR-009**: Un módulo no implementado MUST mostrarse con la marca "Pendiente" escrita (no solo por color) y
  deshabilitado: NEVER MUST navegar al pulsarlo, tocarlo ni activarlo con el teclado. MUST seguir recibiendo el
  foco del teclado en su orden, y los lectores de pantalla MUST anunciarlo con su nombre, "Pendiente" y como no
  disponible.
- **FR-010**: Al implementarse un módulo, MUST mostrarse como enlace normal en su misma posición sin otros
  cambios en el menú. Qué módulos están implementados MUST estar definido en un único lugar de la aplicación.
- **FR-011**: Un módulo pendiente NEVER MUST poder abrirse por ninguna vía. Si se intenta abrir por dirección,
  el sistema MUST llevar al usuario a su pantalla de inicio. El selector de pantalla de inicio de
  004-appearance-preferences MUST ofrecer solo módulos implementados, y una pantalla de inicio que apunte a un
  módulo pendiente MUST tratarse como no disponible (regla de pantalla no disponible de 004).

**Plegado (pantallas anchas)**

- **FR-012**: En pantallas por encima del corte responsive, el usuario MUST poder plegar el menú a solo iconos y
  logotipo, y desplegarlo, con un botón que anuncia su estado (plegado o desplegado) a los lectores de pantalla.
- **FR-013**: Plegado, cada elemento MUST mostrar su nombre al pasar el ratón y al recibir el foco, y MUST seguir
  identificándose por su nombre ante los lectores de pantalla. El activo, la marca de pendiente (de forma
  reducida) y "Cerrar sesión" MUST seguir visibles.
- **FR-014**: El estado plegado o desplegado MUST recordarse en el equipo y aplicarse al recargar y en los
  siguientes inicios de sesión en ese equipo. NEVER MUST guardarse en la cuenta del usuario. Si no hay estado
  recordado (primer uso en el equipo) o no se puede recordar, el menú MUST arrancar desplegado, sea cual sea el
  ancho de la ventana.
- **FR-015**: El contenido de la pantalla MUST aprovechar el espacio que libera el menú al plegarse.

**Pantallas estrechas**

- **FR-016**: Por debajo del corte responsive del diseño, el menú MUST mostrarse como barra horizontal fija en la
  parte superior, con desplazamiento horizontal, ocultando el texto de la marca, los datos del usuario y el botón
  de plegar, y manteniendo accesible "Cerrar sesión".
- **FR-017**: Al cruzar el corte responsive en uno u otro sentido, el menú MUST cambiar de forma sin perder el
  estado plegado elegido para pantallas anchas.

**Diseño y accesibilidad**

- **FR-018**: La cabecera del menú MUST mostrar el logotipo provisional y el nombre de la aplicación, el
  mismo que la pantalla de inicio de sesión («Venta a mayoristas»); plegado, solo el logotipo. El nombre de
  empresa configurable queda fuera de alcance.
- **FR-019**: El menú MUST seguir el sistema visual «Albarán» en tema claro y oscuro, y aplicar al momento el tema
  del usuario. La densidad de tablas (004) no cambia el menú. Los elementos MUST tener un objetivo táctil
  mínimo de 44 px, ser operables con teclado en el orden en que se muestran, y llevar icono y texto visible (en
  plegado, nombre accesible).
- **FR-020**: El diseño del menú plegado, de la marca "Pendiente" en el menú y de los iconos de Ventas y Cobros
  MUST definirse en el diseño «Albarán» antes de implementarse.

### Key Entities

- **Elemento de menú**: entrada que representa un módulo. Atributos: módulo (Ventas, Clientes, Productos,
  Proveedores, Cobros, Ajustes), nombre visible, icono, posición, y si está implementado o pendiente.
- **Estado del menú en el equipo**: plegado o desplegado; pertenece al equipo, no al usuario.
- **Usuario y rol**: definidos en 001-user-login y 003-user-management; aquí solo se leen el nombre, el rol y sus
  permisos de ver.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Desde cualquier pantalla, el usuario llega a cualquier módulo disponible para su rol con un solo
  clic o toque.
- **SC-002**: En el 100 % de las pantallas con sesión, el menú muestra exactamente los módulos que el rol puede
  ver, más Ajustes, y un único elemento activo.
- **SC-003**: El 100 % de los módulos pendientes aparecen con la marca "Pendiente" y ningún intento de abrirlos
  desde el menú cambia de pantalla.
- **SC-004**: Plegar o desplegar el menú se aplica en menos de 1 segundo, y el estado elegido se conserva en el
  100 % de las recargas e inicios de sesión en el mismo equipo.
- **SC-005**: Todo el menú se puede recorrer y usar solo con teclado y con lector de pantalla, en sus tres formas
  (desplegado, plegado y barra horizontal).
- **SC-006**: En una pantalla de 390 px de ancho se llega a todos los módulos y a "Cerrar sesión" sin desplazar la
  página verticalmente.

## Assumptions

- La sesión, el cierre de sesión y la protección de pantallas existen (001-user-login); la matriz de permisos por
  rol es la de 003-user-management; tema, densidad y pantalla de inicio son los de 004-appearance-preferences.
- Hoy solo Ajustes está implementado: Ventas, Clientes, Productos, Proveedores y Cobros se muestran como
  pendientes hasta que su spec los implemente.
- Esta feature cambia la definición de «pantalla existente» de 004-appearance-preferences (FR-014): pasa de
  «con ruta, aunque su contenido sea provisional» a «módulo implementado». El orden de respaldo de 004 (FR-015)
  se mantiene, aplicado solo a módulos implementados.
- "Puede ver" incluye los permisos de editar y de solo ver de la matriz.
- El canal se deduce de dónde se ejecuta la aplicación (navegador o escritorio), no lo elige el usuario.
- El corte responsive es el del diseño «Albarán» (760 px).
- Panel y Nueva venta no forman parte de esta feature; se añadirán al menú en su propia spec.
- Fuera de alcance: contenido de los módulos, diseño de Panel, Ventas, Nueva venta y Cobros, contadores o avisos
  en los enlaces, nombre de empresa configurable, atajos de teclado y menú desplegable en móvil.
