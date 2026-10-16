---
name: "speckit-detect"
description: "Analyze a plain-text request and split it into the most reasonable set of specs, producing a structured proposal (one ready-to-use /speckit-specify prompt per spec) for user approval. Does not create specs, folders or branches."
argument-hint: "Pega el texto plano con la petición (requisitos, email, notas de reunión...)"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "app-b2b"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

El texto que el usuario escribió tras `/speckit-detect` **es** la petición a analizar. Si está vacío, pide el texto y detente. No pidas que lo repita si ya está en la conversación.

## Objetivo

Convertir una petición en texto libre en una **propuesta de specs** bien delimitadas, para que el usuario la apruebe y después lance `/speckit-specify` una vez por spec.

**Restricciones (MUST):**

- Esta skill es de **solo lectura**: NEVER crea directorios en `specs/`, NEVER modifica `.specify/feature.json`, NEVER crea ramas ni invoca `/speckit-specify` por su cuenta.
- La propuesta se muestra **solo en el chat**; no se escribe en ningún archivo.
- Toda la salida va en **español**.
- Sin detalles de implementación (frameworks, endpoints, colecciones): las specs describen el *qué* y el *por qué*, igual que `/speckit-specify`.

## Paso 1 · Cargar contexto

1. `.specify/memory/constitution.md` (si existe): principios y dominios del proyecto.
2. `CLAUDE.md`, sección **Contexto**: dominios de negocio (productos, clientes, proveedores, ventas, cobros) y canales (web, escritorio).
3. `docs/design/README.md` (si existe): pantallas diseñadas y pendientes de diseño.
4. Specs existentes: lista los directorios de `specs/` y lee la cabecera y las historias de usuario de cada `spec.md` (no el archivo entero). Sirve para:
   - No proponer lo que ya está especificado.
   - Detectar dependencias con specs existentes.
   - Calcular el siguiente número: lee `feature_numbering` en `.specify/init-options.json`. Si es `sequential` o no existe, el siguiente `NNN` libre. Si es `timestamp`, indica «número asignado por `/speckit-specify`».

## Paso 2 · Extraer capacidades

Lee la petición y extrae una lista plana de **capacidades**. Cada capacidad tiene:

- **Actor**: quién la usa (administrador, comercial, almacén, cliente...).
- **Acción y objeto**: qué hace y sobre qué dato.
- **Restricciones**: reglas de negocio, permisos, límites, canal (web/escritorio).
- **Origen**: la frase de la petición que la justifica (cita breve).

Además, separa:

- **Requisitos no funcionales** (rendimiento, auditoría, offline...). Asígnalos a la spec afectada o, si afectan a varias, a una spec transversal.
- **Ambigüedades**: como máximo 3 dudas, priorizadas por impacto (alcance > seguridad/privacidad > UX > detalle técnico). Para todo lo demás, asume un valor razonable y déjalo como supuesto.
- **Ya cubierto**: capacidades que ya resuelve una spec existente.

## Paso 3 · Dividir en specs

Agrupa las capacidades en specs aplicando estas reglas, en orden:

1. **Valor independiente**: cada spec entrega algo usable y comprobable por sí sola (un MVP demostrable).
2. **Un dominio por spec**: no mezcles productos con cobros en la misma spec, salvo que sea una capacidad transversal (auth, permisos, auditoría, ajustes).
3. **Tamaño razonable**:
   - Más de unas 6 historias de usuario, o más de un flujo principal independiente → **divide**.
   - Una sola historia trivial que no se sostiene sola → **fusiona** con la spec más afín.
4. **Dependencias explícitas**: si B necesita datos o flujos de A, A va primero. Evita ciclos; si aparece uno, reorganiza el corte.
5. **Diseño visual**: si una spec toca pantallas marcadas como pendientes de diseño en `docs/design/README.md`, añádelo como riesgo o dependencia.

Tamaño estimado:

- **S**: 1–2 historias, un solo flujo.
- **M**: 3–4 historias.
- **L**: 5–6 historias. Si pasa de L, divide.

Prioridad:

- **P1**: imprescindible para que el resto tenga sentido, o bloquea otras specs.
- **P2**: valor de negocio alto, pero no bloquea.
- **P3**: mejora o extra.

## Paso 4 · Presentar la propuesta

Usa exactamente esta estructura:

```markdown
# Propuesta de specs · <tema en 3-6 palabras>

## Resumen

<2-3 frases: qué pide el texto y cómo se ha dividido.>

| # | Short-name | Dominio | Prioridad | Tamaño | Depende de |
|---|---|---|---|---|---|
| 002 | customer-pricing-tiers | clientes | P1 | M | — |
| 003 | ... | ... | ... | ... | 002 |

## Specs

### 002 · customer-pricing-tiers

- **Objetivo**: <una frase de valor de negocio>
- **Historias de usuario**:
  1. Como <actor>, quiero <acción> para <beneficio>. (P1)
  2. ...
- **Fuera de alcance**: <qué no entra y en qué spec va, si aplica>
- **Supuestos**: <decisiones tomadas por defecto>
- **Dudas abiertas**: <solo si afectan a esta spec; si no, «Ninguna»>
- **Prompt para `/speckit-specify`**:

  ```text
  <descripción autocontenida de la feature: actores, flujos, reglas de negocio,
  supuestos y fuera de alcance. Sin detalles técnicos. Debe poder entenderse
  sin haber leído el texto original.>
  ```

(repetir por spec)

## Ya cubierto por specs existentes

- <capacidad> → `specs/001-user-login` (o «Nada»)

## Dudas globales (máx. 3)

1. <pregunta> · Opciones: A) ... B) ... · Por defecto: <opción>

## Orden recomendado

1. 002 → 2. 003 → ... (<motivo breve>)
```

Reglas del prompt para `/speckit-specify`:

- Autocontenido: incluye el contexto necesario y no remite al texto original.
- Incluye las historias, las reglas de negocio y los supuestos de esa spec, y lo que queda fuera de alcance.
- Si hay una duda abierta que afecta a la spec, inclúyela marcada como `[DUDA: ...]`, para que `/speckit-specify` la convierta en `[NEEDS CLARIFICATION]` o `/speckit-clarify` la resuelva.

## Paso 5 · Aprobación

Termina **siempre** con este bloque y espera la respuesta del usuario:

```markdown
## ¿Siguiente paso?

- **Aprobar** todo o una selección (p. ej. «aprueba 002 y 004»).
- **Ajustar**: fusionar, dividir, renombrar, cambiar prioridades o descartar specs.
- **Responder dudas**: actualizo la propuesta con tus respuestas.
```

Según la respuesta:

- **Ajustes o respuestas a dudas** → vuelve a presentar la propuesta completa actualizada (Paso 4) y pide aprobación de nuevo.
- **Aprobación** → muestra las invocaciones en el orden recomendado, una por spec, con el prompt aprobado:

  ```text
  /speckit-specify <prompt de la spec 002>
  ```

  Recuerda que `/speckit-specify` crea **una sola feature por invocación** y actualiza `.specify/feature.json`, así que hay que lanzarlas de una en una y completar el ciclo (`plan` → `tasks` → `implement`) o al menos el `specify` de cada una antes de la siguiente. Lanza `/speckit-specify` solo si el usuario lo pide explícitamente; nunca por iniciativa propia.
