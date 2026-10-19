import { defineConfig, devices } from '@playwright/test';

// Tests E2E (ADR 0004). Puertos propios para no chocar con `npm run dev` (4000 y 5173).
const API_PORT = 4100;
const CLIENT_PORT = 5180;
const CLIENT_URL = `http://localhost:${CLIENT_PORT}`;

export default defineConfig({
  testDir: './e2e',
  // *.spec.ts para que Jest (que busca *.test.ts) no recoja estos archivos.
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  // Todos los tests comparten la base de datos en memoria del servidor E2E.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: CLIENT_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    // Corte responsive de «Albarán» (docs/design/README.md): por debajo de 760 px.
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: [
    {
      command: 'npx tsx e2e/support/startServer.ts',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
    },
    {
      command: `npm run dev --workspace=apps/client -- --port ${CLIENT_PORT}`,
      url: CLIENT_URL,
      env: { VITE_API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
