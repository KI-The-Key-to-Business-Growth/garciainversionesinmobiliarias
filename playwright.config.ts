import { defineConfig, devices } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Health check rápido (NO exhaustivo). Un solo comando:  npm run test:e2e
//
// El bloque `webServer` compila el sitio en modo PRODUCCIÓN (`next build`) y lo
// arranca (`next start`) antes de correr los tests. Por eso este suite cubre los
// 3 chequeos de salud de una sola pasada:
//   1) Build:   si `next build` falla, el server no levanta y el suite falla.
//   2) Páginas: cada ruta debe responder sin 5xx/4xx (ver e2e/health-check.spec.ts).
//   3) Consola: ninguna página debe emitir errores críticos de consola.
// ─────────────────────────────────────────────────────────────────────────────

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list']],
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start',
    url: BASE_URL,
    // false → el health check SIEMPRE hace un build fresco (cumple el chequeo #1).
    // Asegurate de no tener otro proceso ocupando el puerto 3000 al correrlo.
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
