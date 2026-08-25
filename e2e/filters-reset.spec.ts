import { test, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Regresión (2026-08-26): "Limpiar filtros" navega a /propiedades vía un <Link>
// de Next.js — una navegación CLIENTE (soft nav), a diferencia de "Aplicar
// filtros" (submit nativo de un <form method="get">, que recarga el documento
// entero). En una soft nav, React reconcilia el <form> como "el mismo" elemento
// y reutiliza su DOM — pero `defaultValue`/`defaultChecked` solo se aplican en
// el montaje inicial, nunca de nuevo en un re-render. Antes del fix, los
// <select>/radios/checkbox no controlados (Ubicación, Operación, Tipo, Moneda,
// Desde, Hasta, Dormitorios, Ambientes, Apto crédito) quedaban mostrando
// visualmente el valor de la búsqueda anterior aunque resultados/contador/URL
// ya reflejaran correctamente el estado limpio. Fix: una `key` derivada de
// `filters` en el <form> (`PropertyFilters.tsx`) fuerza a React a desmontar y
// remontar el subárbol completo cuando los filtros cambian, así
// defaultValue/defaultChecked se vuelven a aplicar frescos. Este spec reproduce
// el flujo real de usuario (click, no navegación directa por URL) para
// verificar la reconciliación de React, no solo el resultado del servidor.
// ─────────────────────────────────────────────────────────────────────────────

async function applyOperacion(page: import('@playwright/test').Page, operacion: 'venta' | 'alquiler') {
  await page.goto('/propiedades');
  await page.selectOption('#operacion', operacion);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.locator('form.twoclics-filters button[type="submit"]').click(),
  ]);
}

async function clickLimpiarFiltros(page: import('@playwright/test').Page) {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.locator('a.twoclics-filters-clear').click(),
  ]);
}

for (const operacion of ['venta', 'alquiler'] as const) {
  test(`Limpiar filtros resetea Operación (${operacion}) a "Todas" tras una navegación cliente`, async ({
    page,
  }) => {
    await applyOperacion(page, operacion);
    await expect(page.locator('#operacion')).toHaveValue(operacion);

    await clickLimpiarFiltros(page);

    await expect(page).toHaveURL(/\/propiedades$/);
    await expect(page.locator('#operacion')).toHaveValue('all');
    await expect(page.locator('a.twoclics-filters-clear')).toHaveCount(0);
  });
}

test('Limpiar filtros resetea TODOS los controles del buscador, no solo Operación', async ({ page }) => {
  await page.goto('/propiedades');
  await page.selectOption('#ubicacion', 'state:3');
  await page.selectOption('#operacion', 'venta');
  await page.selectOption('#tipo', '1');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.locator('form.twoclics-filters button[type="submit"]').click(),
  ]);

  await page.fill('#precioMin', '100000');
  await page.fill('#precioMax', '900000');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.locator('form.twoclics-filters button[type="submit"]').click(),
  ]);

  await page.locator('summary', { hasText: 'Más filtros' }).click();
  await page.locator('label[for="dormitorios-1"]').click();
  await page.locator('label[for="ambientes-2"]').click();
  await page.locator('label[for="aptoCredito"]').click();
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'load' }),
    page.locator('form.twoclics-filters button[type="submit"]').click(),
  ]);

  // Confirma que los filtros realmente quedaron aplicados antes de limpiar.
  await expect(page.locator('#ubicacion')).toHaveValue('state:3');
  await expect(page.locator('#operacion')).toHaveValue('venta');
  await expect(page.locator('#tipo')).toHaveValue('1');
  await expect(page.locator('#precioMin')).toHaveValue('100000');
  await expect(page.locator('#dormitorios-1')).toBeChecked();
  await expect(page.locator('#ambientes-2')).toBeChecked();
  await expect(page.locator('#aptoCredito')).toBeChecked();

  await clickLimpiarFiltros(page);

  await expect(page).toHaveURL(/\/propiedades$/);
  await expect(page.locator('#ubicacion')).toHaveValue('all');
  await expect(page.locator('#operacion')).toHaveValue('all');
  await expect(page.locator('#tipo')).toHaveValue('');
  await expect(page.locator('#moneda')).toHaveValue('');
  await expect(page.locator('#precioMin')).toHaveValue('');
  await expect(page.locator('#precioMax')).toHaveValue('');
  await expect(page.locator('#dormitorios-todos')).toBeChecked();
  await expect(page.locator('#ambientes-todos')).toBeChecked();
  await expect(page.locator('#aptoCredito')).not.toBeChecked();
  await expect(page.locator('.twoclics-filter-more')).not.toHaveAttribute('open', '');
});
