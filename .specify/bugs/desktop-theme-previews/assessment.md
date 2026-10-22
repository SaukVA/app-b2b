# Bug Assessment: Las miniaturas de los temas salen comprimidas en el escritorio

- **Slug**: desktop-theme-previews
- **Created**: 2026-10-22
- **Source**: pasted text
- **Verdict**: valid
- **Severity**: low

## Report (verbatim or summarized)

> Cuando se habre la aplicación en modo escritorioen el apartado de temas aparecnecen las imagenes de los diferentes temas comprimidas, he revisado pero en el modo web funciona correctamente.

## Symptom

En el escritorio, en «Ajustes › Apariencia › Tema», las tres miniaturas de tema (Claro, Oscuro, Según el sistema) se ven como una tira estrecha de unos 27 px de ancho pegada a la izquierda de la tarjeta, en lugar de ocupar todo el ancho de la tarjeta (unos 270 px), como en la web. Las tarjetas, sus textos y el resto de la pantalla se ven bien.

## Reproduction

1. Arrancar la web de desarrollo (Vite) con la API: en la verificación se usaron `e2e/support/startServer.ts` (puerto 4100) y `npm run dev --workspace=apps/client -- --port 5180`.
2. Abrir esa misma web dentro de Electron 34.5.8 (la versión de `apps/desktop`) en una ventana de 1280×800, como hace `createWindow()`. Se usó un script de prueba fuera del repo que lanza Electron con Playwright `_electron`.
3. Iniciar sesión como `admin` e ir a `/ajustes/apariencia`.
4. Resultado medido en Electron (Chromium 132.0.6834.210): tarjeta 293×191 y miniatura **27×110**.
5. Misma pantalla y ancho (1264 px) en el Chromium actual de Playwright (155): tarjeta 298×191 y miniatura **270×110**.

Reproducido. No hace falta el backend embebido ni el modo escritorio (`window.desktop`): basta con el motor de Electron, así que el fallo depende de la versión de Chromium y no de la lógica de escritorio.

## Suspected Code Paths

- `apps/client/src/components/OptionGroup.module.css` (`.option`, `.cards .option`): la tarjeta es un `<button>` con `display: flex; flex-direction: column`, pero no fija `align-items`. Sus hijos solo ocupan todo el ancho si el valor por defecto es `stretch` (`normal`).
- `apps/client/src/components/OptionGroup.tsx` `OptionButton()`: pinta `option.preview` como hijo directo del `<button>`.
- `apps/client/src/features/preferences/components/AppearanceForm.tsx:25` `ThemePreview()` y `AppearanceForm.module.css` (`.preview`): la miniatura es un `<span>` con `display: flex`, sin ancho propio. Su ancho sale de estirarse en la tarjeta, y su contenido solo tiene anchos relativos: `.previewNav` al 28 %, más el padding de `.previewBody`.

## Root Cause Hypothesis

En Chromium 132, que es el de Electron 34, la hoja de estilos por defecto del navegador da a `<button>` `align-items: flex-start`. El Chromium actual le da `normal`. Medido en las dos versiones:

| Motor | `align-items` de la tarjeta | Ancho de la miniatura |
|---|---|---|
| Electron (Chromium 132) | `flex-start` | 27 px |
| Chromium 155 | `normal` | 270 px |

Como `OptionGroup` no fija `align-items`, en Electron los hijos de la tarjeta no se estiran y toman su ancho mínimo. Los textos no lo notan, porque su contenido ya les da ancho. La miniatura, en cambio, no tiene contenido con ancho propio y se queda en los 27 px que suman el padding y los bordes.

Está comprobado inyectando CSS solo en la ventana de Electron: con `align-self: stretch` o con `width: 100%` en la miniatura, mide 265–268×110, igual que en la web.

Confianza: **alta**.

## Proposed Remediation

**Preferred**: fijar el alineado en el propio componente, sin depender de la hoja de estilos por defecto del navegador. Hay que añadir `align-items: stretch` a `.option` en `apps/client/src/components/OptionGroup.module.css`, para que las tarjetas (y los botones de densidad) se comporten igual en Electron 34 y en cualquier Chromium.

En la variante `buttons` el texto ya va centrado con `justify-content: center`. El eje vertical no cambia, y en horizontal el texto sigue alineado a la izquierda. Hay que comprobarlo visualmente en los botones de densidad.

**Alternatives**:

- `width: 100%` (o `align-self: stretch`) en `.preview` de `AppearanceForm.module.css`.
  - A favor: arregla solo la miniatura, el cambio es aún más pequeño y no toca el componente genérico.
  - En contra: deja `OptionGroup` frágil para cualquier otra vista previa que se le pase.
- Reset global `button { align-items: normal; }` en los estilos base.
  - A favor: protege todos los `<button>` con flex de la app frente a esta diferencia entre versiones.
  - En contra: afecta a botones que hoy no tienen el problema y obliga a revisarlos todos (`NavBar`, `Menu`, `IconButton`…).
- Actualizar Electron a una versión con Chromium ≥ 133.
  - A favor: elimina la diferencia de raíz.
  - En contra: es un cambio de versión mayor de una dependencia, que requiere aprobación y actualizar la tabla de `CLAUDE.md`, y no protege a usuarios web con navegadores antiguos.

**Files likely to change**:

- `apps/client/src/components/OptionGroup.module.css`
- `e2e/appearance.spec.ts` (o un test nuevo junto a él)

**Tests to add or update**:

- E2E en `e2e/appearance.spec.ts`: en Ajustes › Apariencia, inyectar `button { align-items: flex-start }` con `page.addStyleTag` para imitar la hoja por defecto de Chromium 132. Después, comprobar que cada miniatura de tema ocupa el ancho de su tarjeta menos el padding: por ejemplo, `boundingBox().width` de la miniatura ≥ 90 % del de la tarjeta. Sin el arreglo, el test falla (unos 27 px frente a unos 290).
- No sirve un test de Jest: jsdom no calcula el layout.

## Risks & Considerations

- **Alcance de la diferencia**: cualquier otro `<button>` de la app con `display: flex` que dependa de que sus hijos se estiren puede verse distinto en el escritorio. En la verificación solo se detectó en las miniaturas: las tarjetas de tema, los botones de densidad y el menú se veían bien.
- **La web también**: el fallo afecta a quien use la web con un navegador basado en Chromium 132 o anterior, no solo al escritorio.
- **Sin riesgo de datos, API ni seguridad**: es un cambio de CSS de un componente.
- **Diseño**: no cambia el aspecto en el Chromium actual, porque `stretch` ya es el comportamiento efectivo. No hace falta tocar el lienzo ni `docs/design/README.md`.

## Open Questions

- Ninguna que bloquee el arreglo. Opcional: ¿se quiere también un reset global de `align-items` en `<button>`, o actualizar Electron más adelante? Queda fuera de este bug.
