# Feature Specification: Gestión de usuarios (Ajustes › Usuarios)

**Feature Branch**: `003-user-management`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "Gestión de usuarios en Ajustes › Usuarios de la aplicación B2B de venta a mayoristas
(web y escritorio). Roles: Administrador, Comercial, Almacén, Administración. Solo el rol Administrador accede a
esta pestaña, y solo el Administrador puede dar de alta usuarios: no hay invitaciones ni alta por el propio
usuario. Historias: 1) Primer Administrador con la cuenta inicial "admin". 2) Alta de usuario con nombre, email,
rol y contraseña inicial. 3) Listado de usuarios. 4) Cambiar rol y bloquear/desbloquear. 5) Restablecer la
contraseña. 6) Consultar la matriz de permisos fija. Fuera de alcance: invitaciones y alta por el propio usuario,
envío de correos, eliminar usuarios, matriz de permisos editable."

## Clarifications

### Session 2026-10-16

- Q: ¿Cuándo debe notar la sesión abierta de un usuario que lo han bloqueado, le han cambiado el rol o le han
  restablecido la contraseña? → A: Todo en un máximo de 15 minutos, en la siguiente renovación de sesión
  (coherente con 001-user-login); no se exige corte inmediato.
- Q: ¿Se pueden corregir el nombre o el email de un usuario después del alta? → A: Sí, el Administrador puede
  editar nombre y email con la misma validación y unicidad que en el alta.
- Q: ¿Hay que registrar quién hizo cada acción de gestión de usuarios y cuándo? → A: Sí: autor, acción, usuario
  afectado, fecha y hora, sin pantalla de consulta en esta entrega.
- Q: ¿Puede cada usuario cambiar su propia contraseña desde la aplicación? → A: No en esta entrega: solo el
  Administrador fija o restablece contraseñas; el cambio por el propio usuario queda para una spec futura.
- Q: ¿Dónde se define la matriz de permisos y qué podrá crecer sin tocar código? → A: Los roles y la matriz de
  permisos se guardan en la base de datos, para poder añadir roles o cambiar permisos en el futuro. Los módulos
  siguen fijos en la aplicación. En esta entrega la matriz y los roles son de solo lectura.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear el primer Administrador con la cuenta inicial (Priority: P1)

En una instalación nueva, quien entra con la cuenta inicial "admin" (spec 001-user-login, historia 7) va a
Ajustes › Usuarios y da de alta al primer usuario real. Ese usuario tiene que ser Administrador. En cuanto se
crea, la cuenta inicial deja de funcionar y la persona tiene que volver a entrar con el usuario recién creado.

**Why this priority**: es la única forma de sustituir la cuenta inicial, cuyas credenciales son públicas. Sin
esta historia la instalación queda permanentemente expuesta y nadie puede tener un usuario propio.

**Independent Test**: con una base de datos sin usuarios se entra con "admin"/"admin", se crea un Administrador
y se comprueba que "admin"/"admin" ya no da acceso y que el nuevo usuario sí entra.

**Acceptance Scenarios**:

1. **Given** una sesión con la cuenta inicial "admin", **When** se abre Ajustes › Usuarios, **Then** se muestra
   el formulario de alta con el rol fijado en Administrador y un aviso de que es el primer usuario y de que la
   cuenta inicial dejará de funcionar.
2. **Given** una sesión con la cuenta inicial, **When** se intenta crear el primer usuario con un rol distinto de
   Administrador (por ejemplo, manipulando la petición), **Then** el alta se rechaza con un mensaje que indica que
   el primer usuario tiene que ser Administrador y no se crea ningún usuario.
3. **Given** una sesión con la cuenta inicial, **When** se crea el primer Administrador con datos válidos,
   **Then** la sesión de la cuenta inicial termina, se lleva a la persona al inicio de sesión con un mensaje que
   le pide entrar con el nuevo usuario, y "admin"/"admin" deja de dar acceso.
4. **Given** que ya existe el primer Administrador, **When** alguien intenta entrar con "admin"/"admin",
   **Then** se rechaza con el mensaje genérico de credenciales incorrectas.

---

### User Story 2 - Dar de alta un usuario (Priority: P1)

El Administrador da de alta a un empleado indicando nombre, email, rol y una contraseña inicial. El usuario queda
Activo y puede iniciar sesión de inmediato. El Administrador le comunica la contraseña por su cuenta; no hay
envío de correos ni obligación de cambiarla en el primer acceso.

**Why this priority**: sin altas, nadie salvo el primer Administrador puede usar la aplicación.

**Independent Test**: un Administrador crea un usuario Comercial y se comprueba que ese usuario entra con el email
y la contraseña indicados y ve los módulos que su rol permite.

**Acceptance Scenarios**:

1. **Given** un Administrador en Ajustes › Usuarios, **When** da de alta un usuario con nombre, email válido,
   rol y contraseña de al menos 8 caracteres, **Then** el usuario aparece en el listado como Activo, con
   "Último acceso" vacío ("Nunca"), y puede iniciar sesión con esas credenciales.
2. **Given** un usuario existente con email "ana@empresa.es", **When** se intenta dar de alta otro con
   "Ana@Empresa.es" o " ana@empresa.es ", **Then** el alta se rechaza indicando que ya existe un usuario con ese
   email.
3. **Given** el formulario de alta, **When** se envía con la contraseña de menos de 8 caracteres, el email sin
   formato válido o algún campo obligatorio vacío, **Then** no se crea el usuario y se indica qué campo falla.
4. **Given** un usuario recién creado, **When** inicia sesión por primera vez, **Then** entra directamente sin
   que se le exija cambiar la contraseña.
5. **Given** un usuario dado de alta con un error en el nombre o el email, **When** el Administrador los corrige,
   **Then** el listado muestra los datos nuevos y el usuario inicia sesión con el email corregido; el email
   anterior deja de servir para entrar.
6. **Given** un usuario existente, **When** el Administrador intenta cambiarle el email por uno que ya usa otro
   usuario (sin distinguir mayúsculas), **Then** se rechaza indicando que ya existe un usuario con ese email.

---

### User Story 3 - Consultar el listado de usuarios (Priority: P1)

El Administrador ve todos los usuarios de la empresa con nombre, email, rol, último acceso y estado (Activo o
Bloqueado), y desde cada fila accede a las acciones sobre ese usuario.

**Why this priority**: es la base desde la que se ejecutan el resto de acciones de gestión y la forma de saber
quién tiene acceso a la aplicación.

**Independent Test**: con varios usuarios de distintos roles y estados, el Administrador abre la pestaña y
comprueba que todos aparecen con sus datos correctos.

**Acceptance Scenarios**:

1. **Given** varios usuarios dados de alta, **When** el Administrador abre Ajustes › Usuarios, **Then** ve cada
   usuario con nombre, email, rol, fecha y hora del último acceso y estado expresado como texto.
2. **Given** un usuario que nunca ha iniciado sesión, **When** aparece en el listado, **Then** su último acceso
   se muestra como "Nunca".
3. **Given** un usuario con rol Comercial, Almacén o Administración, **When** abre Ajustes, **Then** no ve la
   pestaña Usuarios, y si intenta abrirla directamente o pedir sus datos, se le deniega el acceso.
4. **Given** una pantalla de móvil, **When** el Administrador abre el listado, **Then** cada usuario se muestra
   como tarjeta legible sin desplazamiento horizontal de la página.

---

### User Story 4 - Cambiar el rol y bloquear o desbloquear (Priority: P2)

El Administrador cambia el rol de un usuario o lo bloquea para retirarle el acceso, y puede desbloquearlo más
tarde. Los cambios afectan también a las sesiones que ese usuario tenga abiertas. El sistema impide quedarse
sin ningún Administrador activo.

**Why this priority**: es imprescindible cuando un empleado cambia de puesto o deja la empresa, pero la
aplicación es usable sin ello durante el arranque.

**Independent Test**: se cambia el rol de un usuario con sesión abierta y se comprueba que sus permisos cambian;
se bloquea y se comprueba que pierde el acceso y no puede volver a entrar; se desbloquea y vuelve a entrar.

**Acceptance Scenarios**:

1. **Given** un usuario Comercial con sesión abierta, **When** el Administrador le cambia el rol a Almacén,
   **Then** el listado muestra el nuevo rol y la sesión abierta pasa a tener los permisos de Almacén en un
   máximo de 15 minutos, sin tener que volver a iniciar sesión.
2. **Given** un usuario Activo con sesión abierta, **When** el Administrador lo bloquea, **Then** su estado pasa
   a Bloqueado, su sesión deja de ser válida en un máximo de 15 minutos y, si intenta iniciar sesión, se le
   indica que su cuenta está bloqueada y que contacte con un administrador.
3. **Given** un usuario Bloqueado, **When** el Administrador lo desbloquea, **Then** su estado pasa a Activo y
   puede iniciar sesión con su contraseña de siempre.
4. **Given** que solo hay un Administrador activo, **When** se intenta bloquearlo o cambiarle el rol a otro
   distinto de Administrador, **Then** la acción se rechaza con un mensaje que explica que debe quedar al menos
   un Administrador activo.
5. **Given** un Administrador en el listado, **When** intenta bloquearse a sí mismo, **Then** la acción no está
   disponible y, si se fuerza, se rechaza.
6. **Given** dos Administradores activos, **When** uno cambia su propio rol a Comercial, **Then** el cambio se
   aplica y pierde el acceso a Ajustes › Usuarios en un máximo de 15 minutos.
7. **Given** una acción de bloqueo o de cambio de rol, **When** el Administrador la ejecuta, **Then** se le pide
   confirmación antes de aplicarla.

---

### User Story 5 - Restablecer la contraseña de un usuario (Priority: P2)

Como no hay recuperación de contraseña por correo, cuando un usuario olvida su contraseña el Administrador le
asigna una nueva y se la comunica por su cuenta. Las sesiones abiertas de ese usuario se cierran.

**Why this priority**: es la única vía para recuperar el acceso de un usuario; sin ella habría que dar de alta un
usuario nuevo, lo que no es posible con el mismo email.

**Independent Test**: se restablece la contraseña de un usuario con sesión abierta y se comprueba que la antigua
ya no sirve, que la nueva sí y que la sesión que tenía abierta se cierra.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión abierta, **When** el Administrador le pone una contraseña nueva de al menos 8
   caracteres, **Then** la contraseña anterior deja de funcionar, la nueva funciona y sus sesiones abiertas dejan
   de ser válidas en un máximo de 15 minutos.
2. **Given** el formulario de restablecimiento, **When** se introduce una contraseña de menos de 8 caracteres,
   **Then** no se cambia y se indica el motivo.
3. **Given** un usuario bloqueado temporalmente por intentos fallidos, **When** el Administrador le restablece la
   contraseña, **Then** puede iniciar sesión de inmediato con la nueva.
4. **Given** un usuario Bloqueado por un administrador, **When** se le restablece la contraseña, **Then** sigue
   Bloqueado hasta que se le desbloquee.

---

### User Story 6 - Consultar la matriz de permisos por rol (Priority: P3)

El Administrador consulta en Ajustes › Usuarios qué puede hacer cada rol en cada módulo, para elegir el rol
adecuado al dar de alta o modificar un usuario. La matriz se guarda en la base de datos y es la que la
aplicación aplica, pero en esta entrega no se puede editar desde la aplicación.

**Why this priority**: ayuda a decidir el rol, pero la gestión de usuarios funciona sin ella.

**Independent Test**: en una instalación nueva se abre la pestaña y se comprueba que la matriz coincide celda a
celda con los valores iniciales de FR-020 y que no ofrece ningún control de edición; después se cambia un valor
directamente en la base de datos y se comprueba que la pestaña y los permisos aplicados reflejan el cambio.

**Acceptance Scenarios**:

1. **Given** un Administrador en Ajustes › Usuarios, **When** consulta la sección "Permisos por rol", **Then** ve
   una fila por módulo (Ventas, Clientes, Productos, Proveedores, Cobros, Ajustes), una columna por rol y en cada
   celda E, V o —, con la leyenda "E = editar · V = solo ver · — = sin acceso".
2. **Given** la matriz, **When** el Administrador intenta modificar una celda, **Then** no hay forma de hacerlo.
3. **Given** un rol nuevo o un permiso cambiado directamente en la base de datos, **When** el Administrador abre
   la pestaña, **Then** la matriz y el selector de rol lo muestran, y la aplicación aplica ese permiso a los
   usuarios con ese rol en un máximo de 15 minutos.

---

### Edge Cases

- El email se introduce con mayúsculas o espacios al principio o al final: se guarda normalizado y se compara sin
  distinguir mayúsculas.
- Dos Administradores dan de alta a la vez usuarios con el mismo email: solo uno se crea; el otro recibe el error
  de email duplicado.
- Dos Administradores activos se bloquean o degradan mutuamente a la vez: el sistema garantiza que siempre queda
  al menos un Administrador activo y rechaza la acción que lo impediría.
- Un Administrador bloqueado o degradado tiene abierta Ajustes › Usuarios: su siguiente acción de gestión se
  rechaza en cuanto el cambio llega a su sesión.
- Se intenta cambiar el rol o restablecer la contraseña de un usuario que otro Administrador acaba de bloquear:
  la acción se aplica sobre el estado actual y el listado se refresca.
- Un Administrador se restablece su propia contraseña: se aplica y todas sus sesiones, incluida la actual, se
  cierran; debe entrar de nuevo con la nueva contraseña.
- Se intenta dar de alta un usuario con el identificador "admin" o un email reservado: se rechaza por no ser un
  email válido.
- Se pierde la conexión al guardar: se muestra un error de conexión, no se da el cambio por hecho y el formulario
  conserva lo introducido salvo la contraseña.
- Se pulsa "Guardar" varias veces seguidas: se procesa una única alta o un único cambio.
- Una cuenta inicial "admin" con sesión abierta en otro equipo cuando se crea el primer Administrador: esa sesión
  deja de ser válida en un máximo de 15 minutos.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso a la pestaña**

- **FR-001**: Solo los usuarios activos cuyo rol tenga "editar" (E) en el módulo Ajustes de la matriz
  (inicialmente solo Administrador) y la cuenta inicial "admin" (mientras exista) MUST poder ver y usar
  Ajustes › Usuarios, tanto en la web como en el escritorio.
- **FR-002**: El sistema MUST rechazar cualquier operación de gestión de usuarios (consulta, alta, edición de
  nombre o email, cambio de rol, bloqueo, desbloqueo, restablecimiento y consulta de roles) solicitada por un
  usuario sin ese permiso, aunque se intente fuera de la interfaz.

**Primer Administrador**

- **FR-003**: Con la cuenta inicial, el sistema MUST permitir dar de alta exclusivamente un usuario con rol
  Administrador, y MUST rechazar cualquier otro rol.
- **FR-004**: Al crearse el primer usuario real, el sistema MUST eliminar la cuenta inicial, terminar la sesión
  desde la que se creó llevando al inicio de sesión, e invalidar el resto de sesiones de la cuenta inicial en un
  máximo de 15 minutos (coherente con FR-022 de 001-user-login).
- **FR-005**: La cuenta inicial NEVER MUST aparecer en el listado de usuarios.

**Alta de usuario**

- **FR-006**: El Administrador MUST poder dar de alta un usuario indicando nombre, email, rol (Administrador,
  Comercial, Almacén o Administración) y contraseña inicial; todos los campos son obligatorios.
- **FR-007**: El email MUST tener formato válido, MUST normalizarse quitando espacios al principio y al final y
  MUST ser único sin distinguir mayúsculas y minúsculas.
- **FR-008**: La contraseña inicial MUST tener al menos 8 caracteres.
- **FR-009**: El usuario creado MUST quedar en estado Activo y poder iniciar sesión de inmediato, sin obligación
  de cambiar la contraseña en el primer acceso. En esta entrega la contraseña solo la fija o restablece un
  Administrador; el propio usuario no puede cambiarla desde la aplicación.
- **FR-010**: El sistema NEVER MUST enviar correos ni invitaciones; el Administrador comunica la contraseña por su
  cuenta.
- **FR-024**: El Administrador MUST poder editar el nombre y el email de cualquier usuario, con las mismas reglas
  que en el alta (campos obligatorios, formato y unicidad del email de FR-007). Tras cambiar el email, el usuario
  MUST iniciar sesión con el nuevo y el anterior NEVER MUST dar acceso; sus sesiones abiertas no se cierran.

**Listado**

- **FR-011**: El listado MUST mostrar, para cada usuario, nombre, email, rol, fecha y hora del último acceso
  ("Nunca" si no ha entrado) y estado como texto (Activo o Bloqueado), ordenado por nombre.
- **FR-012**: El listado MUST adaptarse a pantallas de móvil según el diseño «Albarán» (tabla en escritorio,
  tarjetas en móvil).

**Rol y bloqueo**

- **FR-013**: El Administrador MUST poder cambiar el rol de cualquier usuario y bloquear o desbloquear a cualquier
  usuario, con confirmación previa en el cambio de rol y en el bloqueo.
- **FR-014**: Un cambio de rol MUST aplicarse a las sesiones abiertas del usuario en un máximo de 15 minutos, sin
  que tenga que volver a iniciar sesión.
- **FR-015**: Al bloquear un usuario, sus sesiones abiertas MUST dejar de ser válidas en un máximo de 15 minutos y
  NEVER MUST poder iniciar sesión mientras siga Bloqueado (con el mensaje de cuenta bloqueada de 001-user-login).
- **FR-016**: El sistema MUST rechazar cualquier bloqueo o cambio de rol que deje la aplicación sin al menos un
  Administrador activo, también cuando dos acciones concurrentes lo provocarían.
- **FR-017**: Un Administrador NEVER MUST poder bloquearse a sí mismo. Sí puede cambiar su propio rol si queda
  otro Administrador activo.

**Restablecimiento de contraseña**

- **FR-018**: El Administrador MUST poder asignar una contraseña nueva de al menos 8 caracteres a cualquier
  usuario, incluido él mismo. La anterior MUST dejar de funcionar de inmediato.
- **FR-019**: Al restablecer la contraseña, todas las sesiones abiertas de ese usuario MUST dejar de ser válidas
  en un máximo de 15 minutos, y MUST reiniciarse su bloqueo temporal por intentos fallidos. El estado Bloqueado
  por un administrador NEVER MUST cambiar por un restablecimiento.

**Matriz de permisos**

- **FR-020**: Los roles y la matriz de permisos (rol × módulo con valor E, V o —) MUST guardarse en la base de
  datos. En una instalación nueva MUST crearse sin intervención manual con estos valores iniciales, y el sistema
  NEVER MUST sobrescribir después los valores guardados. Ajustes › Usuarios MUST mostrar la matriz guardada, con
  la leyenda "E = editar · V = solo ver · — = sin acceso", sin ningún control para editarla:

  | Módulo | Administrador | Comercial | Almacén | Administración |
  |---|---|---|---|---|
  | Ventas | E | E | V | V |
  | Clientes | E | E | — | V |
  | Productos | E | V | E | V |
  | Proveedores | E | — | V | E |
  | Cobros | E | V | — | E |
  | Ajustes | E | — | — | — |

- **FR-021**: La matriz mostrada MUST ser la misma que la aplicación usa para conceder permisos por rol: una única
  definición, la guardada en la base de datos. Los selectores de rol (alta y edición) MUST ofrecer los roles
  guardados.
- **FR-026**: Los módulos de la matriz son los de la aplicación (Ventas, Clientes, Productos, Proveedores, Cobros y
  Ajustes) y no se guardan como datos. Si un rol guardado no tiene valor para un módulo, MUST tratarse como "sin
  acceso".
- **FR-027**: El rol Administrador MUST existir siempre y tener "editar" en todos los módulos; las reglas de esta
  spec que nombran al Administrador (primer usuario y último Administrador activo) se refieren a ese rol. El
  acceso a la pestaña se rige por FR-001.
- **FR-028**: Un cambio de la matriz o de los roles hecho en la base de datos MUST aplicarse a las sesiones
  abiertas en un máximo de 15 minutos, como un cambio de rol (FR-014).

**Seguridad y trazabilidad**

- **FR-022**: Las contraseñas NEVER MUST mostrarse, registrarse ni devolverse en claro tras guardarse, ni
  aparecer en el listado.
- **FR-023**: Todos los mensajes de error de la pestaña MUST indicar el campo o la regla que falla, sin exponer
  detalles internos.
- **FR-025**: El sistema MUST registrar cada acción de gestión de usuarios que se complete (alta, edición de
  nombre o email, cambio de rol, bloqueo, desbloqueo y restablecimiento de contraseña) con su autor (o la cuenta
  inicial), la acción, el usuario afectado, la fecha y la hora, y los valores anterior y nuevo cuando proceda. El
  registro NEVER MUST incluir contraseñas, no se puede modificar ni borrar desde la aplicación y en esta entrega no
  tiene pantalla de consulta.

### Key Entities

- **Usuario**: empleado de la empresa con acceso a la aplicación. Atributos: nombre, email (único sin distinguir
  mayúsculas), credencial protegida, rol, estado (Activo o Bloqueado), fecha del último acceso. Se crea solo por
  un Administrador, que puede corregir su nombre y email, y no se elimina.
- **Rol**: guardado en la base de datos. Inicialmente Administrador, Comercial, Almacén y Administración; en el
  futuro podrán añadirse más. Atributos: identificador estable, nombre visible, si es el rol Administrador del
  sistema, orden de presentación y su fila de permisos.
- **Matriz de permisos**: el valor E, V o — de cada rol en cada módulo, guardado junto a cada rol. Los módulos
  los fija la aplicación. En esta entrega no es editable desde la aplicación.
- **Sesión**: periodo autenticado de un usuario (definida en 001-user-login). Se invalida al bloquear al usuario o
  restablecer su contraseña, y recoge los cambios de rol.
- **Cuenta inicial**: cuenta "admin" de 001-user-login; solo puede dar de alta al primer Administrador y
  desaparece al hacerlo.
- **Registro de acciones**: anotación de cada acción de gestión de usuarios. Atributos: autor, acción, usuario
  afectado, fecha y hora, valores anterior y nuevo cuando proceda. Solo se añade, nunca se modifica.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un Administrador da de alta un usuario completo en menos de 1 minuto, y el usuario puede iniciar
  sesión inmediatamente después.
- **SC-002**: En una instalación nueva, el primer Administrador queda creado en menos de 2 minutos desde la
  entrada con "admin", y a partir de ese momento "admin"/"admin" falla en el 100 % de los intentos.
- **SC-003**: El 100 % de los bloqueos, restablecimientos y cambios de rol surten efecto en las sesiones abiertas
  del usuario afectado en un máximo de 15 minutos.
- **SC-004**: En ningún momento existe una situación sin al menos un Administrador activo (0 casos en las pruebas
  de bloqueo y degradación, incluidas las concurrentes).
- **SC-005**: El 100 % de los intentos de gestión de usuarios por roles sin "editar" en Ajustes se rechazan.
- **SC-006**: No pueden existir dos usuarios cuyos emails solo se diferencien en mayúsculas o espacios.
- **SC-007**: La matriz mostrada coincide en todas sus celdas con los permisos que la aplicación aplica a cada
  rol, y en una instalación nueva coincide con los valores iniciales de FR-020.
- **SC-008**: El 100 % de las acciones de gestión de usuarios completadas quedan registradas con autor, acción,
  usuario afectado y fecha, y ninguna anotación contiene una contraseña.

## Assumptions

- La autenticación, las sesiones, el mensaje de cuenta bloqueada, el registro del último acceso y la cuenta
  inicial "admin" ya existen (spec 001-user-login); este módulo los reutiliza.
- El "máximo de 15 minutos" para que los cambios lleguen a las sesiones abiertas es coherente con la regla de
  001-user-login ("como muy tarde en la siguiente renovación de sesión"). Se aplica por igual al bloqueo, al
  restablecimiento de contraseña y al cambio de rol; no se exige corte inmediato (aclaración 2026-10-16).
- No existe el estado Invitado: al no haber invitaciones, los únicos estados son Activo y Bloqueado. El mensaje
  de "invitación no completada" de 001-user-login (FR-004) deja de aplicarse.
- El diseño «Albarán» de Ajustes › Usuarios muestra un formulario "Invitar por email" y el estado Invitado.
  Hay que actualizar el lienzo y `docs/design/` para sustituirlo por el alta directa (nombre, email, rol y
  contraseña) y añadir los diálogos de cambio de rol, bloqueo y restablecimiento.
- La fila "Ajustes" de la matriz se refiere a las pestañas de administración (Base de datos y Usuarios). Ajustes ›
  Apariencia son preferencias personales y sigue disponible para todos los roles.
- La aplicación de la matriz en cada módulo (Ventas, Clientes…) corresponde a cada módulo; aquí se define la
  matriz y se muestra.
- Fuera de alcance: eliminar usuarios, invitaciones, alta por el propio usuario, envío de correos, cambio de contraseña por el propio usuario (queda para una spec futura), editar la matriz o crear, renombrar o borrar roles desde la
  aplicación (los datos ya quedan en la base de datos para una spec futura), módulos configurables, búsqueda o
  paginación del listado (se asume una plantilla de hasta unas decenas de usuarios) y la pantalla de consulta del
  registro de acciones.
