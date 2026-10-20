# ADR 0004: Tests E2E con Playwright y uso de `playwright-cli`

- **Estado**: Aceptada
- **Fecha**: 2026-10-19
- **Contexto de origen**: incorporación de Playwright CLI (`@playwright/cli`) al equipo

## Contexto

La constitución (principio VII) exige tests con Jest: unitarios junto al código y de integración de la API
con `supertest` y `mongodb-memory-server`. En el cliente, Testing Library prueba los componentes en jsdom.
Nada de eso ejercita la aplicación real en un navegador: el enrutado, el proxy de Vite, las cookies del
refresh token, el diseño responsive a 390 px o un flujo completo contra la API.

El equipo ha instalado `@playwright/cli` (`playwright-cli`), una CLI pensada para agentes de código que
maneja un navegador por comandos y emite el código Playwright equivalente a cada acción. Sirve para explorar
la app, verificar cambios y generar o depurar tests, pero no ejecuta tests por sí misma.

## Decisión

- **Runner E2E**: `@playwright/test` como devDependency de la raíz, en la misma versión menor que la
  `playwright-core` de `@playwright/cli` (1.64), para que compartan los navegadores instalados.
- **Ubicación y nombres**: los tests viven en `e2e/` con el sufijo `*.spec.ts`. Jest busca `*.test.ts`, así
  que las dos suites no se mezclan.
- **Configuración** (`playwright.config.ts`):
  - proyectos `desktop` y `mobile` (390 px, corte responsive de «Albarán»);
  - `webServer` levanta la API y Vite en puertos propios (4100 y 5180) para no chocar con `npm run dev`;
  - un solo worker, porque los tests comparten la base de datos.
- **Base de datos**: `e2e/support/startServer.ts` arranca `apps/server` contra `mongodb-memory-server`.
  Cada ejecución parte de una base de datos limpia, sin Docker ni el `.env` de desarrollo.
- **Comandos**: `npm run test:e2e` y `npm run test:e2e:ui`.
- **`playwright-cli`**: su skill oficial está instalada en `.claude/skills/playwright-cli/`. Se usa para
  explorar la app, verificar cambios de UI y generar o depurar tests (`npx playwright test --debug=cli` +
  `playwright-cli attach`). Su salida (`.playwright-cli/`) no se versiona porque puede contener credenciales.
- Los E2E **complementan** a Jest, no lo sustituyen: la cobertura obligatoria del principio VII sigue siendo
  con Jest.

## Alternativas consideradas

- **Solo `playwright-cli`, sin `@playwright/test`**: sirve para verificar a mano o con un agente, pero no
  deja tests repetibles en el repositorio.
- **Cypress**: otro runner y otra API; Playwright ya es la herramienta elegida por el equipo y cubre también
  Electron (`_electron`) si más adelante se prueban flujos del escritorio.
- **E2E contra el MongoDB de Docker**: obliga a tener Docker levantado y deja datos entre ejecuciones.

## Consecuencias

- Hay que instalar Chromium una vez por equipo: `npx playwright install chromium`.
- `npm test --workspaces` no ejecuta los E2E; se lanzan aparte con `npm run test:e2e`.
- Los E2E del escritorio (Electron) quedan fuera; si se añaden, irán en un ADR propio.
- Las specs nuevas pueden pedir tests E2E de sus flujos principales en `e2e/`, con localizadores semánticos
  (`getByRole`, `getByLabel`) como los que genera `playwright-cli`.
