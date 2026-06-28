import { test, expect, type ConsoleMessage } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Health check rápido de páginas. Para cada ruta verifica que:
//   (2) el documento responda con HTTP < 400 (sin 500 ni excepciones de servidor)
//   (3) no haya errores críticos de consola ni excepciones JS no capturadas
// El chequeo (1) build lo hace el webServer de playwright.config.ts.
// ─────────────────────────────────────────────────────────────────────────────

// Rutas que existen hoy. Para sumar páginas, agregá una línea acá.
const routes = [
  { path: '/', name: 'Home' },
  { path: '/propiedades', name: 'Listado de propiedades (placeholder)' },
  { path: '/privacidad', name: 'Política de privacidad' },
  { path: '/gracias-consulta', name: 'Gracias por tu consulta' },

  // ── Detalle de propiedad — Fase 5 (la ruta /propiedades/[slug] todavía no
  //    existe). Cuando se construya, descomentá esta línea y poné un slug real
  //    de ejemplo para incluirla en el health check:
  // { path: '/propiedades/ejemplo-departamento-puerto-madero', name: 'Detalle de propiedad' },
];

// Ruido conocido de consola que NO debe romper el health check. Son errores de
// SCRIPTS DE TERCEROS (analytics/ads), no de la app. Ocurren igual en producción
// y no afectan el funcionamiento del sitio:
//   • Google Tag Manager / Google Ads y Facebook Pixel intentan enviar beacons a
//     hosts (www.google.com/ccm, ad.doubleclick.net, etc.) que el propio CSP del
//     sitio bloquea a propósito → "Content Security Policy" / "Fetch API cannot load".
//   • El Pixel de Facebook lanza "fbq is not defined" cuando su script no cargó.
// Si querés que el health check sea más estricto, vaciá este array.
const ignoredConsoleErrors: RegExp[] = [
  /Content Security Policy/i, // beacons de analytics/ads bloqueados por el CSP
  /Fetch API cannot load/i, //   idem (otra variante del mismo evento)
  /fbq is not defined/i, //       Facebook Pixel sin inicializar
];

const isIgnored = (text: string) => ignoredConsoleErrors.some((re) => re.test(text));

for (const route of routes) {
  test(`${route.name} (${route.path}) carga sin errores`, async ({ page }) => {
    const errors: string[] = [];

    // Errores de consola (console.error)
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error' && !isIgnored(msg.text())) {
        errors.push(`console.error: ${msg.text()}`);
      }
    });

    // Excepciones JS no capturadas en el navegador
    page.on('pageerror', (err) => {
      if (!isIgnored(err.message)) {
        errors.push(`Uncaught: ${err.message}`);
      }
    });

    const response = await page.goto(route.path, { waitUntil: 'networkidle' });

    // (2) La respuesta del documento no debe ser un error.
    expect(response, `No hubo respuesta HTTP para ${route.path}`).not.toBeNull();
    expect(response!.status(), `${route.path} devolvió HTTP ${response!.status()}`).toBeLessThan(
      400,
    );

    // (3) Sin errores críticos de consola ni excepciones.
    expect(errors, `Errores en ${route.path}:\n${errors.join('\n') || '(ninguno)'}`).toHaveLength(
      0,
    );
  });
}
