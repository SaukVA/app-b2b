# Bug Fix: Las miniaturas de los temas salen comprimidas en el escritorio

- **Slug**: desktop-theme-previews
- **Fixed**: 2026-10-22
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Las tarjetas de `OptionGroup` fijan ahora `align-items: stretch`. Así la vista previa de cada tema ocupa todo el ancho de la tarjeta, aunque el navegador dé a `<button>` otro valor por defecto: es el caso del Chromium 132 de Electron 34, que usa `flex-start`. Un E2E reproduce esa hoja de estilos del navegador para que el fallo no vuelva sin que se note.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `apps/client/src/components/OptionGroup.module.css` | modified | `align-items: stretch` en `.option`, con un comentario sobre el motivo |
| `e2e/appearance.spec.ts` | added test | Miniaturas de tema a todo el ancho con `button { align-items: flex-start }` inyectado |

Rama: `fix/desktop-theme-previews`, creada desde `origin/develop`.

## Diff Highlights (optional)

```css
.option {
  display: flex;
  flex-direction: column;
  /* Explícito: el Chromium 132 de Electron 34 da flex-start a <button> y no estira la vista previa. */
  align-items: stretch;
  …
}
```

## Tests Added or Updated

- `e2e/appearance.spec.ts` › «las miniaturas de tema ocupan el ancho de su tarjeta aunque el navegador no estire los botones»:
  - en Ajustes › Apariencia inyecta `button { align-items: flex-start; }`;
  - comprueba que cada una de las tres miniaturas mide al menos el 90 % del ancho útil de su tarjeta (ancho menos 28 px de padding y borde);
  - se ejecuta en escritorio y en móvil.

## Local Verification

- Antes del arreglo, `npm run test:e2e -- appearance -g "miniaturas"` → **2 failed**: la miniatura medía 28 px frente a ≥ 248 en escritorio y ≥ 259 en móvil, lo que confirma que el test reproduce el bug.
- Después del arreglo:
  - `npm run test:e2e -- appearance` → 8 passed y 2 skipped. Los 2 omitidos son los tests de densidad que solo se ejecutan en escritorio, como antes.
  - `npx eslint .` → sin errores.
  - `npm test --workspace=apps/client` → 368 passed.
- Comprobación en Electron 34.5.8 (Chromium 132.0.6834.210), con la misma web en una ventana de 1280×800 y un script de prueba fuera del repo:
  - antes del arreglo, las miniaturas medían 27×110;
  - después, miden 265–268×110, y el `<button>` calcula `align-items: stretch`;
  - en la captura, las tres miniaturas se ven completas.
- Comprobación manual: los botones de densidad «Cómoda» y «Compacta» se ven igual que antes, con el texto centrado.

## Deviations from Assessment

Ninguna.

## Follow-ups

- Revisar si otros `<button>` con `display: flex` dependen de que sus hijos se estiren, para que se vean igual en el escritorio. En la revisión de este bug no apareció ninguno.
- Valorar actualizar Electron a una versión con Chromium ≥ 133. Es un cambio de versión mayor: necesita aprobación y actualizar la tabla de `CLAUDE.md`.
- Fuera de este bug: en tema oscuro, `--border-row` no se redefine y las líneas entre filas de las tablas salen casi blancas. Está anotado en el PR #9.
