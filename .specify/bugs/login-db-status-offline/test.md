# Bug Verification: El login siempre muestra «Sin conexión» tras cambiar de base de datos

- **Slug**: login-db-status-offline
- **Tested**: 2026-10-16
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

Los tests que reproducen la carrera (backend que responde `disconnected` mientras conecta y `connected` después) pasan con la corrección y fallaban con el código anterior. No hay regresiones en ningún workspace, y el lint está limpio. El usuario ha repetido a mano en escritorio los pasos de la reproducción y confirma que funciona (2026-10-16).

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | Pasos 1–4 de `assessment.md` en Electron | pass | Prueba manual del usuario: con las bases de datos probadas, el indicador ya no se queda siempre en «Sin conexión». |
| Reproducción automatizada | `npm test --workspace=apps/desktop -- -t "reiniciar\|tiempo máximo\|database:status"` | pass | 12 tests de `database:status` pasan, incluidos los dos de regresión. Durante `/speckit-bug-fix` se comprobó que fallan con `database.ts` de `HEAD`. |
| New / updated tests | `npm test --workspace=apps/desktop` | pass | 3 suites, 58 tests. |
| Regression suite | `npm test --workspaces` | pass | 35 suites, 318 tests (16/94, 3/58, 14/117, 2/49 por workspace). |
| Lint | `npm run lint` | pass | Sin errores. |
| Type-check | `npx tsc --noEmit -p apps/desktop` | skipped | Ya se ejecutó en `/speckit-bug-fix`: los mismos 9 errores TS6059 (`rootDir`) que en `HEAD`, ajenos al cambio. |

## Output Excerpts

```text
# apps/desktop, filtro database:status
Tests:       46 skipped, 12 passed, 58 total

# npm test --workspaces
Test Suites: 16 passed, 16 total   Tests: 94 passed, 94 total
Test Suites: 3 passed, 3 total     Tests: 58 passed, 58 total
Test Suites: 14 passed, 14 total   Tests: 117 passed, 117 total
Test Suites: 2 passed, 2 total     Tests: 49 passed, 49 total

# npm run lint
ESLint: No issues found
```

## Residual Risks

- `serverSelectionTimeoutMS` es 5 s, igual que el tope de estado: con una base de datos remota lenta, el primer intento de conexión podría superarlo y mostrar «Sin conexión» hasta volver al login.
- Con una base de datos inaccesible, «Sin conexión» tarda ahora unos 5 s en aparecer (desviación aceptada en `fix.md`).
- `entryPath` usa `@app/server/dist/embedded.js`: en la prueba manual conviene recompilar el servidor antes.

## Recommendation

Close the bug: verificado con tests automatizados y con la prueba manual del usuario en escritorio.
