---
name: "transcript-digest"
description: "Destila una transcripción de reunión con el cliente (docs/transcriptions/<id>-<nombre>.txt, texto plano sin hablantes anotados) en un resumen de requisitos trazable (docs/discovery/<id>-<nombre>.md): necesidades, reglas de negocio, contradicciones y preguntas abiertas, cada una con su cita y línea de origen. Es el paso previo a /speckit-detect."
argument-hint: "Id o ruta de la transcripción (p. ej. 001 o docs/transcriptions/001-reunion-ventas.txt)"
metadata:
  author: "app-b2b"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

El argumento identifica la transcripción: una ruta, o un `<id>` que se resuelve buscando `docs/transcriptions/<id>-*.txt`. Si está vacío, lista los archivos de `docs/transcriptions/` que aún no tienen resumen en `docs/discovery/` y pregunta cuál destilar. Si el `<id>` coincide con varios archivos o con ninguno, pregunta y detente.

## Objetivo

Convertir una conversación en bruto en un **resumen de requisitos** que sea la fuente de verdad para escribir specs. A partir de aquí nadie vuelve a leer la transcripción para especificar: se trabaja con el resumen aprobado. La transcripción solo se consulta para verificar citas (agente `requirements-tracer`).

**Restricciones (MUST):**

- Solo escribe un archivo: `docs/discovery/<id>-<nombre>.md` (mismo `<id>-<nombre>` que la transcripción). NEVER modifica la transcripción, NEVER crea specs ni ramas ni invoca `/speckit-detect` por su cuenta.
- Todo elemento del resumen MUST llevar **cita literal breve** y **referencia de origen**: rango de líneas y, si la transcripción tiene marcas de tiempo, la marca del bloque (`L119 (17:23)`, `L119–L122 (17:23–17:54)`). La cita MUST ser literal, con los errores de transcripción incluidos: sirve para localizar el fragmento dentro de la línea. Lo que no se puede citar no entra.
- NEVER inventes requisitos, cifras ni reglas para completar huecos: un hueco es una **pregunta abierta**.
- Sin detalles de implementación (endpoints, colecciones, librerías): el *qué* y el *por qué*.
- Anonimiza: sustituye nombres de personas y datos de contacto por su rol (`[cliente]`, `[comercial]`, `[proveedor X]`). Los nombres de producto o de negocio que sean necesarios para entender un requisito pueden quedarse.
- Toda la salida en **español**.

## Paso 1 · Cargar contexto

1. La transcripción completa, con números de línea (Read los da). Detecta su formato:
   - **Marcas de tiempo**: líneas solas del tipo `mm:ss` o `hh:mm:ss` que abren un bloque. La marca se aplica a las líneas siguientes hasta la próxima marca. No son contenido: no se citan ni se extraen.
   - **Bloques por tiempo, no por turno**: si las líneas son largas y cada una cubre un intervalo fijo de grabación, una misma línea puede contener varios hablantes (Paso 2).
   - **Huecos**: inicio a mitad de frase, líneas cortadas o bloques vacíos. Anótalos para el apartado «Calidad de la transcripción».
2. `CLAUDE.md`, sección **Contexto**: dominios (productos, clientes, proveedores, ventas, cobros) y canales (web, escritorio).
3. `docs/design/README.md`: pantallas diseñadas y pendientes.
4. Cabecera e historias de usuario de cada `specs/*/spec.md` (no el archivo entero), para marcar lo que ya está cubierto.
5. Si ya existe `docs/discovery/<id>-<nombre>.md`, léelo: esta ejecución lo **actualiza**, conservando los ids existentes y las decisiones marcadas por el usuario.

## Paso 2 · Inferir hablantes

La transcripción no indica quién habla. Antes de extraer nada:

1. Divide el texto en **turnos** (cambio de hablante probable: pregunta → respuesta, cambio de registro, «sí, y además…» tras una pregunta). Los turnos se cortan **por frase, no por línea**: una línea puede empezar con la pregunta del equipo y seguir con la respuesta del cliente («¿Siempre es el mismo o va variando? Depende del proveedor…»), y un turno puede continuar en la línea siguiente.
2. Asigna a cada turno un rol con confianza:
   - **Cliente**: describe su negocio, su operativa actual, sus problemas, lo que «necesita», «quiere» o «hacemos así».
   - **Equipo**: pregunta, resume, propone soluciones, habla de la aplicación o de plazos.
   - **Incierto**: no hay señales suficientes.
3. Regla de oro: **un requisito solo es firme si lo afirma o lo confirma el cliente**. Una propuesta del equipo sin confirmación explícita («sí», «eso es», «perfecto») es una **propuesta pendiente de confirmar**, no un requisito. Un turno incierto genera, como mucho, una pregunta abierta.

Puede haber más de dos personas (p. ej. alguien del lado del cliente que se cita o interviene: «lo que dijo mi madre»). Cuenta como cliente a cualquiera que hable desde el negocio del cliente.

No incluyas la segmentación de turnos en el resumen; solo el rol inferido en cada cita.

## Paso 2b · Normalizar errores de transcripción

La transcripción suele ser automática y deforma palabras («Varane», «varón» o «barán» por *albarán*; «pajos de stock» o «bajo texto» por *bajo stock*). Mientras lees:

1. Identifica las deformaciones por contexto y por el vocabulario del dominio (`CLAUDE.md`, specs existentes).
2. En el texto del resumen (columna de necesidad, regla o pregunta) usa siempre el término **corregido**; en la columna de cita, el texto **literal**.
3. Registra cada corrección en el **Glosario de transcripción** con todas sus variantes y su confianza. Si una corrección es dudosa («disona»: ¿nombre de proveedor?), no la adivines: márcala `?` y, si afecta a un requisito, crea una pregunta abierta.
4. Los nombres propios de empresas proveedoras o productos se conservan aunque estén mal escritos; si hay varias grafías del mismo nombre, unifícalas en el glosario.

## Paso 2c · Referencias a pantalla

En una reunión con demo se señala lo que se está viendo («lo que se puede ver ya aquí», «lo que sale aquí que pone compras año»). El resumen no puede ver esa pantalla:

- Si el contexto identifica sin duda la pantalla y el elemento (p. ej. una columna nombrada de una pantalla ya diseñada en `docs/design/`), redacta el requisito explícito y menciona la pantalla.
- Si no, el elemento es una **pregunta abierta** («¿qué datos de la pantalla de proveedores mostrada en 03:51 da por buenos el cliente?»), nunca un requisito.
- Marca estas citas con `[ref. pantalla]` en la columna de cita.

## Paso 3 · Extraer

Recorre la transcripción y extrae elementos de cuatro tipos. Cada uno con id estable:

| Tipo | Id | Qué es |
|---|---|---|
| Necesidad | `N-01` | Algo que el cliente necesita hacer o ver. Actor + acción + objeto. |
| Regla de negocio | `R-01` | Restricción, cálculo, estado o permiso («un pedido facturado no se modifica»). |
| Contradicción | `C-01` | Dos afirmaciones incompatibles, o un cambio de opinión. Cita ambas; si la última es clara y la confirma el cliente, indícalo como resolución probable. |
| Pregunta abierta | `P-01` | Hueco, ambigüedad o propuesta del equipo sin confirmar. Formulada para hacérsela al cliente. |

Para cada elemento: dominio (de `CLAUDE.md`), cita literal, origen (líneas y marca de tiempo), rol del hablante y confianza (`alta` si lo afirma el cliente sin ambigüedad, `media` si se infiere de varias frases, `baja` si el hablante es incierto).

Descarta: saludos, logística de la reunión, digresiones y repeticiones (si algo se repite, quédate con la formulación más clara y anota todas las líneas).

## Paso 4 · Escribir el resumen

Escribe `docs/discovery/<id>-<nombre>.md` con esta estructura:

```markdown
# Resumen de requisitos · <nombre legible>

- **Transcripción**: docs/transcriptions/<id>-<nombre>.txt
- **Fecha del resumen**: <AAAA-MM-DD>
- **Estado**: borrador | aprobado

## Resumen

3–5 líneas: de qué trató la reunión y qué dominios toca.

## Necesidades

### <Dominio>

| Id | Necesidad | Cita | Origen | Hablante | Confianza | Ya cubierto |
|---|---|---|---|---|---|---|
| N-01 | Ver las compras a cada proveedor por trimestre, que cuadren con el total anual | «la cantidad que se ha comprado cada trimestre y que luego cuadre con la compra anual» | L122 (17:54) | cliente | alta | — |

## Reglas de negocio

(misma tabla, ids R-xx)

## Contradicciones

| Id | Afirmación A (origen) | Afirmación B (origen) | Resolución probable |
|---|---|---|---|

## Preguntas abiertas para el cliente

Lista numerada P-xx, priorizada por impacto (alcance > dinero/cobros > permisos > UX), cada una con el origen (líneas y marca de tiempo) que la motiva.

## Fuera de alcance mencionado

Cosas que el cliente descartó o aplazó explícitamente, con su cita.

## Glosario de transcripción

| Literal en la transcripción | Término corregido | Origen | Confianza |
|---|---|---|---|
| «Varane», «varón», «barán» | albarán | L77, L89, L131 | alta |

## Calidad de la transcripción

Huecos detectados (inicio a mitad de frase, líneas cortadas, bloques vacíos), número estimado de participantes y cualquier tramo ininteligible, con su origen.
```

El estado inicial es siempre `borrador`.

## Paso 5 · Revisar con el usuario

Muestra en el chat (≤20 líneas): número de elementos por tipo y dominio, las contradicciones y las 3 preguntas abiertas de más impacto. Pide al usuario que corrija: elementos mal interpretados, hablantes mal asignados, cosas dichas en broma o ya descartadas.

Aplica sus correcciones en el archivo conservando los ids (un elemento eliminado deja su id sin reutilizar). Cuando el usuario lo apruebe, cambia **Estado** a `aprobado` y sugiere el siguiente paso:

```text
/speckit-detect docs/discovery/<id>-<nombre>.md
```
