# Feature Specification: Escritorio con backend local y base de datos configurable

**Feature Branch**: `002-desktop-local-backend`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Escritorio con backend local y base de datos MongoDB configurable. Hoy la app de escritorio es solo una ventana que carga el cliente y habla con un servidor API externo cuya URL se guarda en la configuración del equipo; el login de escritorio muestra «Servidor: <url> · Conectado/Sin conexión» y «Cambiar servidor» (US6 de 001-user-login). Se quiere que la instalación de escritorio sea local y pueda tener la base de datos en remoto y conectarse cuando quiera. Decisiones: (1) el escritorio solo se conecta directamente a MongoDB, arrancando su propio backend local (el mismo apps/server) con la cadena de conexión configurada, local o remota; (2) el indicador del login pasa a ser de base de datos: host de MongoDB (nunca usuario ni contraseña), estado real en texto y enlace «Cambiar base de datos»; (3) se puede cambiar desde el login, sin sesión y sin contraseña adicional; (4) la cadena de conexión se guarda cifrada y nunca en texto plano ni completa en la interfaz; (5) al cambiar la base de datos se reconecta sin reiniciar y las sesiones abiertas dejan de valer; la cuenta inicial «admin» sigue funcionando por base de datos. La web no cambia. Sustituye a la US6 de 001-user-login. Referencias: tableros Ajustes › Base de datos (modo «MongoDB directo») y Login. Fuera de alcance: modo API en escritorio y el resto de Ajustes."

## Clarifications

### Session 2026-10-15

- Q: ¿El escritorio admite también conectarse a la API del servidor de la empresa? → A: No. El escritorio solo se
  conecta directamente a una base de datos; el modo API queda fuera de alcance.
- Q: ¿Dónde se documenta el cambio? → A: En esta spec nueva (002), que sustituye a la US6 de 001-user-login.
- Q: ¿Hace falta alguna contraseña para cambiar la base de datos desde el login? → A: No. Cualquiera con acceso al
  equipo puede cambiarla sin iniciar sesión ni introducir una contraseña adicional.
- Q: ¿El escritorio debe poder trabajar sin conexión a la base de datos y sincronizar después? → A: No. Sin modo
  offline: la aplicación solo funciona mientras está conectada a la base de datos configurada; «conectarse cuando
  quiera» significa poder cambiar de base de datos en cualquier momento.
- Q: ¿La conexión con una base de datos remota debe ir cifrada? → A: Sí, obligatorio cuando el servidor no es el
  propio equipo; en el propio equipo se permite sin cifrar.
- Q: ¿El indicador del login se comprueba solo al abrir la pantalla o se actualiza solo? → A: Solo al abrir el login
  y después de guardar una base de datos nueva; no hay comprobación periódica.
- Q: ¿También se podrá cambiar la base de datos desde dentro de la aplicación, con sesión iniciada? → A: No. Solo
  desde el login, sin sesión; Ajustes › Base de datos queda para la spec de Ajustes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conectar el escritorio a una base de datos local o remota (Priority: P1) 🎯 MVP

En el puesto del almacén o de la tienda, la persona que instala o mantiene la aplicación de escritorio indica a qué
base de datos debe conectarse (en el propio equipo o en un servidor remoto). La aplicación funciona por sí sola, sin
necesidad de un servidor de la empresa intermedio: en cuanto la base de datos está accesible, se puede iniciar sesión
y trabajar.

**Why this priority**: sin una base de datos configurada el escritorio no puede hacer nada. Es la condición para que
la instalación local sea útil, y es lo que pide el usuario: tener la base de datos en remoto y conectarse cuando
quiera.

**Independent Test**: en una instalación de escritorio recién hecha, abrir la configuración desde el login,
introducir la cadena de conexión de una base de datos remota vacía, probar la conexión, guardarla y entrar con la
cuenta inicial «admin»/«admin».

**Acceptance Scenarios**:

1. **Given** una instalación de escritorio sin base de datos configurada, **When** se abre la aplicación, **Then** el
   login indica que no hay base de datos configurada y ofrece «Configurar base de datos».
2. **Given** la pantalla de configuración, **When** se introduce una cadena de conexión válida y se pulsa «Probar
   conexión», **Then** se indica en texto si la base de datos responde o no, sin guardar nada todavía.
3. **Given** una cadena de conexión introducida, **When** se pulsa «Guardar», **Then** la aplicación pasa a usar esa
   base de datos sin reiniciarse y vuelve al login con el indicador actualizado.
4. **Given** una base de datos vacía recién configurada, **When** se entra con «admin»/«admin», **Then** se accede
   como Administrador (cuenta inicial de 001-user-login, US7).
5. **Given** una cadena de conexión con formato no válido, **When** se intenta probar o guardar, **Then** se indica
   qué falla y no se guarda.
6. **Given** una cadena de conexión a un servidor remoto sin cifrado, **When** se intenta probar o guardar, **Then**
   se rechaza indicando que las bases de datos remotas exigen conexión cifrada.

---

### User Story 2 - Ver a qué base de datos está conectado el escritorio (Priority: P1)

Solo en la versión de escritorio, la pantalla de inicio de sesión muestra a qué base de datos está conectada la
aplicación (el servidor de base de datos, sin credenciales) y si la conexión funciona en este momento, expresado como
texto. Desde ahí se puede ir a «Cambiar base de datos» sin haber iniciado sesión.

**Why this priority**: si la base de datos no responde, nadie puede entrar. Ver el estado real antes de intentar
iniciar sesión evita confundir un fallo de conexión con unas credenciales incorrectas, y permite corregir la
configuración sin ayuda.

**Independent Test**: abrir el login de escritorio con la base de datos accesible y después con ella detenida, y
comprobar el texto del estado en cada caso; abrir el login en la web y comprobar que no aparece nada de esto.

**Acceptance Scenarios**:

1. **Given** el escritorio con la base de datos accesible, **When** se muestra el login, **Then** aparecen el
   servidor de la base de datos, el estado «Conectado» en texto y el enlace «Cambiar base de datos».
2. **Given** el escritorio con la base de datos inaccesible, **When** se muestra el login, **Then** el estado indica
   «Sin conexión» en texto y, al pulsar «Entrar», se muestra un error de conexión que no cuenta como intento fallido.
3. **Given** el indicador del login, **When** la cadena de conexión incluye usuario y contraseña, **Then** el
   indicador muestra solo el servidor, nunca el usuario ni la contraseña.
4. **Given** la versión web, **When** se muestra el login, **Then** no aparece el indicador de base de datos ni el
   enlace «Cambiar base de datos» (igual que en 001-user-login, FR-019).

---

### User Story 3 - Cambiar de base de datos sin perder la seguridad (Priority: P2)

Quien tenga acceso al equipo puede cambiar de base de datos en cualquier momento desde el login, por ejemplo para
pasar de una base de datos local de pruebas a la remota de la empresa. Al cambiarla, nadie sigue trabajando con
sesiones de la base de datos anterior, y las credenciales de conexión nunca quedan expuestas.

**Why this priority**: el cambio de base de datos es lo que da flexibilidad al usuario, pero no es imprescindible
para el primer uso (US1). La protección de las credenciales y de las sesiones es obligatoria en cuanto el cambio
existe.

**Independent Test**: con una sesión iniciada y «Mantener la sesión» marcado, cambiar a otra base de datos desde el
login de otra ventana o tras cerrar sesión, y comprobar que la sesión anterior ya no vale; revisar los archivos de
configuración del equipo y comprobar que la contraseña no aparece en claro.

**Acceptance Scenarios**:

1. **Given** una base de datos configurada con contraseña, **When** se abre «Cambiar base de datos», **Then** la
   cadena actual se muestra con la contraseña oculta.
2. **Given** una sesión abierta o guardada con «Mantener la sesión», **When** se cambia a otra base de datos,
   **Then** esa sesión deja de valer y la aplicación vuelve a pedir identificarse.
3. **Given** una configuración guardada, **When** se revisan los archivos del equipo, **Then** la cadena de conexión
   no aparece en texto plano.
4. **Given** un equipo en el que el sistema operativo no permite cifrar datos, **When** se guarda una base de datos,
   **Then** se avisa de que la configuración solo durará mientras la aplicación siga abierta y no se escribe en
   disco.

### Edge Cases

- La base de datos deja de responder mientras se trabaja: las acciones muestran un error de conexión y el indicador
  del login refleja «Sin conexión»; cuando la base de datos vuelve, la aplicación se recupera sin reiniciarse.
- Se guarda una base de datos que en ese momento no responde: se permite guardarla (puede ser una caída temporal),
  avisando de que no hay conexión.
- «Probar conexión» con una base de datos que no responde: el resultado llega como mucho en 10 segundos y nunca deja
  la pantalla bloqueada.
- Se cambia a una base de datos que ya tiene usuarios reales: la cuenta inicial «admin» no existe en ella y se entra
  con sus usuarios.
- Dos instalaciones de escritorio apuntan a la misma base de datos remota: trabajan sobre los mismos datos y cada una
  mantiene sus propias sesiones.
- La cadena de conexión guardada no se puede descifrar (por ejemplo, otra cuenta del sistema operativo): se trata
  como si no hubiera base de datos configurada.
- La base de datos cae o vuelve mientras el login ya está abierto: el indicador mantiene el último estado comprobado
  hasta que se vuelve a abrir el login; al pulsar «Entrar», el resultado real (acceso o error de conexión) manda.
- Se abre la configuración y se sale sin guardar: la base de datos y las sesiones actuales no cambian.

## Requirements *(mandatory)*

### Functional Requirements

**Funcionamiento autónomo**

- **FR-001**: La versión de escritorio MUST funcionar sin un servidor intermedio de la empresa: incluye su propio
  servicio local, que se conecta directamente a la base de datos configurada.
- **FR-002**: La base de datos configurada MUST poder estar en el propio equipo o en un servidor remoto, indicada
  mediante una cadena de conexión estándar.
- **FR-003**: El servicio local MUST ser accesible solo desde el propio equipo.
- **FR-004**: Todo lo definido en 001-user-login (inicio de sesión, inactividad, «Mantener la sesión», cierre de
  sesión, bloqueo temporal y cuenta inicial «admin») MUST seguir funcionando igual en el escritorio, aplicado a la
  base de datos configurada.

**Indicador en el login (solo escritorio)**

- **FR-005**: En el escritorio, la pantalla de inicio de sesión MUST mostrar el servidor de la base de datos
  configurada y su estado de conexión real expresado como texto: «Conectado», «Sin conexión», «Comprobando…» o «Sin
  configurar». El estado MUST comprobarse al abrir la pantalla de inicio de sesión y después de guardar una base de
  datos; no se comprueba periódicamente mientras la pantalla sigue abierta.
- **FR-006**: El indicador NEVER MUST mostrar el usuario ni la contraseña de la cadena de conexión.
- **FR-007**: El login de escritorio MUST ofrecer el enlace «Cambiar base de datos» («Configurar base de datos» si no
  hay ninguna), accesible sin haber iniciado sesión y sin pedir ninguna contraseña adicional. Es el único punto
  desde el que se cambia la base de datos: dentro de la aplicación, con sesión iniciada, no hay opción para hacerlo.
- **FR-008**: En la versión web, la pantalla de inicio de sesión NEVER MUST mostrar el indicador ni el enlace; la web
  sigue funcionando contra el servidor de la empresa como hasta ahora.

**Configuración de la base de datos (solo escritorio)**

- **FR-009**: La pantalla de configuración MUST permitir introducir la cadena de conexión, «Probar conexión» y
  «Guardar». «Probar conexión» MUST responder en texto en 10 segundos como máximo y NEVER MUST guardar nada.
- **FR-010**: El sistema MUST rechazar, con un mensaje que indique el problema, una cadena de conexión con formato no
  válido.
- **FR-011**: Al guardar, la aplicación MUST pasar a usar la nueva base de datos sin reiniciarse.
- **FR-012**: Al cambiar de base de datos, todas las sesiones abiertas o guardadas en el equipo MUST dejar de valer
  y la aplicación MUST volver a pedir identificarse.
- **FR-013**: Una vez guardada, la cadena de conexión NEVER MUST volver a mostrarse con la contraseña en claro.

**Protección de las credenciales**

- **FR-014**: La cadena de conexión MUST guardarse cifrada con las credenciales de la cuenta del sistema operativo;
  NEVER MUST escribirse en texto plano en disco.
- **FR-015**: La interfaz de la aplicación NEVER MUST recibir la cadena de conexión completa una vez guardada: solo
  el servidor y una versión con la contraseña oculta.
- **FR-016**: Si el servidor de la base de datos no es el propio equipo, la conexión MUST ir cifrada: una cadena de
  conexión remota sin cifrado MUST rechazarse al probarla o guardarla, indicando el motivo. Con el servidor en el
  propio equipo se permite sin cifrar.
- **FR-017**: Si el sistema operativo no permite cifrar, la base de datos configurada MUST conservarse solo mientras
  la aplicación siga abierta, avisando al usuario.

**Errores de conexión**

- **FR-018**: Los fallos de conexión con la base de datos NEVER MUST contar como intentos fallidos de inicio de
  sesión, y MUST mostrarse con un mensaje distinto del de credenciales incorrectas.
- **FR-019**: Si la base de datos deja de responder y vuelve, la aplicación MUST recuperarse sin reiniciarse.
- **FR-020**: Sin conexión con la base de datos NO se puede trabajar: la aplicación NEVER MUST guardar datos de
  negocio en local para sincronizarlos después ni mostrar datos de una copia local.

**Relación con 001-user-login**

- **FR-021**: Esta especificación sustituye a la US6 de 001-user-login («Servidor visible y cambiable en
  escritorio») y a sus requisitos FR-018 y SC-004 en lo que respecta al escritorio. El FR-019 de 001 (nada de esto en
  la web) se mantiene.

### Key Entities

- **Configuración de base de datos**: la cadena de conexión elegida para el equipo (cifrada), el servidor que se
  muestra en el indicador y la versión con la contraseña oculta. Una sola por instalación de escritorio.
- **Estado de conexión**: si la base de datos responde en este momento; se expresa como «Conectado», «Sin conexión»,
  «Comprobando…» o «Sin configurar».

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En una instalación nueva, una persona configura una base de datos remota y entra con «admin»/«admin»
  en menos de 2 minutos, sin editar archivos a mano.
- **SC-002**: Tras guardar otra base de datos, el indicador del login muestra el nuevo servidor y su estado en menos
  de 10 segundos y sin reiniciar la aplicación.
- **SC-003**: En el 100 % de los casos el indicador expresa el estado como texto y coincide con la disponibilidad
  real de la base de datos en el momento de abrir el login o de guardar la configuración.
- **SC-004**: En ninguna pantalla ni en ningún archivo del equipo aparece la contraseña de la base de datos en claro,
  y ninguna conexión con una base de datos remota viaja sin cifrar.
- **SC-005**: Tras cambiar de base de datos, el 100 % de las sesiones anteriores del equipo dejan de valer.
- **SC-006**: La versión web no muestra en ningún caso el indicador ni el enlace de base de datos.

## Assumptions

- Una instalación de escritorio trabaja con una sola base de datos a la vez; el nombre de la base de datos va dentro
  de la cadena de conexión.
- En el primer arranque no hay base de datos configurada: no se presupone ninguna por defecto, para no conectar por
  error a una base de datos equivocada.
- Se puede guardar una base de datos que no responde en ese momento (avisando), porque una base de datos remota puede
  estar caída temporalmente.
- Cualquiera con acceso al equipo puede cambiar la base de datos (decisión del usuario); la protección de las
  credenciales se apoya en el cifrado de la cuenta del sistema operativo.
- La configuración se hace en una pantalla propia de escritorio, accesible solo desde el login, que sigue el tablero
  Ajustes › Base de datos (modo «MongoDB directo»). La pestaña Ajustes › Base de datos dentro de la aplicación, el
  resto de Ajustes (Apariencia, Usuarios) y el modo API en escritorio quedan fuera de alcance; la spec de Ajustes
  podrá enlazar a esta misma configuración.
- La versión web y el servidor de la empresa no cambian.
- No hay modo sin conexión (ni con sincronización posterior ni de solo lectura): si se quisiera, sería una spec
  propia.
- Las reglas de 001-user-login (duración de sesión, intentos, bloqueo, cuenta inicial) se aplican sin cambios.
