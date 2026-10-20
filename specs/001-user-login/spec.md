# Feature Specification: Inicio de sesión (login)

**Feature Branch**: `001-user-login`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "Módulo de autenticación (login) de la aplicación de venta a mayoristas: acceso
con email y contraseña para web y escritorio, rol aplicado desde el inicio, sesión persistente opcional,
bloqueo por intentos fallidos, indicador y cambio de servidor solo en escritorio, recuperación de
contraseña por email."

## Clarifications

### Session 2026-10-14

- Q: ¿Se aceptan los valores por defecto de seguridad y sesión propuestos? → A: Sí: 30 min de
  inactividad, 30 días de sesión persistente, 5 intentos fallidos, 15 min de bloqueo, contraseña de al
  menos 8 caracteres y Productos como pantalla de inicio provisional.
- Q: ¿Cómo se crea el primer Administrador? → A: Con una cuenta inicial que ya existe en la base de datos,
  con identificador "admin" y contraseña "admin". Se elimina en cuanto se crea el primer usuario, que tiene
  que ser Administrador.
- Q: ¿Entra el envío de correos (recuperación de contraseña) en esta entrega? → A: No, se pospone hasta
  nuevo aviso. La historia 7 queda fuera de alcance.
- Q: ¿Cómo crea la cuenta "admin" al primer Administrador? → A: La creación del usuario se deja para el
  módulo de usuarios. Este módulo solo aporta la cuenta inicial, el acceso con ella y su invalidación
  cuando ya existe un usuario real.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iniciar sesión con email y contraseña (Priority: P1)

Un empleado de la empresa (Administrador, Comercial, Almacén o Administración) abre la aplicación, en la web
o en el escritorio, introduce su email y su contraseña y accede a su pantalla de inicio con los permisos de su
rol ya aplicados. Si se equivoca, recibe un mensaje claro que no revela si el email existe y le indica cuántos
intentos le quedan.

**Why this priority**: sin inicio de sesión no se puede usar ningún otro módulo (Productos, Clientes,
Proveedores, Ventas, Cobros, Ajustes). Es la puerta de entrada de la aplicación y el mínimo viable.

**Independent Test**: se crea un usuario activo con un rol y se comprueba que entra con sus credenciales y
llega a su pantalla de inicio, y que con credenciales erróneas ve el mensaje genérico y no accede.

**Acceptance Scenarios**:

1. **Given** un usuario activo con rol Comercial, **When** introduce su email y contraseña correctos y pulsa
   "Entrar", **Then** accede a la aplicación, llega a su pantalla de inicio y solo ve los módulos que su rol
   permite.
2. **Given** un usuario que eligió "Ventas" como pantalla de inicio en Ajustes, **When** inicia sesión,
   **Then** llega a Ventas.
3. **Given** un usuario sin pantalla de inicio elegida, **When** inicia sesión, **Then** llega a la pantalla
   de inicio por defecto.
4. **Given** cualquier email (exista o no), **When** se introduce una contraseña incorrecta, **Then** se
   muestra "Email o contraseña incorrectos" junto con el número de intentos restantes, sin indicar si el email
   existe.
5. **Given** un usuario cuya cuenta está bloqueada por un administrador, **When** intenta iniciar sesión con
   credenciales correctas, **Then** no accede y el mensaje le indica que su cuenta está bloqueada y que
   contacte con un administrador.
6. **Given** un usuario invitado que todavía no ha completado su alta, **When** intenta iniciar sesión,
   **Then** no accede y el mensaje le indica que debe completar la invitación recibida.
7. **Given** una persona sin sesión, **When** intenta abrir directamente cualquier pantalla de la aplicación,
   **Then** se la redirige al inicio de sesión y, tras identificarse, llega a la pantalla que intentaba abrir.

---

### User Story 2 - Sesión activa mientras se trabaja (Priority: P1)

El usuario trabaja durante su jornada sin que la aplicación le pida la contraseña continuamente. Si deja la
aplicación sin usar durante un tiempo prolongado, la sesión caduca y debe volver a identificarse.

**Why this priority**: es un uso de ocho horas al día en oficina y almacén; pedir la contraseña cada poco haría
la aplicación inutilizable, pero una sesión eterna en un equipo compartido es un riesgo.

**Independent Test**: se inicia sesión, se trabaja de forma continuada más allá de la vida de una credencial
de corta duración y se comprueba que no se pide de nuevo la contraseña; después se deja inactiva más allá del
límite y se comprueba que se pide.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión iniciada que usa la aplicación de forma continuada, **When** pasan varias
   horas de actividad, **Then** sigue trabajando sin tener que volver a introducir la contraseña.
2. **Given** un usuario con sesión iniciada sin "Mantener la sesión", **When** la aplicación permanece sin uso
   más del tiempo máximo de inactividad, **Then** la siguiente acción le devuelve al inicio de sesión.
3. **Given** una sesión caducada, **When** el usuario intenta realizar una acción, **Then** no se ejecuta, se
   le lleva al inicio de sesión y, tras identificarse, vuelve a la pantalla en la que estaba.

---

### User Story 3 - Cerrar sesión (Priority: P1)

El usuario pulsa "Cerrar sesión" en la barra lateral. A partir de ese momento nadie puede seguir usando la
aplicación desde ese equipo sin volver a identificarse.

**Why this priority**: los puestos de almacén y tienda son compartidos; cerrar sesión de forma fiable es
imprescindible para que cada acción quede asociada a la persona correcta.

**Independent Test**: se inicia sesión, se cierra sesión y se comprueba que ni la navegación atrás ni volver a
abrir la aplicación dan acceso a datos sin identificarse de nuevo.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión iniciada, **When** pulsa "Cerrar sesión", **Then** vuelve a la pantalla de
   inicio de sesión.
2. **Given** un usuario que acaba de cerrar sesión, **When** se usa el botón "atrás" del navegador o se reabre
   la aplicación, **Then** no se muestra ningún dato y se pide identificarse.
3. **Given** un usuario que cerró sesión con "Mantener la sesión" activo, **When** se vuelve a abrir la
   aplicación en ese equipo, **Then** se pide identificarse.

---

### User Story 4 - Mantener la sesión en este equipo (Priority: P2)

En su puesto habitual, el usuario marca "Mantener la sesión iniciada en este equipo" para no tener que
identificarse cada día. Si no la marca, la sesión termina al cerrar el navegador o la aplicación.

**Why this priority**: mejora mucho la comodidad en puestos fijos, pero la aplicación es usable sin ella.

**Independent Test**: se inicia sesión con y sin la casilla marcada, se cierra y reabre el navegador o la
aplicación y se comprueba si se mantiene o no la sesión.

**Acceptance Scenarios**:

1. **Given** un usuario que inicia sesión con "Mantener la sesión" marcado, **When** cierra y vuelve a abrir el
   navegador o la aplicación dentro del periodo de sesión persistente, **Then** entra sin volver a
   identificarse.
2. **Given** un usuario que inicia sesión sin marcar la casilla, **When** cierra y vuelve a abrir el navegador
   o la aplicación, **Then** debe identificarse de nuevo.
3. **Given** una sesión persistente, **When** se supera el periodo máximo de sesión persistente, **Then** el
   usuario debe identificarse de nuevo.

---

### User Story 5 - Bloqueo temporal por intentos fallidos (Priority: P2)

Tras varios intentos fallidos seguidos sobre la misma cuenta, el sistema bloquea temporalmente el acceso a esa
cuenta para frenar ataques de fuerza bruta.

**Why this priority**: es una protección de seguridad importante, pero el inicio de sesión funciona sin ella.

**Independent Test**: se introducen contraseñas erróneas hasta alcanzar el límite y se comprueba que incluso
la contraseña correcta se rechaza hasta que expira el bloqueo.

**Acceptance Scenarios**:

1. **Given** una cuenta con intentos fallidos consecutivos, **When** se alcanza el número máximo, **Then** la
   cuenta queda bloqueada temporalmente y el mensaje indica cuándo podrá volver a intentarlo.
2. **Given** una cuenta bloqueada temporalmente, **When** se introduce la contraseña correcta antes de que
   expire el bloqueo, **Then** se rechaza el acceso.
3. **Given** una cuenta cuyo bloqueo temporal ha expirado, **When** se introduce la contraseña correcta,
   **Then** se accede con normalidad y el contador de intentos fallidos se reinicia.
4. **Given** una cuenta con algún intento fallido previo, **When** se inicia sesión correctamente antes de
   alcanzar el límite, **Then** el contador de intentos fallidos se reinicia.

---

### User Story 6 - Servidor visible y cambiable en escritorio (Priority: P2) — SUSTITUIDA

> **Sustituida** (2026-10-15) por [002-desktop-local-backend](../002-desktop-local-backend/spec.md): en escritorio el
> indicador pasa a ser de base de datos y no hay servidor externo configurable. Se implementó (fase 9) y se
> reemplazará al implementar la 002; no se valida como requisito de cierre de esta spec.

Solo en la versión de escritorio, la pantalla de inicio de sesión muestra a qué servidor está conectada la
aplicación (estado de la conexión y dirección) y ofrece "Cambiar servidor" antes de iniciar sesión. En la
versión web no aparece ni el indicador ni el enlace, porque el servidor es siempre el mismo que sirve la
aplicación.

**Why this priority**: en el escritorio, el puesto puede apuntar a distintos servidores y el usuario necesita
saber si está conectado antes de intentar entrar; en la web no aporta nada.

**Independent Test**: se abre la pantalla de inicio de sesión en web y en escritorio y se comprueba que el
bloque de servidor solo aparece en escritorio, con el estado real de la conexión.

**Acceptance Scenarios**:

1. **Given** la versión de escritorio con servidor accesible, **When** se muestra la pantalla de inicio de
   sesión, **Then** aparecen la dirección del servidor, un indicador de conexión correcta y el enlace "Cambiar
   servidor".
2. **Given** la versión de escritorio sin conexión con el servidor, **When** se muestra la pantalla de inicio de
   sesión, **Then** el indicador muestra "sin conexión" como texto (no solo por color) y el usuario puede ir a
   "Cambiar servidor".
3. **Given** la versión de escritorio, **When** el usuario pulsa "Cambiar servidor", **Then** se le lleva a la
   configuración de servidor sin necesidad de haber iniciado sesión.
4. **Given** la versión web, **When** se muestra la pantalla de inicio de sesión, **Then** no aparecen ni el
   indicador de servidor ni el enlace "Cambiar servidor".

---

### User Story 7 - Primer acceso con la cuenta inicial "admin" (Priority: P1)

En una instalación nueva no hay ningún usuario. Existe una cuenta inicial con identificador "admin" y
contraseña "admin" que permite el primer acceso. La creación del primer usuario real, que tiene que ser
Administrador, la hace el módulo de usuarios. En cuanto existe un usuario real, la cuenta inicial se
elimina y deja de funcionar.

**Why this priority**: sin ella nadie podría entrar por primera vez en una instalación nueva; es
requisito previo para usar cualquier otro módulo.

**Independent Test**: con una base de datos vacía se entra con "admin"/"admin". Después se da de alta un
usuario real (directamente en datos, mientras no exista el módulo de usuarios) y se comprueba que
"admin"/"admin" ya no da acceso y que sus sesiones abiertas dejan de ser válidas.

**Acceptance Scenarios**:

1. **Given** una instalación sin ningún usuario, **When** se inicia sesión con "admin" y contraseña
   "admin", **Then** se accede a la aplicación con el rol Administrador.
2. **Given** una instalación sin ningún usuario, **When** se arranca la aplicación por primera vez,
   **Then** la cuenta inicial existe sin intervención manual.
3. **Given** que ya existe al menos un usuario real, **When** se intenta iniciar sesión con "admin"/"admin",
   **Then** se rechaza con el mensaje genérico de credenciales incorrectas.
4. **Given** una sesión abierta con la cuenta inicial, **When** se crea el primer usuario real, **Then** esa
   sesión deja de ser válida como muy tarde en su siguiente renovación.

---

### Edge Cases

- El usuario introduce el email con mayúsculas o espacios al principio o al final: se trata como el mismo
  email.
- Se envía el formulario con algún campo vacío: no se intenta el acceso y se indica qué campo falta.
- Se pierde la conexión con el servidor al pulsar "Entrar": se muestra un error de conexión distinto del de
  credenciales incorrectas y no cuenta como intento fallido.
- Un administrador bloquea o elimina la cuenta de un usuario con sesión abierta: la siguiente acción de ese
  usuario se rechaza y vuelve al inicio de sesión.
- Un administrador cambia el rol de un usuario con sesión abierta: los nuevos permisos se aplican como muy tarde
  al renovarse su sesión.
- El mismo usuario inicia sesión en varios equipos a la vez: todas las sesiones son válidas de forma
  independiente; cerrar sesión en un equipo no afecta a los demás.
- Se pulsa "Entrar" varias veces seguidas: se procesa un único intento.
- La pantalla de inicio elegida por el usuario ya no está disponible para su rol: llega a la pantalla de inicio
  por defecto.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso y credenciales**

- **FR-001**: El sistema MUST permitir iniciar sesión con email y contraseña a los usuarios activos de la
  empresa, desde la web y desde el escritorio, contra el mismo servidor y con el mismo mecanismo.
- **FR-002**: El sistema MUST tratar el email sin distinguir mayúsculas y minúsculas e ignorando espacios al
  principio y al final.
- **FR-003**: Ante credenciales incorrectas, el sistema MUST mostrar el mensaje genérico "Email o contraseña
  incorrectos" junto con los intentos restantes, sin revelar si el email existe.
- **FR-004**: El sistema MUST impedir el acceso a cuentas bloqueadas por un administrador y a invitaciones no
  completadas, con un mensaje específico para cada caso. El caso de invitación no completada queda sin efecto
  por [003-user-management](../003-user-management/spec.md) (no hay estado Invitado).
- **FR-005**: El sistema MUST asociar a la sesión el rol del usuario (Administrador, Comercial, Almacén o
  Administración) y aplicar desde el primer momento los permisos de la matriz de Ajustes › Usuarios (editar,
  solo ver o sin acceso por módulo). La matriz se guarda en base de datos
  ([003-user-management](../003-user-management/spec.md), FR-020).
- **FR-006**: Tras iniciar sesión, el sistema MUST llevar al usuario a la pantalla que intentaba abrir; si no
  había ninguna, a la pantalla de inicio elegida en Ajustes › Apariencia; si no hay ninguna o no está disponible
  para su rol, a la pantalla de inicio por defecto.

**Protección de la aplicación**

- **FR-007**: Ninguna pantalla ni dato de la aplicación MUST ser accesible sin sesión válida; quien no la tenga
  MUST ser redirigido al inicio de sesión.
- **FR-008**: El servidor MUST rechazar toda petición de datos no autenticada o con sesión caducada con un error
  en el formato común de errores de la aplicación, sin devolver datos de negocio.
- **FR-009**: Las contraseñas NEVER MUST almacenarse ni registrarse en claro, ni devolverse en ninguna
  respuesta.

**Sesión**

- **FR-010**: El sistema MUST mantener la sesión activa mientras el usuario trabaja, sin pedir la contraseña
  durante la actividad continuada.
- **FR-011**: Sin "Mantener la sesión", la sesión MUST terminar al cerrar el navegador o la aplicación y MUST
  caducar tras 30 minutos sin actividad.
- **FR-012**: Con "Mantener la sesión iniciada en este equipo" marcado, la sesión MUST sobrevivir al cierre del
  navegador o la aplicación durante un máximo de 30 días, tras los cuales MUST pedirse identificarse de nuevo.
- **FR-013**: Al cerrar sesión, el sistema MUST invalidar esa sesión de forma que no pueda reutilizarse desde
  ese equipo ni desde ningún otro, y MUST devolver al usuario a la pantalla de inicio de sesión.
- **FR-014**: Si una cuenta se bloquea o elimina, sus sesiones abiertas MUST dejar de ser válidas como muy tarde
  en la siguiente renovación de sesión.

**Bloqueo por intentos fallidos**

- **FR-015**: Tras 5 intentos fallidos consecutivos sobre la misma cuenta, el sistema MUST bloquear
  temporalmente el acceso a esa cuenta durante 15 minutos, rechazando incluso la contraseña correcta.
- **FR-016**: Un inicio de sesión correcto o la expiración del bloqueo MUST reiniciar el contador de intentos
  fallidos.
- **FR-017**: Los fallos de conexión con el servidor NEVER MUST contar como intentos fallidos.

**Servidor (solo escritorio)** — FR-018 sustituido por 002-desktop-local-backend; FR-019 (nada en la web) sigue vigente.

- **FR-018**: En la versión de escritorio, la pantalla de inicio de sesión MUST mostrar la dirección del
  servidor configurado, su estado de conexión expresado como texto y el enlace "Cambiar servidor", accesible
  sin haber iniciado sesión.
- **FR-019**: En la versión web, la pantalla de inicio de sesión NEVER MUST mostrar el indicador de servidor ni
  el enlace "Cambiar servidor"; en todo lo demás la pantalla MUST ser idéntica a la de escritorio.

**Cuenta inicial "admin"**

- **FR-020**: Mientras no exista ningún usuario real, el sistema MUST disponer, sin intervención manual, de
  una cuenta inicial con identificador "admin" y contraseña "admin" y rol Administrador. El campo de acceso
  MUST aceptar "admin" como identificador aunque no tenga formato de email.
- **FR-021**: La creación del primer usuario real, y la regla de que tiene que ser Administrador,
  corresponden al módulo de usuarios y quedan fuera de este módulo.
- **FR-022**: En cuanto exista al menos un usuario real, la cuenta inicial MUST eliminarse, sus sesiones
  MUST dejar de ser válidas como muy tarde en su siguiente renovación y "admin"/"admin" NEVER MUST volver a
  dar acceso.
- **FR-023**: Las contraseñas de los usuarios reales MUST tener al menos 8 caracteres.

**Recuperación de contraseña**

- **FR-026**: El enlace "¿La has olvidado?" NEVER MUST enviar correos en esta entrega. En su lugar MUST
  indicar al usuario que contacte con un administrador para restablecer su contraseña.

**Registro y accesibilidad**

- **FR-024**: El sistema MUST registrar la fecha y hora de cada inicio de sesión correcto para mostrarla como
  "Último acceso" en Ajustes › Usuarios.
- **FR-025**: La pantalla de inicio de sesión MUST tener todos los campos etiquetados, un botón para mostrar u
  ocultar la contraseña con texto accesible, mensajes de error anunciados por lectores de pantalla, objetivos
  táctiles de al menos 44 px y adaptarse a pantallas de móvil, según el diseño «Albarán» (pantallas "Login" y
  "Login · móvil").

### Key Entities

- **Usuario**: persona de la empresa que usa la aplicación. Atributos: nombre, email (único), credencial
  protegida, rol, estado (Activo, Invitado, Bloqueado), pantalla de inicio preferida, fecha del último acceso,
  contador de intentos fallidos y fin del bloqueo temporal si lo hay.
- **Rol**: Administrador, Comercial, Almacén o Administración. Determina los permisos por módulo (editar, solo
  ver o sin acceso).
- **Sesión**: periodo autenticado de un usuario en un equipo concreto. Atributos: usuario, si es persistente,
  inicio, última actividad, caducidad y si ha sido invalidada.
- **Cuenta inicial**: cuenta "admin" con rol Administrador que solo existe mientras no hay usuarios reales.
  Permite el primer acceso para que el módulo de usuarios dé de alta al primer Administrador.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario con credenciales válidas llega a su pantalla de inicio en menos de 3 segundos desde
  que pulsa "Entrar".
- **SC-002**: El 100 % de las peticiones de datos de negocio sin sesión válida se rechazan sin devolver datos.
- **SC-003**: Tras el número máximo de intentos fallidos, el 100 % de los intentos siguientes se rechazan,
  aunque la contraseña sea correcta, hasta que expire el bloqueo.
- **SC-004** — **Sustituido** por [002-desktop-local-backend](../002-desktop-local-backend/spec.md): en
  escritorio el indicador pasa a ser de base de datos. En la versión web nunca aparece el indicador de servidor
  ni el enlace "Cambiar servidor"; en escritorio aparecen siempre en la pantalla de inicio de sesión.
- **SC-005**: Un usuario que trabaja de forma continuada durante una jornada de 8 horas no tiene que volver a
  introducir la contraseña.
- **SC-006**: Al menos el 95 % de los usuarios completan el inicio de sesión al primer intento con sus
  credenciales correctas, sin ayuda.
- **SC-007**: En una instalación nueva se puede entrar con "admin"/"admin" sin ninguna preparación manual y,
  en cuanto existe un usuario real, "admin"/"admin" no da acceso en el 100 % de los intentos.

## Assumptions

- Los usuarios ya existen o se dan de alta desde Ajustes › Usuarios; la gestión de usuarios (invitar,
  cambiar rol, bloquear manualmente) queda fuera de este módulo. El primer Administrador lo crea el módulo
  de usuarios, al que se accede con la cuenta inicial "admin" (historia 7).
- Mientras no exista el módulo de usuarios, la cuenta inicial "admin" tiene acceso de Administrador a toda
  la aplicación. Es un riesgo aceptado temporalmente: las credenciales son públicas y la cuenta sigue activa
  hasta que se crea el primer usuario real.
- Completar el alta de un usuario invitado (definir su primera contraseña desde la invitación) pertenece a la
  gestión de usuarios y no a este módulo.
- La pantalla de inicio por defecto es el Panel. Mientras el Panel no esté diseñado e implementado, la pantalla
  de inicio por defecto será Productos.
- Valores de seguridad confirmados: 30 minutos de inactividad, 30 días de sesión persistente, 5 intentos
  fallidos, 15 minutos de bloqueo y contraseña de al menos 8 caracteres.
- El envío de correos se pospone hasta nuevo aviso. Mientras tanto, la recuperación de contraseña por email
  queda fuera de alcance y el restablecimiento lo hace un administrador desde la gestión de usuarios.
- La configuración del servidor a la que lleva "Cambiar servidor" (Ajustes › Base de datos) existe o se
  implementa en otro módulo; aquí solo se enlaza.
- Quedan fuera de alcance el inicio de sesión con proveedores externos (Google, Microsoft) y el doble factor.
