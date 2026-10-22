# Feature Specification: Ajuste de la aplicación al nuevo diseño del menú y del login

**Feature Branch**: `008-design-alignment`

**Created**: 2026-10-22

**Status**: Draft

**Input**: User description: "Quiero que se ajuste el diseño de la aplicación en base a los cambios de diseño que se han implementado"

Cambios de diseño de referencia: actualización del lienzo «Albarán» recogida en `docs/design/README.md` y en los tableros de `docs/design/canvas/` (Ajustes, Clientes, Login, Productos y Proveedores, en escritorio y móvil). Afectan al menú lateral (marca, botón de plegar y pie de usuario), a la pantalla de inicio de sesión y al texto de Ajustes.

## Clarifications

### Session 2026-10-22

- Q: Cuando el nombre del usuario o su rol se recortan con puntos suspensivos en el pie del menú, ¿debe poder verse el texto completo de alguna forma? → A: Sí: al pasar el ratón por el nombre o el rol aparece el texto completo en la etiqueta del navegador; los lectores de pantalla leen siempre el texto completo.
- Q: En pantallas estrechas, ¿el botón de cerrar sesión de la barra superior debe ser solo un icono, como en el menú ancho, o seguir mostrando el texto «Cerrar sesión» como hoy? → A: Solo icono de 44×44, con nombre accesible y `title` «Cerrar sesión», igual que en el menú ancho.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Menú sin marca y con «Plegar menú» como un elemento más (Priority: P1) 🎯 MVP

Un usuario con sesión iniciada ve el menú lateral sin logotipo, sin nombre de empresa y sin el lema «Venta a mayoristas»: la lista de módulos empieza arriba del todo. Bajo Ajustes aparece «Plegar menú» como un elemento más de la lista, con su icono de doble chevrón, el mismo tamaño que los demás y un color más apagado. Al pulsarlo, el menú se pliega a solo iconos y el elemento pasa a decir «Desplegar menú», con el icono girado.

**Why this priority**: es el cambio más visible y el que está en todas las pantallas con sesión. Quitar la marca provisional y unificar el botón de plegar con la lista alinea la aplicación con el diseño en todas las pantallas a la vez.

**Independent Test**: iniciar sesión en web y en escritorio en una pantalla ancha y comprobar que el menú no muestra logotipo ni textos de marca. «Plegar menú» aparece bajo Ajustes como un elemento de la lista, pliega y despliega el menú, y anuncia su estado a los lectores de pantalla.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión iniciada en una pantalla ancha, **When** mira el menú desplegado, **Then** no ve logotipo, nombre de empresa ni «Venta a mayoristas», y el primer elemento visible es el primer módulo de su rol.
2. **Given** el menú desplegado, **When** el usuario mira debajo de Ajustes, **Then** ve «Plegar menú» con un icono de doble chevrón, con el mismo alto, márgenes y tipografía que los demás elementos y en el color apagado de los elementos no disponibles.
3. **Given** el menú desplegado, **When** el usuario pulsa «Plegar menú», **Then** el menú se pliega a solo iconos, sin ninguna marca, y el elemento pasa a «Desplegar menú» con el icono girado.
4. **Given** el menú plegado, **When** el usuario pasa el ratón o enfoca con el teclado «Desplegar menú», **Then** aparece su nombre en la etiqueta flotante, igual que en el resto de elementos.
5. **Given** un lector de pantalla, **When** llega al elemento de plegar, **Then** se anuncia como botón con su nombre («Plegar menú» o «Desplegar menú») y si el menú está desplegado o no.
6. **Given** el ratón sobre «Plegar menú» o el foco del teclado en él, **When** el usuario lo mira, **Then** cambia de fondo como los botones del pie y, con el teclado, muestra un contorno de foco visible.

---

### User Story 2 - Pie de usuario en una sola fila (Priority: P1)

Al final del menú, separado por una línea, el usuario ve en una sola fila un avatar genérico, su nombre y, debajo, «rol · plataforma» (por ejemplo «Comercial · Web»), y a la derecha un botón con el icono de cerrar sesión. Si el nombre o el rol no caben, se recortan con puntos suspensivos. Con el menú plegado solo queda el botón de cerrar sesión, y en pantallas estrechas también.

**Why this priority**: el pie está en todas las pantallas con sesión y es donde el usuario comprueba quién es y cierra la sesión. Hoy ocupa tres líneas y el diseño lo reduce a una.

**Independent Test**: con distintos usuarios (nombre corto y nombre muy largo), comprobar el pie desplegado, plegado y en pantalla estrecha, y que «Cerrar sesión» sigue funcionando y se identifica por su nombre.

**Acceptance Scenarios**:

1. **Given** el menú desplegado, **When** el usuario mira el pie, **Then** ve en una fila el avatar, su nombre, «rol · plataforma» debajo del nombre y un botón de icono para cerrar sesión a la derecha.
2. **Given** un nombre de usuario o de rol más largo que el espacio disponible, **When** se muestra el pie, **Then** el texto se recorta con puntos suspensivos sin romper la fila ni empujar el botón fuera del menú; al pasar el ratón por él se ve el texto completo en la etiqueta del navegador, y los lectores de pantalla lo leen completo.
3. **Given** el botón de cerrar sesión, **When** un lector de pantalla llega a él o el usuario pasa el ratón, **Then** se identifica como «Cerrar sesión»: no depende solo del icono.
4. **Given** el botón de cerrar sesión, **When** el usuario lo pulsa, **Then** se cierra la sesión con el comportamiento de 001-user-login.
5. **Given** el menú plegado, **When** el usuario mira el pie, **Then** solo ve el botón de cerrar sesión, sin avatar ni textos.
6. **Given** una pantalla estrecha, **When** el usuario mira la barra superior, **Then** ve el botón de cerrar sesión como icono (sin el texto visible, que hoy sí se muestra) y no ve avatar, nombre, rol ni el elemento de plegar.

---

### User Story 3 - Inicio de sesión sin marca y centrado en móvil (Priority: P2)

En la pantalla de inicio de sesión, el panel oscuro de presentación ya no muestra logotipo, nombre de empresa ni «Venta a mayoristas», y conserva el resto de su contenido. En pantallas estrechas el panel oscuro desaparece del todo y solo queda el formulario, centrado en la pantalla.

**Why this priority**: es la primera pantalla que se ve, pero solo una vez por sesión. En pantallas anchas el cambio es menor; en móvil mejora el uso, porque el formulario deja de quedar debajo de una franja.

**Independent Test**: abrir el inicio de sesión en web y en escritorio, en ancho y en estrecho, y comprobar que no aparece la marca. En estrecho no aparece el panel oscuro y el formulario queda centrado, sin perder el indicador de base de datos del escritorio ni el enlace para cambiarla.

**Acceptance Scenarios**:

1. **Given** una pantalla ancha, **When** el usuario abre el inicio de sesión, **Then** ve el panel oscuro de presentación sin logotipo, nombre de empresa ni «Venta a mayoristas», y el formulario a su lado.
2. **Given** una pantalla estrecha, **When** el usuario abre el inicio de sesión, **Then** no ve el panel oscuro y el formulario aparece centrado en la pantalla, en vertical y en horizontal.
3. **Given** una pantalla estrecha en el escritorio, **When** el usuario abre el inicio de sesión, **Then** sigue viendo el indicador de la base de datos y la opción de cambiarla, como hasta ahora.
4. **Given** un error al iniciar sesión, **When** se muestra el mensaje, **Then** se ve igual que antes en ancho y en estrecho.

---

### User Story 4 - Texto de Ajustes sin «conexión de datos» (Priority: P3)

En Ajustes, el texto bajo el título dice «Preferencias de la aplicación y acceso de usuarios.», porque Ajustes ya no incluye la conexión de datos.

**Why this priority**: es un cambio de texto, sin efecto en el uso.

**Independent Test**: abrir Ajustes con cualquier rol y leer el subtítulo.

**Acceptance Scenarios**:

1. **Given** cualquier usuario en Ajustes, **When** mira la cabecera, **Then** el subtítulo es «Preferencias de la aplicación y acceso de usuarios.».
2. **Given** cualquier usuario en Ajustes, **When** mira las pestañas, **Then** ve las mismas de hoy (Apariencia y, si su rol administra, Usuarios), sin ninguna de base de datos.

---

### Edge Cases

- Cuenta inicial «admin» (primer acceso): su nombre y rol se muestran en el pie igual que los de cualquier usuario y se recortan si no caben.
- Nombre de usuario de una sola palabra muy larga, sin espacios: se recorta con puntos suspensivos y no desborda el menú.
- El estado plegado guardado en el equipo (005, FR-014) se respeta: un usuario que tenía el menú plegado lo ve plegado, ya con el nuevo «Desplegar menú».
- Al cruzar el corte responsive con el menú plegado, el elemento de plegar y los datos del usuario desaparecen en estrecho y vuelven al ensanchar, sin perder el estado (005, FR-017).
- Tema oscuro y claro: el menú y el login ya son oscuros en los dos temas, y el nuevo pie y el elemento de plegar MUST verse igual en ambos.
- Menú plegado con «Cerrar sesión» enfocado: la etiqueta flotante muestra «Cerrar sesión».
- Pantalla de configuración de base de datos del escritorio, abierta desde el login: no lleva menú, así que no le afectan los cambios del menú.

## Requirements *(mandatory)*

### Functional Requirements

**Marca**

- **FR-001**: Las pantallas de la aplicación NEVER MUST mostrar logotipo, nombre de empresa ni el lema «Venta a mayoristas», ni en el menú (desplegado, plegado o en pantallas estrechas) ni en el inicio de sesión. Sustituye a 005 FR-018 y al logotipo de 001.

**Elemento de plegar**

- **FR-002**: El control para plegar y desplegar el menú MUST ser un elemento más de la lista del menú, situado justo debajo de Ajustes. MUST tener el mismo alto mínimo (44 px), márgenes, tipografía y radio que los demás elementos, el color apagado de los elementos no disponibles y un icono de doble chevrón.
- **FR-003**: El elemento MUST decir «Plegar menú» con el menú desplegado y «Desplegar menú» con el menú plegado. Su icono MUST girar al plegar, y MUST anunciar a los lectores de pantalla si el menú está desplegado. Plegado, MUST mostrar su nombre en la etiqueta flotante al pasar el ratón y al recibir el foco, como el resto de elementos (005 FR-013).
- **FR-004**: El comportamiento de plegar no cambia: estado recordado en el equipo, arranque desplegado sin estado y aprovechamiento del espacio (005 FR-014, FR-015). El elemento NEVER MUST aparecer por debajo del corte responsive.

**Pie de usuario**

- **FR-005**: El pie del menú MUST mostrarse en una sola fila, separada del resto por una línea:
  - un avatar genérico (icono de persona, sin foto ni iniciales);
  - el nombre del usuario, y debajo «rol · plataforma» («Web» o «Escritorio»);
  - un botón de icono para cerrar sesión a la derecha.

  Sustituye a la disposición de 005 FR-007.
- **FR-006**: El nombre y «rol · plataforma» MUST recortarse con puntos suspensivos cuando no quepan. NEVER MUST desbordar el menú ni desplazar el botón de cerrar sesión fuera de él. El recorte MUST ser solo visual: al pasar el ratón, la etiqueta del navegador MUST mostrar el texto completo de cada línea, y los lectores de pantalla MUST leerlo siempre completo.
- **FR-007**: El botón de cerrar sesión MUST tener un objetivo de 44×44 px, MUST identificarse como «Cerrar sesión» ante lectores de pantalla y al pasar el ratón, y MUST mantener el comportamiento de 001-user-login (005 FR-008).
- **FR-008**: Con el menú plegado, el pie MUST mostrar solo el botón de cerrar sesión. Por debajo del corte responsive, la barra superior MUST mostrar solo el botón de cerrar sesión, como icono de 44×44 sin texto visible (igual que en ancho, con nombre accesible y `title` «Cerrar sesión»), sin avatar ni datos del usuario. Sustituye al texto visible «Cerrar sesión» de 005 FR-016.
- **FR-009**: Al pasar el ratón, el elemento de plegar y el botón de cerrar sesión MUST cambiar de fondo. Al recibir el foco del teclado MUST mostrar un contorno visible que cumpla el contraste mínimo de 3:1 con el fondo del menú.

**Inicio de sesión**

- **FR-010**: En pantallas anchas, el panel de presentación del inicio de sesión MUST conservar su contenido sin la marca (FR-001).
- **FR-011**: Por debajo del corte responsive, el inicio de sesión NEVER MUST mostrar el panel de presentación. El formulario MUST aparecer centrado en la pantalla, en vertical y en horizontal, manteniendo en el escritorio el indicador de base de datos y la opción de cambiarla (002-desktop-local-backend).

**Ajustes**

- **FR-012**: El subtítulo de Ajustes MUST ser «Preferencias de la aplicación y acceso de usuarios.». Las pestañas de Ajustes no cambian.

**Diseño y accesibilidad**

- **FR-013**: Los cambios MUST seguir el sistema visual «Albarán» actualizado (`docs/design/README.md` y tableros de `docs/design/canvas/`) en tema claro y oscuro, en web y en escritorio, y MUST mantener los requisitos de accesibilidad de 005:
  - orden de teclado;
  - foco visible;
  - objetivos de 44 px;
  - contraste de 4.5:1 en textos.
- **FR-014**: La actualización del diseño (README y copia de los tableros) MUST incorporarse al repositorio en el mismo cambio que la implementación, como exige el proyecto para cambios del lienzo.

### Key Entities

- **Usuario con sesión**: nombre, nombre del rol y plataforma (Web o Escritorio), ya disponibles desde 001 y 005. Esta feature solo cambia cómo se muestran.
- **Estado del menú**: plegado o desplegado, recordado en el equipo (005). No cambia.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En el 100 % de las pantallas con sesión y en el inicio de sesión, en web y en escritorio y a cualquier anchura, no aparece ningún logotipo, nombre de empresa ni «Venta a mayoristas».
- **SC-002**: El pie del menú desplegado ocupa una sola fila para cualquier usuario, también con nombres de 60 caracteres o más, sin desbordar el menú.
- **SC-003**: Un usuario cierra sesión con un solo clic o toque desde cualquier pantalla con sesión, con el menú desplegado, plegado o en pantalla estrecha.
- **SC-004**: El 100 % de los controles nuevos o cambiados (elemento de plegar y botón de cerrar sesión) se pueden usar solo con teclado, tienen un objetivo de 44 px y se anuncian por su nombre a los lectores de pantalla.
- **SC-005**: En una pantalla de 390 px de ancho, el formulario de inicio de sesión se ve entero sin desplazarse y sin el panel de presentación.
- **SC-006**: Una revisión visual frente a los tableros actualizados, en claro y oscuro, a 390 y 1440 px, no encuentra diferencias en el menú, el pie, el login ni el subtítulo de Ajustes.

## Assumptions

- Los cambios de diseño de referencia son los pendientes de incorporar en `docs/design/` (README y 12 tableros) a fecha de 2026-10-22. Cualquier otra diferencia entre los tableros y la aplicación queda fuera de esta feature.
- La retirada de la pestaña «Base de datos» del tablero de Ajustes ya está reflejada en la aplicación: Ajustes solo tiene Apariencia y Usuarios. La configuración de la base de datos del escritorio sigue en su pantalla propia, abierta desde el inicio de sesión (002), y no cambia.
- El título de la pestaña del navegador y del ejecutable del escritorio no forman parte de «las pantallas de la aplicación» y no cambian.
- El avatar es siempre el icono genérico de persona. No hay fotos ni iniciales.
- El color apagado del elemento de plegar es el de los elementos no disponibles del menú, y el contorno de foco es el acento claro del menú, ambos definidos en el README de diseño.
- Las pantallas Clientes (007) y Productos (006) solo se ven afectadas a través del menú. Sus listados no cambian.
- Fuera de alcance:
  - las pantallas pendientes de diseño (Panel, Ventas, Nueva venta y Cobros);
  - el color de las líneas entre filas de tabla en tema oscuro;
  - cualquier cambio de comportamiento del menú distinto de los descritos.
