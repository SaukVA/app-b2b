# Bug Verification: Las miniaturas de los temas salen comprimidas en el escritorio

- **Slug**: desktop-theme-previews
- **Tested**: 2026-10-22
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

El síntoma ya no se reproduce. En Electron 34.5.8 (Chromium 132), las tres miniaturas de tema miden 265–268×110 px; antes del arreglo medían 27×110. El test nuevo pasa, igual que lint, tipos, todas las suites unitarias y el E2E completo. La primera ejecución de la suite del servidor falló de forma intermitente; el detalle está en *Residual Risks*.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproducción (tras el arreglo) | La misma web (Vite, puerto 5180, con la API E2E en 4100) abierta en Electron 34.5.8 a 1280×800, con un script de Playwright `_electron` fuera del repo; login `admin`, `/ajustes/apariencia` | pass | Miniaturas de 265, 268 y 268 × 110 px en tarjetas de 293 px; el `<button>` calcula `align-items: stretch` |
| Test nuevo | `npm run test:e2e -- appearance -g "miniaturas"` | pass | 2 passed (escritorio y móvil). Antes del arreglo fallaba con 28 px (ver fix.md) |
| Suite unitaria del cliente | `npm test --workspace=apps/client` | pass | 368 passed |
| Suites unitarias de shared y desktop | `npm test --workspaces` | pass | 58 + 58 passed |
| Suite unitaria del servidor | `npm test --workspace=apps/server` | pass (2.º intento) | 1.er intento dentro de `npm test --workspaces`: 181 failed / 48 passed. Repetida: 229 passed. `health` por separado: 6 passed |
| E2E completo | `npm run test:e2e` | pass | 40 passed, 2 skipped (densidad, solo escritorio, como antes) |
| Lint | `npx eslint .` | pass | exit 0 |
| Tipos | `npx tsc -p apps/client/tsconfig.json --noEmit` | pass | exit 0 |

## Output Excerpts

```text
Electron: {"chrome":"Chrome/132.0.6834.210","cards":["293x191 / preview 265x110", "293x191 / preview 268x110", "293x191 / preview 268x110"]}
button {"display":"flex","alignItems":"stretch","flexDirection":"column"}
E2E miniaturas: 2 passed (1.0m)
E2E completo:   40 passed, 2 skipped (1.7m)
Servidor (repetida): Test Suites: 23 passed, 23 total · Tests: 229 passed, 229 total
```

## Residual Risks

- **Fallo intermitente en la suite del servidor**: en la primera ejecución fallaron 181 tests del servidor, casi todos los que usan `mongodb-memory-server`. Dos de ellos estaban en `classifyConnectionError`. Al repetirla pasó entera, y `health` por separado también. No se investigó la causa. Coincide con haber parado justo antes los procesos de la API E2E con `taskkill`, pero no está demostrado. El arreglo solo cambia un CSS del cliente, que el servidor no carga, así que no puede ser su origen. Conviene vigilar si se repite.
- **Sin build de producción del escritorio**: la reproducción se hizo con la web de desarrollo dentro del motor de Electron, no con el instalador (`app://` y el backend embebido). El fallo depende solo del motor de Chromium, no del modo de carga, así que el resultado es extrapolable. Aun así, no se probó el empaquetado.
- **Otros `<button>` con flex**: la misma diferencia del navegador podría afectar a otros botones que dependan de estirar a sus hijos. En la revisión no apareció ninguno.

## Recommendation

Cerrar el bug: verificado de principio a fin en Electron 34, con un test que impide que el fallo vuelva sin que se note. Hay que hacer el commit en `fix/desktop-theme-previews` y abrir un PR a `develop`. De forma opcional, confirmar la miniatura en el escritorio empaquetado al probar el siguiente instalador.
