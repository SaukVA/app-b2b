# Resumen de requisitos · Reunión sobre proveedores y compras

- **Transcripción**: docs/transcriptions/001-proveedores.txt
- **Fecha del resumen**: 2026-10-26
- **Estado**: aprobado (2026-10-26)

## Resumen

Reunión con el cliente, con demo de la pantalla de Proveedores (tablero `Proveedores.dc.html`), sobre qué datos guarda de cada proveedor y cómo hace hoy sus compras. Además de la ficha del proveedor, la conversación entra en el circuito de compra (pedido o lista de compra → albarán de compra → factura), la relación de un producto con varios proveedores, el historial de productos y el volumen de compras por trimestre para el modelo 347. Toca Proveedores (incluidas las compras), Productos y, de pasada, Clientes.

## Necesidades

### Proveedores · ficha

| Id | Necesidad | Cita | Origen | Hablante | Confianza | Ya cubierto |
|---|---|---|---|---|---|---|
| N-01 | Guardar los datos fiscales y postales del proveedor: nombre, CIF, dirección, código postal y población, necesarios para los datos de las facturas | «uno mínimo el nombre» · «El CIF el CIF, la dirección» · «Yo necesito la dirección código postal. Población» | L11–L17 (01:33–02:22) | equipo (L11) / cliente (L14–L17) | alta | Parcial: 009 tiene nombre y búsqueda por CIF. Dirección, CP y población obligatorios (confirmado 2026-10-26, P-06) |
| N-02 | Guardar varios teléfonos y correos de contacto del proveedor (información, facturación…) | «un sitio donde poner un número de contacto, un sitio donde poner un mail» · «correos de información correos de facturación» · «los números son distintos» | L17–L23 (02:22–03:20) | cliente | alta | — |
| N-03 | Guardar la página web del proveedor o el sitio donde se le hacen los pedidos | «Algo sobre la página web de la empresa, a lo mejor o dónde hago los pedidos de esa empresa» | L20 (02:47) | cliente | alta | — |
| N-04 | Tener un campo de observaciones libre (representante con el que se contacta, correos adicionales…) | «está bien a veces que haya un apartado de observaciones» | L20 (02:47) | cliente | alta | — |
| N-05 | Guardar el usuario y la contraseña con los que el cliente entra en la web de cada proveedor | «el nombre de usuario y la contraseña que yo necesito para entrar a esa web» · «Entonces yo lo tengo que tener» | L23–L26 (03:20–03:51) | cliente | alta | — (ver P-01) |
| N-06 | Indicar si el proveedor exige pedido mínimo | «Algunos sí, otros no» · «aunque sea una casilla que marque» | L26–L29 (03:51–04:19) | cliente / incierto | media | — (ver P-05) |
| N-07 | Conocer el plazo de entrega de cada proveedor, que en unos es fijo y en otros varía | «Le he hecho el pedido hoy y dentro de dos días me llega […] o […] me llega dentro de un mes» | L5 (00:39) | cliente | alta | Parcial: 009 tiene plazo en días |

### Proveedores · listado

| Id | Necesidad | Cita | Origen | Hablante | Confianza | Ya cubierto |
|---|---|---|---|---|---|---|
| N-08 | Ver las compras a cada proveedor por trimestre, además del año, para el modelo 347; los trimestres deben cuadrar con el total anual | «la suma del volumen de compra que le hemos hecho por trimestres y por año. Para lo del 347» · «Necesito que aquí salga otro otra columna que sea de trimestres» [ref. pantalla] | L119–L125 (17:23–18:15) | cliente | alta | Parcial: 009 tiene «Compras año». Va a la página de acciones masivas, no al listado (P-04) |
| N-09 | Ordenar el listado poniendo primero a los proveedores con más productos en falta (bajo stock) | «Vendría bien que os lo ordenara? Proveedor que tenéis más productos en falta. Sí» | L116 (16:56) | equipo, confirmado por cliente | media | — |

### Proveedores · compras

| Id | Necesidad | Cita | Origen | Hablante | Confianza | Ya cubierto |
|---|---|---|---|---|---|---|
| N-10 | Registrar en el sistema el albarán de compra y la factura de cada pedido recibido, para que lo dado de alta cuadre con lo que ha servido el proveedor | «aunque ellos me manden una factura, yo en mi ordenador tengo que generar esa factura» · «para que coincida la cantidad que ellos me han servido con la que yo doy de alta en mi programa» | L14–L17 (02:00–02:22) | cliente | alta | — |
| N-11 | Dar de alta un producto nuevo desde el propio albarán de compra, sin salir de él; el producto queda asociado al proveedor y al documento | «Tengo directamente desde esa factura. Una posibilidad de dar directamente de alta el artículo» · «se mete directamente en proveedor y a la factura. Al mismo tiempo no me tengo que salir del albarán» | L62–L68 (08:44–09:33) | cliente | alta | — (ver C-01) |
| N-12 | Preparar un pedido o lista de compra a un proveedor eligiendo sus productos y cantidades, guardarlo, completarlo cuando llegue la factura (productos nuevos, fecha) y convertirlo en albarán y factura | «Sí, eso sí calculado» · «que directamente desde la lista esa de compras se pueda pasar al Varane y a facturo» | L71–L89 (09:56–12:35) | equipo, confirmado por cliente | media | — (ver C-02, P-02) |
| N-13 | Buscar los productos al hacer el pedido o el albarán, sin teclear códigos a mano | «aquí no tendría que estar metiendo los códigos a mano» · «Tienes que hacer un buscador sí o sí» | L92–L95 (13:06–13:24) | cliente | alta | — |
| N-14 | Que el precio de cada producto en el pedido se proponga a partir de la última compra y se pueda modificar en el albarán | «lo tomamos de la última compra que hayáis hecho» · «Sí sí cuando cuando haces el albarán de compra» | L107–L110 (15:22–16:01) | equipo, confirmado por cliente | media | — |

### Productos

| Id | Necesidad | Cita | Origen | Hablante | Confianza | Ya cubierto |
|---|---|---|---|---|---|---|
| N-15 | Un mismo producto puede comprarse a varios proveedores; el cliente elige a quién según el precio | «yo tengo varias empresas que me suministran las mismas cosas. Y depende de qué precio me interese más» | L44–L50 (06:17–07:17) | cliente | alta | — |
| N-16 | Ver en cada producto el historial de compras: fecha y proveedor de cada compra, no solo la última | «que en un mismo producto me aparezca la fecha y el proveedor al que se lo compra por última vez, pero no solo la última vez» | L47 (06:42) | cliente | alta | — |
| N-17 | Conservar el historial de todos los productos que se tienen y se han tenido, para responder a una retirada por inspección | «tengo que tener en el ordenador un historial de los productos que tengo y he tenido» | L98–L101 (13:43–14:19) | cliente | alta | — |

### Clientes

| Id | Necesidad | Cita | Origen | Hablante | Confianza | Ya cubierto |
|---|---|---|---|---|---|---|
| N-18 | Ver también por cliente el volumen por trimestre y año (ventas), para el modelo 347 | «eso lo tendrías que poner tanto en proveedores como en clientes» | L122 (17:54) | cliente | media | — Va a la página de acciones masivas (P-04) |

## Reglas de negocio

| Id | Regla | Cita | Origen | Hablante | Confianza | Ya cubierto |
|---|---|---|---|---|---|---|
| R-01 | Una vez facturado un albarán, la factura no se puede editar ni borrar | «una vez hecha la factura no se tiene que poder editar» · «Esa factura no tiene que poder ni borrarse ni editarse» | L80 (11:04), L131 (19:03) | cliente | alta | — |
| R-02 | Hasta que se factura, el documento (pedido o albarán) es un borrador editable | «Sí, eso sí, previo que se guarda la factura sí» | L80 (11:04) | equipo, confirmado por cliente | alta | — |
| R-03 | La fecha del albarán de compra debe coincidir con la de la factura del proveedor | «no puedo hacer el albarán de compra antes de que me llegue la factura porque además yo no era el barán de comprar la fecha» · «Porque la fecha tiene que coincidir» | L77–L80 (10:46–11:04) | cliente | media | — |
| R-04 | Las cantidades del albarán de compra deben coincidir con lo que ha servido el proveedor | «para que coincida la cantidad que ellos me han servido con la que yo doy de alta» | L17 (02:22) | cliente | alta | — |
| R-05 | Los productos no se borran nunca; el catálogo histórico crece sin límite | «no se pueden borrar o sea que tiene que ser infinito?» · «Sí sí» | L101–L104 (14:19–14:45) | cliente | alta | — |
| R-06 | La suma de las compras de los cuatro trimestres debe cuadrar con la compra anual | «la cantidad que se ha comprado cada trimestre y que luego cuadre con la compra anual» | L122 (17:54) | cliente | alta | — |
| R-07 | El precio de un producto en el albarán de compra se puede modificar | «Puede modificar los precios? Claro sí» | L110 (16:01) | cliente / equipo | media | — |
| R-08 | Cada producto guarda un único precio de compra, el del último pedido, sea cual sea el proveedor que lo sirvió | Decisión del equipo (respuesta a P-09); contexto: «depende de qué precio me interese más» | L44 (06:17) | equipo | alta | — |

## Contradicciones

| Id | Afirmación A (origen) | Afirmación B (origen) | Resolución |
|---|---|---|---|
| C-01 | Equipo: un producto nuevo se da de alta en la sección de Productos, indicando su proveedor: «lo suyo sería irte a la sección de productos añadas el producto» (L59, 08:23) | Cliente: quiere darlo de alta desde el albarán de compra, sin salir: «no me tengo que salir del albarán dar el producto de alta» (L68, 09:33) | **Decidido (2026-10-26)**: las dos vías. Alta rápida desde el albarán de compra (nombre, código y precio de compra; queda asociado al proveedor y marcado «pendiente de completar») y alta completa desde Productos. |
| C-02 | Equipo: se genera el pedido de compra desde el proveedor y de ahí «Generas el pedido la factura» (L74, 10:23) | Cliente: «no puedo hacer el albarán de compra antes de que me llegue la factura» (L77, 10:46) | **Aplazada**: sin responder hasta que se especifique el circuito de pedidos, albaranes y facturas, que no entra todavía. |

## Preguntas abiertas para el cliente

Respuestas registradas el 2026-10-26 por el equipo (decisiones ya comentadas con el cliente o tomadas por el equipo).

1. **P-01** · ¿Hay que guardar en la aplicación el usuario y la contraseña de la web de cada proveedor? Si es así, ¿quién puede verlos? (L23–L26, 03:20–03:51)
   - **Respuesta**: sí, se guardan usuario y contraseña, y solo los ve el administrador. Cómo se protegen al guardarlos es una decisión técnica para el plan.
2. **P-02** · Circuito de compra: ¿pedido de compra, albarán de compra y factura son documentos distintos, o uno solo que cambia de estado? ¿Puede existir un albarán sin factura? ¿Qué datos se pueden editar en cada paso? (L71–L89, 09:56–12:35)
   - **Aplazada** junto con C-02: el circuito de compra no entra todavía.
3. **P-03** · Alta de productos nuevos: ¿desde el albarán de compra, desde Productos o desde ambos sitios? (C-01; L59–L68, 08:23–09:33)
   - **Respuesta**: desde ambos sitios (ver C-01).
4. **P-04** · Modelo 347: ¿las compras por trimestre se muestran con IVA o sin IVA? ¿Hace falta lo mismo para las ventas por cliente? (L119–L122, 17:23–17:54)
   - **Respuesta**: este tipo de acciones se llevan a una página aparte que reúne todas las acciones masivas; no van en la pantalla de Proveedores. Allí los importes del 347 van **con IVA incluido**. La columna «Compras año» del listado de Proveedores se queda como la define 009 (sin IVA). Afecta a N-08 y N-18.
   - **Actualización (2026-10-26, decisión de diseño)**: además del resumen del 347 con IVA en Acciones, el listado y la ficha de Proveedores muestran el gasto por trimestre **sin IVA**, como pidió el cliente en L119 («otra columna que sea de trimestres»).
5. **P-05** · Pedido mínimo: ¿basta con una casilla sí/no o hay que guardar un importe o unas unidades mínimas? (L26–L29, 03:51–04:19)
   - **Respuesta**: ~~casilla «tiene pedido mínimo» más un importe opcional en €~~. **Confirmado con el cliente (2026-10-26)**: se descarta la casilla; queda solo el importe mínimo en €, opcional (vacío = sin pedido mínimo). Un pedido por debajo del mínimo muestra un aviso que no bloquea.
6. **P-06** · ¿Da por buena la ficha lateral del proveedor mostrada en la demo (CIF, entrega, pedido mínimo, productos asociados) y el «pedido de compra sugerido» con los productos bajo mínimos? [ref. pantalla] (L50–L56, 07:17–07:56; L32–L38, 04:43–05:34)
   - **Respuesta**: sí, se toma como referencia el tablero `Proveedores.dc.html`.
   - **Confirmado con el cliente (2026-10-26)**: la ficha pasa a ocupar toda la pantalla (no un lateral), con una flecha de retorno al listado. Los productos asociados y el pedido de compra quedan para el circuito de compra (C-02).
   - **Confirmado con el cliente (2026-10-26)**: la dirección, el código postal y la población son obligatorios (N-01).
7. **P-07** · Alta y edición de proveedores: ¿quién puede crear y editar proveedores? (L107, 15:22)
   - **Respuesta**: quien tenga permiso de editar Proveedores. Los proveedores no se borran: se dan de baja, como en 009.
8. **P-08** · ¿Hay que guardar en el pedido la fecha de entrega que se pide al proveedor? (L8, 01:02)
   - **Respuesta**: no; no se incluye ese campo.
9. **P-09** · Para elegir proveedor por precio (N-15), ¿hay que ver en el producto el último precio de cada proveedor? (L44–L50, 06:17–07:17)
   - **Respuesta**: no. Aunque el producto tenga varios proveedores, solo se guarda un precio de compra, el del último pedido, sea cual sea el proveedor que lo sirvió (R-08).
10. **P-10** · Al pedir una cantidad (p. ej. 66), ¿qué dato del producto necesita ver? (L113, 16:36)
    - **Respuesta**: en cada línea del pedido, stock actual, stock mínimo, último precio y la cantidad a solicitar. Aplica cuando se especifique el circuito de compra.
11. **P-11** · «Catálogos»: ¿quiere guardar los catálogos de cada proveedor? (L26, 03:51)
    - **Respuesta**: no por ahora; basta con el enlace a la web del proveedor (N-03).
12. **P-12** · «acuérdate de que tienes que poner lo que dijo mi madre»: ¿a qué se refiere? (L116, 16:56)
    - **Descartada**: no es relevante por ahora.
13. **P-13** · La grabación se corta en «Quiero que el listado de.»: ¿qué quería cambiar en el listado? (L128, 18:49)
    - **Descartada**: no es relevante por ahora.

## Fuera de alcance mencionado

Ninguno explícito: el cliente no descartó ni aplazó nada.

## Glosario de transcripción

| Literal en la transcripción | Término corregido | Origen | Confianza |
|---|---|---|---|
| «Varane», «varón», «barán», «el barán de comprar» | albarán (de compra) | L77, L89, L131 | alta |
| «pajos de stock», «bajo texto» | bajo stock | L38 | alta |
| «bajos de todo» | bajos de stock | L32 | media |
| «facturo» | factura | L89 | alta |
| «from borrador» | en forma (modo) borrador | L80 | media |
| «tiras de alta» | des de alta | L56 | media |
| «Noa lejía» | (suministro) de lejía | L11 | media |
| «aceite del Sur», «aceites del sur» | Aceites del Sur (proveedor de ejemplo) | L38, L68 | alta |
| «marvimundo» | Marvimundo (proveedor de ejemplo; grafía sin confirmar) | L95 | media |
| «disona» | ? (probablemente un proveedor) | L83 | baja |
| «venigas sin inmobiliaria» | ? ininteligible | L11 | baja |
| «cada Páez cada empresa» | ? (probable falso inicio: «cada empresa») | L26 | baja |

## Calidad de la transcripción

- **Formato**: bloques de unos 20–30 s precedidos de una marca `mm:ss`; una misma línea mezcla a menudo la pregunta del equipo y la respuesta del cliente (p. ej. L5, L29, L71, L80).
- **Inicio a mitad de frase**: la transcripción empieza en 00:12 con «Al punto de que vosotros lo tengáis que vender…» (L2); falta el principio.
- **Línea cortada**: L128 (18:49), «Quiero que el listado de.», y salto hasta 19:03.
- **Tramo de demo en vivo**: L125–L128 (18:15–18:49), el equipo edita la pantalla mientras habla («como puedo estar editando»); las referencias a pantalla de ese tramo no son interpretables sin verla.
- **Participantes**: al menos 2 (equipo y cliente); probablemente 3, por la intervención de alguien del lado del cliente en L116 («acuérdate de que tienes que poner lo que dijo mi madre»).
- **Tramos ininteligibles**: L11 (01:33), «venigas sin inmobiliaria»; L83 (11:37), «disona».
