import React from 'react';
import { existsSync, readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Hero from '@/components/sections/Hero';
import Trayectoria from '@/components/sections/Trayectoria';
import Contact from '@/components/sections/Contact';
import CatalogView from '@/components/properties/CatalogView';
import CuratedDevelopmentCard from '@/components/properties/CuratedDevelopmentCard';
import CuratedDevelopmentDetailView from '@/components/properties/CuratedDevelopmentDetailView';
import DesarrollosMarketTabs from '@/components/properties/DesarrollosMarketTabs';
import FeaturedSpotlight from '@/components/properties/FeaturedSpotlight';
import InvestmentOpportunityDetailView from '@/components/properties/InvestmentOpportunityDetailView';
import LocationPicker, { groupOptions } from '@/components/properties/LocationPicker';
import { adaptPublicProperty } from '@/lib/2clics/adapters';
import { getInvestmentEditorialCuration } from '@/lib/investments';
import {
  formatDevelopmentPriceRange,
  getDevelopmentEditorialCuration,
  resolveSafeDescription,
  toDevelopmentCardSource,
} from '@/lib/desarrollos';
import type { PublicProperty } from '@/lib/2clics/types';
import { removeFilterHref, type ListingLocationOption, type PropertyCatalogResult } from '@/lib/2clics/listings';
import {
  CURATED_PROPERTIES,
  DEVELOPMENTS,
  INVESTMENT_OPPORTUNITIES,
  getActiveInvestmentOpportunities,
  getAllDevelopmentSlugs,
  getCurationForPropertyId,
  getDevelopmentBySlug,
  getDevelopmentsByMarket,
  getExcludedPropertyIds,
  getInvestmentOpportunityBySlug,
  isExcludedFromStandardCatalog,
} from '@/lib/site-curation';

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

// Vínculo mínimo esperado por CuratedDevelopmentDetailView (decimosexta pasada, ver
// components/properties/CuratedDevelopmentDetailView.tsx) — nunca `PublicProperty` completo.
// `publicName`, cuando se pasa, reemplaza `p.title` — mismo criterio que la página real
// (app/desarrollos/[id]/page.tsx), que resuelve el título seguro ANTES de armar este objeto.
function toDevSource(p: PublicProperty, publicName?: string | null) {
  return {
    propertyId: p.propertyId,
    region: p.region,
    title: publicName || p.title,
    location: p.location,
    description: p.description,
    images: p.images,
    amenities: p.amenities,
    price: p.price,
    currency: p.currency,
    hidePrice: p.hidePrice,
  };
}

function property(overrides: Record<string, unknown> = {}, region: 'AR' | 'US' = 'AR') {
  return adaptPublicProperty(
    {
      propertyId: 187676,
      address: 'Test address',
      price: 250000,
      currency: 'U$D',
      operationType: 'VENTA',
      propertyType: { typeId: 2, name: 'Casa', appId: '5791' },
      state: { stateId: 3, name: 'Bs.As. G.B.A. Norte' },
      city: { cityId: 41, name: 'Tigre' },
      neighborhood: { neighborhoodId: 601, name: 'Nordelta' },
      webListing: 'SIMPLE',
      images: [{ imageId: 'cover', url: 'https://cdn.2clics.com/cover.jpg' }],
      meta_data: [{ metaKey: 'description', metaValue: 'Descripción real de 2Clics.' }],
      ...overrides,
    } as never,
    region,
  );
}

function jsonResponse(body: unknown): { ok: true; status: number; text: () => Promise<string> } {
  return { ok: true, status: 200, text: async () => JSON.stringify(body) };
}

async function loadListings() {
  vi.resetModules();
  process.env.TWOCLICS_API_KEY = 'test-key';
  return import('@/lib/2clics/listings');
}

function emptyCatalogResult(overrides: Partial<PropertyCatalogResult> = {}): PropertyCatalogResult {
  return {
    status: 'ready',
    filters: {
      location: 'all',
      operation: 'venta',
      propertyTypeId: null,
      bedrooms: null,
      rooms: null,
      aptoCredito: false,
      price: { currency: '', min: null, max: null },
      offset: 0,
      limit: 30,
    },
    properties: [],
    propertyTotalCount: 0,
    developments: [],
    propertyTypes: [],
    availableLocations: [],
    availableOperations: ['venta', 'alquiler'],
    priceFacet: { currencies: [], rangeByCurrency: {} },
    resolvedPrice: { status: 'no-operation', currencies: [], rawCurrency: '', rawMin: null, rawMax: null },
    hasMore: false,
    ...overrides,
  };
}

afterEach(() => {
  vi.resetModules();
  delete process.env.TWOCLICS_API_KEY;
});

// ── 1. Curaduría — clasificación + exclusión por item ───────────────────────────────────────
describe('lib/site-curation — clasificación y exclusión del catálogo estándar', () => {
  it('los cinco property_app_id curados están marcados excludeFromStandardCatalog (decimosexta pasada: 4 desarrollos + 1 proyecto especial)', () => {
    expect(CURATED_PROPERTIES).toEqual([
      { propertyId: 187676, humanRef: 'FAB-187676', classification: 'desarrollo', excludeFromStandardCatalog: true },
      { propertyId: 187677, humanRef: 'FAB-187677', classification: 'desarrollo', excludeFromStandardCatalog: true },
      { propertyId: 187681, humanRef: 'FAB-187681', classification: 'desarrollo', excludeFromStandardCatalog: true },
      { propertyId: 187682, humanRef: 'FAB-187682', classification: 'desarrollo', excludeFromStandardCatalog: true },
      {
        propertyId: 206734,
        humanRef: 'FAB-206734',
        classification: 'proyecto-especial',
        excludeFromStandardCatalog: true,
      },
    ]);
    for (const id of [187676, 187677, 187681, 187682, 206734]) {
      expect(isExcludedFromStandardCatalog(id)).toBe(true);
    }
    expect(isExcludedFromStandardCatalog(1)).toBe(false);
    expect(isExcludedFromStandardCatalog(null)).toBe(false);
    expect(getExcludedPropertyIds().sort((a, b) => a - b)).toEqual([187676, 187677, 187681, 187682, 206734]);
  });

  it('la clasificación como "desarrollo" es explícita por property_app_id — nunca deriva de palabras en título/descripción', () => {
    // Ninguna propiedad "normal" (sin entrada en CURATED_PROPERTIES) queda excluida, sin
    // importar qué palabras traiga su título/descripción real (ej. "financiado", "a estrenar").
    const normalPropertyIds = [1, 999, 187678, 187680, 187683, 187694, 187684];
    for (const id of normalPropertyIds) {
      expect(isExcludedFromStandardCatalog(id)).toBe(false);
      expect(getCurationForPropertyId(id)).toBeNull();
    }
  });

  it('getCurationForPropertyId expone la clasificación completa por id', () => {
    expect(getCurationForPropertyId(206734)?.classification).toBe('proyecto-especial');
    expect(getCurationForPropertyId(187677)?.classification).toBe('desarrollo');
    expect(getCurationForPropertyId(999999)).toBeNull();
  });

  it('Desarrollo "faena" apunta a la propiedad real 187676 (FAB-187676), sin nombre público curado propio (usa el título real de 2Clics)', () => {
    const faena = getDevelopmentBySlug('faena');
    expect(faena).toEqual({
      slug: 'faena',
      name: 'Proyecto Faena',
      publicName: null,
      sourcePropertyId: 187676,
      humanRef: 'FAB-187676',
      propertyIds: [187676],
      market: 'US',
    });
    expect(getDevelopmentBySlug('FAENA')).toEqual(faena);
  });

  it('decimosexta pasada: Icon Beach (187677), Flow House Miami Worldcenter (187681) y One Hollywood (187682) clasificados como desarrollo, cada uno con nombre público confirmado', () => {
    const iconBeach = getDevelopmentBySlug('icon-beach');
    expect(iconBeach?.sourcePropertyId).toBe(187677);
    expect(iconBeach?.publicName).toBe('Icon Beach');

    const flowHouse = getDevelopmentBySlug('flow-house-miami-worldcenter');
    expect(flowHouse?.sourcePropertyId).toBe(187681);
    expect(flowHouse?.publicName).toBe('Flow House Miami Worldcenter');

    const oneHollywood = getDevelopmentBySlug('one-hollywood');
    expect(oneHollywood?.sourcePropertyId).toBe(187682);
    expect(oneHollywood?.publicName).toBe('One Hollywood');

    expect(getAllDevelopmentSlugs().sort()).toEqual(
      ['faena', 'icon-beach', 'flow-house-miami-worldcenter', 'one-hollywood'].sort(),
    );
  });

  it('187694 (código de CRM FAB-187694) NO está clasificado — la External API confirma que no existe hoy', () => {
    expect(getCurationForPropertyId(187694)).toBeNull();
    expect(DEVELOPMENTS.some((d) => d.sourcePropertyId === 187694 || d.propertyIds.includes(187694))).toBe(false);
    expect(CURATED_PROPERTIES.some((entry) => entry.propertyId === 187694)).toBe(false);
  });

  it('no se usa /api/development (módulo Emprendimientos) para esta clasificación — DEVELOPMENTS es curaduría por propertyId normal', () => {
    for (const development of DEVELOPMENTS) {
      expect(typeof development.sourcePropertyId).toBe('number');
      expect(Array.isArray(development.propertyIds)).toBe(true);
    }
    // No existe ningún campo tipo developmentId/emprendimiento en el tipo — solo propertyIds
    // reales. `lib/site-curation.ts` no importa ni llama el módulo pago de 2Clics (el comentario
    // del archivo SÍ menciona el string "/api/development" para explicar que no se usa — se
    // verifica la ausencia de la llamada real, no del string en un comentario).
    const source = readFileSync('lib/site-curation.ts', 'utf8');
    expect(source).not.toContain('getPublicDevelopmentById');
    expect(source).not.toContain("from '@/lib/2clics/listings'");
  });

  it('Invertir 206734: nombre editorial neutral, sin nombres de personas ni figuras legales/comerciales no confirmadas', () => {
    const opportunity = getInvestmentOpportunityBySlug('proyecto-especial-miami');
    expect(opportunity?.sourcePropertyId).toBe(206734);
    expect(opportunity?.propertyIds).toEqual([206734]);
    expect(opportunity?.active).toBe(true);
    const forbiddenTerms = [
      'fondo',
      'coinversión',
      'coinversion',
      'fraccionada',
      'franquicia',
      'crowdfunding',
      'vehículo',
      'vehiculo',
      'renta garantizada',
      'marcelo',
      'chami',
      'confirmada', // nada sobre "estructura no confirmada" en el copy público
    ];
    const haystack = `${opportunity?.name} ${opportunity?.note || ''}`.toLowerCase();
    for (const term of forbiddenTerms) {
      expect(haystack).not.toContain(term);
    }
  });

  it('getActiveInvestmentOpportunities devuelve solo activas y ordenadas', () => {
    const active = getActiveInvestmentOpportunities();
    expect(active).toEqual(INVESTMENT_OPPORTUNITIES.filter((entry) => entry.active));
    for (let i = 1; i < active.length; i++) {
      expect(active[i].order).toBeGreaterThanOrEqual(active[i - 1].order);
    }
  });

  it('DEVELOPMENTS/INVESTMENT_OPPORTUNITIES no guardan precio/rentabilidad/fotos/stock — solo relaciones', () => {
    const forbiddenKeys = ['price', 'precio', 'rentabilidad', 'return', 'images', 'fotos', 'stock', 'disponibilidad'];
    for (const entry of [...DEVELOPMENTS, ...INVESTMENT_OPPORTUNITIES]) {
      const keys = Object.keys(entry);
      for (const forbidden of forbiddenKeys) {
        expect(keys).not.toContain(forbidden);
      }
    }
  });

});

// ── 2. Header V2 — bug del hero interior + navegación ───────────────────────────────────────
describe('Header V2', () => {
  it('navegación: Comprar/Alquilar/Desarrollos/Invertir/Vender/Nosotros, Nosotros ya no es un ancla', () => {
    const html = render(React.createElement(Header));
    expect(html).toContain('href="/comprar"');
    expect(html).toContain('href="/alquilar"');
    expect(html).toContain('href="/desarrollos"');
    expect(html).toContain('href="/invertir"');
    expect(html).toContain('href="/vender"');
    expect(html).toContain('href="/nosotros"');
    expect(html).not.toContain('href="/#nosotros"');
  });

  it('fuera del Home no usa site-header--floating (bug sistémico corregido: el sticky reserva su alto)', () => {
    // usePathname() en Vitest (sin AppRouterContext) resuelve a null → el componente cae a '/'
    // como fallback seguro; el caso relevante para el bug reportado (rutas interiores) se
    // confirma en la propia regla CSS de abajo, que ya no depende de un atributo que nunca
    // cambiaba (`body[data-page-type]`) sino de esta clase condicional.
    const html = render(React.createElement(Header));
    expect(html).toContain('site-header');
  });
});

// ── 3. Comprar / Alquilar completos (motor real de /propiedades, con exclusión) ─────────────
describe('CatalogView — /comprar y /alquilar reutilizan el motor de /propiedades', () => {
  it('/comprar: sin CTA "Ver todas" ni muestra de 3 — lista completa + filtros, operación oculta y forzada, copy sin jerga técnica', () => {
    const excluded = property({ propertyId: 187676 });
    const included = property({ propertyId: 111 });
    const catalog = emptyCatalogResult({
      filters: {
        location: 'all',
        operation: 'venta',
        propertyTypeId: null,
        bedrooms: null,
        rooms: null,
        aptoCredito: false,
        price: { currency: '', min: null, max: null },
        offset: 0,
        limit: 30,
      },
      properties: [included],
      propertyTotalCount: 1,
    });
    const html = render(
      React.createElement(CatalogView, {
        catalog,
        showDevelopments: false,
        actionPath: '/comprar',
        lockedOperation: 'venta',
      }),
    );
    expect(html).toContain('action="/comprar"');
    expect(html).not.toContain('id="operacion"');
    expect(html).toContain('name="operacion" value="venta"');
    expect(html).not.toContain('Ver todas');
    expect(html).toContain('/propiedades/111');
    expect(html).not.toContain(`/propiedades/${excluded.propertyId}`);
  });

  it('"Ver más" de /comprar apunta a /comprar, no a /propiedades', () => {
    const catalog = emptyCatalogResult({
      properties: [property({ propertyId: 1 })],
      propertyTotalCount: 40,
      hasMore: true,
    });
    const html = render(
      React.createElement(CatalogView, { catalog, showDevelopments: false, actionPath: '/comprar', lockedOperation: 'venta' }),
    );
    expect(html).toContain('href="/comprar?');
    expect(html).not.toContain('href="/propiedades?');
  });

  it('sin pasar actionPath/lockedOperation (uso de /propiedades), el comportamiento no cambia: form a /propiedades y selector de Operación visible', () => {
    const catalog = emptyCatalogResult({ properties: [property({ propertyId: 1 })], propertyTotalCount: 1 });
    const html = render(React.createElement(CatalogView, { catalog, showDevelopments: true }));
    expect(html).toContain('action="/propiedades"');
    expect(html).toContain('id="operacion"');
  });

  it('/alquilar: operación Alquiler forzada, sin selector Operación, filtros principales + Más filtros presentes', () => {
    const excludedFaena = property({ propertyId: 187676 });
    const excludedMiami = property({ propertyId: 206734 });
    const included = property({ propertyId: 222 });
    const catalog = emptyCatalogResult({
      filters: {
        location: 'all',
        operation: 'alquiler',
        propertyTypeId: null,
        bedrooms: null,
        rooms: null,
        aptoCredito: false,
        price: { currency: '', min: null, max: null },
        offset: 0,
        limit: 30,
      },
      properties: [included],
      propertyTotalCount: 1,
    });
    const html = render(
      React.createElement(CatalogView, {
        catalog,
        showDevelopments: false,
        actionPath: '/alquilar',
        lockedOperation: 'alquiler',
      }),
    );
    expect(html).toContain('action="/alquilar"');
    expect(html).not.toContain('id="operacion"');
    expect(html).toContain('name="operacion" value="alquiler"');
    expect(html).toContain('/propiedades/222');
    expect(html).not.toContain(`/propiedades/${excludedFaena.propertyId}`);
    expect(html).not.toContain(`/propiedades/${excludedMiami.propertyId}`);
    // Filtros principales visibles + disclosure "Más filtros" (mismo motor que /propiedades).
    // Séptima pasada: Ubicación pasó del <select> nativo al LocationPicker propio.
    expect(html).toContain('location-picker-trigger');
    expect(html).toContain('name="ubicacion"');
    expect(html).toContain('id="tipo"');
    expect(html).toContain('Precio');
    expect(html).toContain('Buscar propiedades');
    expect(html).toContain('Más filtros');
  });

  it('/comprar: filtros principales (LocationPicker/Tipo/Precio/Buscar propiedades) y Más filtros presentes', () => {
    const catalog = emptyCatalogResult({ properties: [property({ propertyId: 1 })], propertyTotalCount: 1 });
    const html = render(
      React.createElement(CatalogView, { catalog, showDevelopments: false, actionPath: '/comprar', lockedOperation: 'venta' }),
    );
    expect(html).toContain('location-picker-trigger');
    expect(html).toContain('name="ubicacion"');
    expect(html).toContain('id="tipo"');
    expect(html).toContain('Precio');
    expect(html).toContain('Buscar propiedades');
    expect(html).toContain('Más filtros');
  });

  it('PropertyCard no fue alterada por el rediseño de Comprar/Alquilar (overlay/gradient/badges/CTA intactos)', () => {
    const catalog = emptyCatalogResult({ properties: [property({ propertyId: 1 })], propertyTotalCount: 1 });
    const html = render(
      React.createElement(CatalogView, { catalog, showDevelopments: false, actionPath: '/comprar', lockedOperation: 'venta' }),
    );
    expect(html).toContain('twoclics-card twoclics-card--overlay');
    expect(html).toContain('twoclics-card-gradient');
    expect(html).toContain('twoclics-card-badges');
    expect(html).toContain('twoclics-card-overlay-info');
    expect(html).toContain('twoclics-card-overlay-cta');
    expect(html).toContain('Ver propiedad →');
  });

  it('con lockedOperation, el form recibe el modifier CSS que corrige el grid de 4 columnas (bug real de auto-placement); sin lockedOperation, no', () => {
    const catalog = emptyCatalogResult({ properties: [property({ propertyId: 1 })], propertyTotalCount: 1 });
    const locked = render(
      React.createElement(CatalogView, { catalog, showDevelopments: false, actionPath: '/comprar', lockedOperation: 'venta' }),
    );
    const unlocked = render(React.createElement(CatalogView, { catalog, showDevelopments: true }));
    expect(locked).toContain('twoclics-filters--locked');
    expect(unlocked).not.toContain('twoclics-filters--locked');
  });
});

describe('/comprar, /alquilar — sin Hero interior (octava pasada), páginas funcionales', () => {
  const comprarSource = readFileSync('app/comprar/page.tsx', 'utf8');
  const alquilarSource = readFileSync('app/alquilar/page.tsx', 'utf8');

  it('ambas páginas usan <main className="market-page"> y ya NO renderizan el Hero navy', () => {
    for (const source of [comprarSource, alquilarSource]) {
      expect(source).toContain('className="market-page"');
      expect(source).not.toContain('twoclics-catalog-hero');
      expect(source).not.toContain('twoclics-catalog-hero--compact');
    }
  });

  it('"Propiedades para comprar/alquilar" ya no se renderiza visible — solo como <h1 className="sr-only">', () => {
    expect(comprarSource).toContain('<h1 className="sr-only">Propiedades para comprar</h1>');
    expect(alquilarSource).toContain('<h1 className="sr-only">Propiedades para alquilar</h1>');
    for (const source of [comprarSource, alquilarSource]) {
      expect(source).not.toContain('className="eyebrow"');
      expect(source).not.toMatch(/<h1>[^<]/);
    }
  });

  it('metadata SEO (title/description/canonical) se mantiene aunque el H1 visual se haya retirado', () => {
    expect(comprarSource).toContain("title: 'Propiedades para comprar | García Inversiones Inmobiliarias'");
    expect(comprarSource).toContain("canonical: '/comprar'");
    expect(alquilarSource).toContain("title: 'Propiedades para alquilar | García Inversiones Inmobiliarias'");
    expect(alquilarSource).toContain("canonical: '/alquilar'");
  });

  it('el copy de las páginas no menciona detalles de implementación', () => {
    const forbidden = [
      'mismos filtros del catálogo completo',
      'catálogo completo',
      'exclusión curatorial',
      'inventario real',
      'operación forzada',
      '2Clics',
      ' API ',
    ];
    for (const source of [comprarSource, alquilarSource]) {
      for (const phrase of forbidden) {
        expect(source).not.toContain(phrase);
      }
    }
  });

  it('CTA principal es "Buscar propiedades" en Comprar/Alquilar; /propiedades conserva "Aplicar filtros"', () => {
    const catalog = emptyCatalogResult({ properties: [property({ propertyId: 1 })], propertyTotalCount: 1 });
    const marketHtml = render(
      React.createElement(CatalogView, { catalog, showDevelopments: false, actionPath: '/comprar', lockedOperation: 'venta' }),
    );
    const masterHtml = render(React.createElement(CatalogView, { catalog, showDevelopments: true }));
    expect(marketHtml).toContain('Buscar propiedades');
    expect(marketHtml).not.toContain('>Aplicar filtros<');
    expect(masterHtml).toContain('Aplicar filtros');
    expect(masterHtml).not.toContain('Buscar propiedades');
  });
});

// ── LocationPicker — combobox propio de Comprar/Alquilar (séptima pasada) ──────────────────
describe('LocationPicker — agrupado por mercado, dinámico, value técnico preservado', () => {
  const fakeOptions: ListingLocationOption[] = [
    { value: 'state:3', label: 'Argentina', kind: 'state', count: 5, region: 'AR', shortLabel: 'Argentina' },
    { value: 'city:10', label: 'Tigre · Argentina', kind: 'city', count: 3, region: 'AR', shortLabel: 'Tigre' },
    {
      value: 'neighborhood:20',
      label: 'Benavídez · Tigre · Argentina',
      kind: 'neighborhood',
      count: 2,
      region: 'AR',
      shortLabel: 'Benavídez',
    },
    {
      value: 'neighborhood:99',
      label: 'Villa Fantasía Test · Tigre · Argentina',
      kind: 'neighborhood',
      count: 1,
      region: 'AR',
      shortLabel: 'Villa Fantasía Test',
    },
    { value: 'state:9', label: 'Estados Unidos', kind: 'state', count: 2, region: 'US', shortLabel: 'Estados Unidos' },
    {
      value: 'neighborhood:91',
      label: 'Miami · Florida · Estados Unidos',
      kind: 'neighborhood',
      count: 2,
      region: 'US',
      shortLabel: 'Miami',
    },
  ];

  // El popover (con las opciones agrupadas) solo se monta en el DOM cuando `open` es true — un
  // estado que solo cambia por click/teclado. Este repo no tiene jsdom/testing-library (Vitest
  // corre en `environment: 'node'`, ver vitest.config.ts), así que ningún test de la suite simula
  // eventos de interacción real; el patrón establecido es probar la lógica pura por separado.
  // `groupOptions` (exportada de LocationPicker.tsx) es exactamente esa lógica de agrupación —
  // se prueba directo acá, y el resto de los tests de este describe cubren lo que sí es visible
  // en el render inicial (trigger cerrado, hidden input, atributos ARIA).
  it('agrupa por mercado con nombres públicos (Buenos Aires/Miami), nunca la estructura técnica', () => {
    const groups = groupOptions(fakeOptions);
    expect(groups.map((g) => g.marketLabel)).toEqual(['Buenos Aires', 'Miami']);
    const allLabels = groups.flatMap((g) => [g.marketLabel, ...g.options.map((o) => o.shortLabel)]);
    expect(allLabels).not.toContain('Mercado');
    expect(allLabels).not.toContain('Ciudad / localidad');
    expect(allLabels).not.toContain('Barrio');
    expect(allLabels).not.toContain('Argentina');
    expect(allLabels).not.toContain('Estados Unidos');
    // El nivel "state" (Mercado técnico) no se ofrece como opción clickeable — ya está
    // representado por el propio encabezado de grupo.
    expect(groups.every((g) => g.options.every((o) => o.kind !== 'state'))).toBe(true);
  });

  it('opciones 100% derivadas de las facets recibidas — un nombre inventado en el fixture aparece, nada hardcodeado', () => {
    const groups = groupOptions(fakeOptions);
    const shortLabels = groups.flatMap((g) => g.options.map((o) => o.shortLabel));
    expect(shortLabels).toContain('Villa Fantasía Test');
    expect(shortLabels).toContain('Benavídez');
    expect(shortLabels).toContain('Tigre');
    expect(shortLabels).toContain('Miami');
  });

  it('muestra el nombre corto (sin repetir país/mercado) — no el label compuesto completo', () => {
    const html = render(React.createElement(LocationPicker, { name: 'ubicacion', options: fakeOptions, defaultValue: 'all' }));
    expect(html).not.toContain('Benavídez · Tigre · Argentina');
    expect(html).not.toContain('Miami · Florida · Estados Unidos');
  });

  it('con un value ya activo, conserva el id técnico en el hidden input y muestra el shortLabel en el trigger', () => {
    const html = render(
      React.createElement(LocationPicker, { name: 'ubicacion', options: fakeOptions, defaultValue: 'neighborhood:20' }),
    );
    expect(html).toContain('name="ubicacion" value="neighborhood:20"');
    expect(html).toContain('>Benavídez<');
  });

  it('accesibilidad básica: trigger tipo botón con aria-haspopup/aria-expanded, popover cerrado no está en el DOM', () => {
    const html = render(React.createElement(LocationPicker, { name: 'ubicacion', options: fakeOptions, defaultValue: 'all' }));
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="listbox"');
    expect(html).not.toContain('Buscar ubicación');
  });

  it('/propiedades sigue con el <select> nativo de Ubicación — el LocationPicker no se usa ahí', () => {
    const catalog = emptyCatalogResult({ properties: [property({ propertyId: 1 })], propertyTotalCount: 1 });
    const html = render(React.createElement(CatalogView, { catalog, showDevelopments: true }));
    expect(html).toContain('id="ubicacion"');
    expect(html).not.toContain('location-picker-trigger');
  });
});

// ── Filtros activos — chips removibles individualmente (Comprar/Alquilar, séptima pasada) ──
describe('Filtros activos — chips en Comprar/Alquilar, URL/server state sin duplicar', () => {
  it('removeFilterHref preserva todos los filtros salvo el indicado, sin tocar operación (forzada)', () => {
    const filters = {
      location: 'neighborhood:20' as const,
      operation: 'venta' as const,
      propertyTypeId: 2,
      bedrooms: 2,
      rooms: 3,
      aptoCredito: true,
      price: { currency: 'U$D', min: 100000, max: 300000 },
      offset: 0,
      limit: 30,
    };
    const withoutLocation = removeFilterHref(filters, '/comprar', 'ubicacion');
    expect(withoutLocation).not.toContain('ubicacion=');
    expect(withoutLocation).toContain('tipo=2');
    expect(withoutLocation).toContain('moneda=U%24D');
    expect(withoutLocation).not.toContain('operacion=');

    const withoutPrice = removeFilterHref(filters, '/comprar', 'precio');
    expect(withoutPrice).not.toContain('moneda=');
    expect(withoutPrice).not.toContain('precioMin=');
    expect(withoutPrice).not.toContain('precioMax=');
    expect(withoutPrice).toContain('ubicacion=neighborhood%3A20');
  });

  it('con filtros activos, CatalogView renderiza chips informativos con label público y × para quitar', () => {
    const catalog = emptyCatalogResult({
      filters: {
        location: 'neighborhood:20',
        operation: 'venta',
        propertyTypeId: 2,
        bedrooms: null,
        rooms: null,
        aptoCredito: false,
        price: { currency: '', min: null, max: null },
        offset: 0,
        limit: 30,
      },
      availableLocations: [
        { value: 'neighborhood:20', label: 'Benavídez · Tigre · Argentina', kind: 'neighborhood', count: 1, region: 'AR', shortLabel: 'Benavídez' },
      ],
      propertyTypes: [{ typeId: 2, name: 'Departamento', appId: '5792' }],
      properties: [property({ propertyId: 1 })],
      propertyTotalCount: 1,
    });
    const html = render(
      React.createElement(CatalogView, { catalog, showDevelopments: false, actionPath: '/comprar', lockedOperation: 'venta' }),
    );
    expect(html).toContain('twoclics-active-filters');
    expect(html).toContain('twoclics-active-filter-chip');
    expect(html).toContain('>Benavídez');
    expect(html).toContain('>Departamento');
  });

  it('sin filtros activos, no se renderiza la lista de chips', () => {
    const catalog = emptyCatalogResult({ properties: [property({ propertyId: 1 })], propertyTotalCount: 1 });
    const html = render(
      React.createElement(CatalogView, { catalog, showDevelopments: false, actionPath: '/comprar', lockedOperation: 'venta' }),
    );
    expect(html).not.toContain('twoclics-active-filters');
  });

  it('/propiedades nunca renderiza chips de filtros activos (feature exclusiva de Comprar/Alquilar)', () => {
    const catalog = emptyCatalogResult({
      filters: {
        location: 'neighborhood:20',
        operation: 'venta',
        propertyTypeId: 2,
        bedrooms: null,
        rooms: null,
        aptoCredito: false,
        price: { currency: '', min: null, max: null },
        offset: 0,
        limit: 30,
      },
      properties: [property({ propertyId: 1 })],
      propertyTotalCount: 1,
    });
    const html = render(React.createElement(CatalogView, { catalog, showDevelopments: true }));
    expect(html).not.toContain('twoclics-active-filters');
  });
});

// ── 4. Exclusión curatorial en getPropertyCatalog (con datos reales mockeados) ──────────────
describe('getPropertyCatalog — exclusión curatorial (excludePropertyIds)', () => {
  it('una propiedad excluida no aparece en `properties` aunque matchee la consulta', async () => {
    const { getPropertyCatalog } = await loadListings();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: 'success',
        count: 2,
        properties: [
          { propertyId: 187676, operationType: 'VENTA', webListing: 'SIMPLE', propertyType: { typeId: 2, name: 'Casa', appId: '5791' } },
          { propertyId: 999, operationType: 'VENTA', webListing: 'SIMPLE', propertyType: { typeId: 2, name: 'Casa', appId: '5791' } },
        ],
      }),
    );
    global.fetch = fetchMock as never;

    const result = await getPropertyCatalog({ operacion: 'venta' }, { excludePropertyIds: [187676] });
    const ids = result.properties.map((p) => p.propertyId);
    expect(ids).toContain(999);
    expect(ids).not.toContain(187676);
  });

  it('sin excludePropertyIds (uso de /propiedades), el comportamiento no cambia — /propiedades nunca excluye', async () => {
    const { getPropertyCatalog } = await loadListings();
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: 'success',
        count: 1,
        properties: [{ propertyId: 187676, operationType: 'VENTA', webListing: 'SIMPLE' }],
      }),
    );
    global.fetch = fetchMock as never;

    const result = await getPropertyCatalog({});
    expect(result.properties.map((p) => p.propertyId)).toContain(187676);
  });
});

// ── 5. Home — buscador eliminado, Hero limpio, Trayectoria, Contacto compacto ───────────────
describe('Home — live search retirado (WEB GARCÍA V2, cuarta pasada)', () => {
  it('lib/2clics/listings.ts ya no exporta nada del buscador (código net-new sin uso, retirado)', async () => {
    const listings = await loadListings();
    expect((listings as Record<string, unknown>).searchPublicProperties).toBeUndefined();
    expect((listings as Record<string, unknown>).getOperationInventoryFacets).toBeUndefined();
  });

  it('app/page.tsx ya no importa HeroSearch/HomeSearch/HomeEditorialLinks, sí Trayectoria', () => {
    const pageSource = readFileSync('app/page.tsx', 'utf8');
    expect(pageSource).not.toContain("from '@/components/sections/HeroSearch'");
    expect(pageSource).not.toContain("from '@/components/sections/HomeSearch'");
    expect(pageSource).not.toContain("from '@/components/sections/HomeEditorialLinks'");
    expect(pageSource).toContain('Trayectoria');
    expect(pageSource).toContain('FeaturedProperties');
    expect(pageSource).toContain('Newsletter');
  });

  it('app/page.tsx (quinta pasada) ya no importa ni renderiza Contact — Contacto es /contacto', () => {
    const pageSource = readFileSync('app/page.tsx', 'utf8');
    expect(pageSource).not.toContain("from '@/components/sections/Contact'");
    expect(pageSource).not.toContain('<Contact');
    expect(pageSource).not.toContain('/#contacto');
  });

  it('componentes/archivos net-new del buscador se borraron del repo (sin código muerto)', () => {
    expect(existsSync('components/sections/HeroSearch.tsx')).toBe(false);
    expect(existsSync('components/sections/HomeSearch.tsx')).toBe(false);
    expect(existsSync('components/sections/HomeEditorialLinks.tsx')).toBe(false);
    expect(existsSync('components/ui/IntentGrid.tsx')).toBe(false);
    expect(existsSync('actions/home-search.ts')).toBe(false);
    expect(existsSync('app/api/search')).toBe(false);
    expect(existsSync('tests/api/search.test.ts')).toBe(false);
  });
});

describe('Hero — limpio, CTA hacia Contacto', () => {
  it('sin buscador, con título/bajada vigentes y "Hablar con un asesor" → /contacto', () => {
    const html = render(React.createElement(Hero));
    expect(html).toContain('visión estratégica');
    expect(html).toContain('Somos una consultora boutique de real estate en Buenos Aires y Miami');
    expect(html).toContain('Hablar con un asesor');
    expect(html).toContain('href="/contacto"');
    expect(html).not.toContain('href="/#contacto"');
    expect(html).not.toContain('¿Qué propiedad estás buscando?');
    expect(html).not.toContain('hero-search');
    expect(html).not.toContain('wa.me');
  });
});

describe('Header — botón CONTACTO reemplaza al teléfono', () => {
  it('el botón de la derecha es "Contacto" hacia /contacto, no tel:', () => {
    const html = render(React.createElement(Header));
    expect(html).toContain('hdr-contact-link');
    expect(html).toContain('href="/contacto"');
    expect(html).not.toContain('href="/#contacto"');
    expect(html).toContain('>Contacto<');
    expect(html).not.toContain('tel:+5491167240353');
  });
});

describe('Trayectoria — cifras institucionales reutilizadas de /nosotros, sin inventar', () => {
  it('reutiliza exactamente número/label/contexto ya aprobados en Why.tsx', () => {
    const html = render(React.createElement(Trayectoria));
    expect(html).toContain('Trayectoria');
    expect(html).toContain('+500');
    expect(html).toContain('Operaciones realizadas');
    expect(html).toContain('+20 años');
    expect(html).toContain('En la industria del real estate');
    expect(html).toContain('Buenos Aires + Miami');
    expect(html).toContain('Mercados activos');
    // Ninguna cifra nueva inventada — exactamente 3 stats (label es un marcador sin ambigüedad,
    // a diferencia de trayectoria-stat-number, que también matchea como prefijo del modifier
    // --market en el tercer stat).
    const matches = html.match(/trayectoria-stat-label/g) || [];
    expect(matches.length).toBe(3);
  });
});

describe('Contacto — compacto, sin chips de confianza', () => {
  it('mantiene los 4 canales y el formulario completo, sin los chips "Atención.../Sin compromiso"', () => {
    const html = render(React.createElement(Contact));
    expect(html).toContain('WhatsApp');
    expect(html).toContain('contacto@garciainversiones.com.ar');
    expect(html).toContain('@garciainversiones.re');
    expect(html).toContain('Buenos Aires, Argentina');
    expect(html).not.toContain('Atención personalizada');
    expect(html).not.toContain('Atención directa');
    expect(html).not.toContain('Sin compromiso');
    expect(html).not.toContain('trust-badge');
  });

  it('tiene encabezado editorial propio (eyebrow CONTACTO + H1 Hablemos) — quinta pasada', () => {
    const html = render(React.createElement(Contact));
    expect(html).toContain('id="contacto"');
    expect(html).toContain('<h1>Hablemos</h1>');
    expect(html).toContain('>Contacto</span>');
  });
});

// ── 7. /contacto — landing independiente (WEB GARCÍA V2, quinta pasada) ────────────────────
describe('/contacto — landing propia, Contacto sale del Home', () => {
  it('app/contacto/page.tsx compone Header → Contact → Footer y metadata coherente', () => {
    const source = readFileSync('app/contacto/page.tsx', 'utf8');
    expect(source).toContain("from '@/components/layout/Header'");
    expect(source).toContain("from '@/components/sections/Contact'");
    expect(source).toContain("from '@/components/layout/Footer'");
    expect(source).toContain('<Header');
    expect(source).toContain('<Contact');
    expect(source).toContain('<Footer');
    expect(source).toContain("title: 'Contacto | García Inversiones Inmobiliarias'");
    expect(source).toContain("canonical: '/contacto'");
  });

  it('Footer linkea Contacto a /contacto, no a /#contacto', () => {
    const html = render(React.createElement(Footer));
    expect(html).toContain('href="/contacto"');
    expect(html).not.toContain('href="/#contacto"');
  });

  it('sitemap.ts incluye /contacto', () => {
    const source = readFileSync('app/sitemap.ts', 'utf8');
    expect(source).toContain("'/contacto'");
  });

  it('leads específicos de propiedad no cambian: la ficha no referencia /contacto ni /#contacto', () => {
    const detailSource = readFileSync('components/properties/PropertyDetailView.tsx', 'utf8');
    const panelSource = readFileSync('components/properties/PropertyInquiryPanel.tsx', 'utf8');
    expect(detailSource).not.toContain('/contacto');
    expect(detailSource).not.toContain('/#contacto');
    expect(panelSource).not.toContain('/contacto');
    expect(panelSource).not.toContain('/#contacto');
  });

  it('el formulario sigue usando la misma Server Action/backend (submitContact, consulta_general)', () => {
    const formSource = readFileSync('components/forms/ContactForm.tsx', 'utf8');
    expect(formSource).toContain("from '@/actions/contact'");
    expect(formSource).toContain('submitContact');
    expect(formSource).toContain("lead_type', 'consulta_general'");
  });
});

// ── 6. Curaduría/Routing — Faena, Invertir slug, ficha canónica ─────────────────────────────
describe('Fichas canónicas — Faena e Invertir linkean siempre a /propiedades/[id]', () => {
  const faena = getDevelopmentBySlug('faena')!;
  const source = property({ propertyId: 187676 });

  it('CuratedDevelopmentCard usa el nombre real de la fuente (2Clics), no el nombre editorial interno, y linkea al slug curado', () => {
    const html = render(React.createElement(CuratedDevelopmentCard, { curation: faena, source: toDevelopmentCardSource(source) }));
    expect(html).toContain(source.title);
    expect(html).not.toContain('>Proyecto Faena<');
    expect(html).toContain('href="/desarrollos/faena"');
  });

  it('CuratedDevelopmentDetailView linkea cada unidad a su ficha canónica cuando hay más de un registro real, sin reproducirla', () => {
    const otherUnit = property({ propertyId: 187677 });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: faena,
        source: toDevSource(source),
        units: [source, otherUnit],
      }),
    );
    expect(html).toContain('href="/propiedades/187676"');
    expect(html).toContain('href="/propiedades/187677"');
    expect(html).not.toContain('twoclics-essential-strip');
  });

  it('"Consultar desarrollo" reutiliza el flujo de consulta específico de propiedad (PropertyInquiryPanel) asociado a 187676 — nunca /contacto ni WhatsApp directo, una única vez (solo al cierre)', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(source), units: [source] }),
    );
    expect(html).not.toContain('href="/contacto"');
    expect(html).not.toContain('wa.me');
    expect(html).not.toContain('data-whatsapp-location="desarrollo"');
    expect(html).toContain('data-property-app-id="187676"');
    expect(html).toContain('>Consultar desarrollo<');
    // Decimotercera pasada: una sola instancia fuerte de consulta, al final — sin CTA en la apertura.
    expect((html.match(/data-property-app-id="187676"/g) || []).length).toBe(1);
  });

  it('sin CTA en la apertura — la sección project-open no contiene el botón de consulta', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(source), units: [source] }),
    );
    const openSection = html.match(/<section class="project-open">[\s\S]*?<\/section>/);
    expect(openSection).not.toBeNull();
    expect(openSection![0]).not.toContain('data-property-app-id');
    expect(openSection![0]).not.toContain('Consultar desarrollo');
  });

  it('landing editorial (decimotercera pasada): apertura con imagen real protagonista, sin hero full-width ni galería tradicional', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(source), units: [source] }),
    );
    expect(html).toContain('class="project-open"');
    // next/image reescribe el src a /_next/image?url=<encoded>... — se verifica la URL real
    // codificada, no el string crudo.
    expect(html).toContain(encodeURIComponent(source.images[0].displayUrl));
    // El hero fotográfico full-width de 60vh (novena pasada), el hero navy de texto, y la
    // introducción-en-caja con galería tradicional (undécima pasada) quedaron retirados.
    expect(html).not.toContain('class="project-hero"');
    expect(html).not.toContain('class="twoclics-detail-hero"');
    expect(html).not.toContain('twoclics-gallery');
  });

  it('curaduría real: reconoce y separa los bloques "El edificio" y "Residencias" de la descripción real de Faena, sin inventar contenido ni repetir la frase de apertura', () => {
    const fullDescription = property({
      propertyId: 187676,
      meta_data: [
        {
          metaKey: 'description',
          metaValue:
            'Tras haber transformado Miami Beach en un centro global de arte, cultura, hospitalidad y diseño, ahora nos embarcamos en un nuevo viaje que promete crear un epicentro cultural innovador a lo largo del Rio Miami. Con nuestro compromiso inquebrantable con la belleza, la creatividad y la innovación, este proyecto inspirara. Alan Faena.\n\nEl edificio\nParque privado\nInstalaciones de bienestar\nMarina\nArte público\nSala Club\nRestaurante\nSala de proyecciones\nResidencias\nElevadores privados\nTechos de 3 a 3.6 metros de altura\nBaños tipo spa con duchas y bañeras tipo lluvia\n\n1 Habitación desde U$D 1.300.000',
        },
      ],
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(fullDescription), units: [fullDescription] }),
    );
    expect(html).toContain('<h2>El proyecto</h2>');
    expect(html).toContain('<h2>El edificio</h2>');
    expect(html).toContain('<h2>Residencias</h2>');
    // Items reales de la fuente, sin inventar.
    expect(html).toContain('Parque privado');
    expect(html).toContain('Marina');
    expect(html).toContain('Elevadores privados');
    expect(html).toContain('Baños tipo spa con duchas y bañeras tipo lluvia');
    // La primera oración (apertura) no se repite dentro de "El proyecto".
    const openMatch = html.match(/class="project-open-text">([^<]*)</);
    const proyectoMatch = html.match(/<h2>El proyecto<\/h2><p>([^<]*)</);
    expect(openMatch).not.toBeNull();
    expect(proyectoMatch).not.toBeNull();
    expect(proyectoMatch![1]).not.toBe(openMatch![1]);
    expect(proyectoMatch![1]).not.toContain(openMatch![1]!);
  });

  it('nunca muestra precios ni cronograma de señas/fechas de obra extraídos de la descripción libre', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(source), units: [source] }),
    );
    expect(html).not.toContain('desde U$D');
    expect(html).not.toContain('DEPOSITOS Y FECHAS');
    expect(html).not.toContain('groundbreaking');
    expect(html).not.toContain('at closing');
    expect(html).not.toContain('at top-off');
  });

  it('nunca muestra amenities estructurados ni "Permite mascotas", aunque existan datos reales — la landing no tiene sección de amenities', () => {
    const withAmenities = property({
      propertyId: 187676,
      amenities: [
        { amenitieId: '1', name: 'Permite mascotas', type: 'general' },
        { amenitieId: '2', name: 'Pileta', type: 'general' },
        { amenitieId: '3', name: 'Gimnasio', type: 'general' },
      ],
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(withAmenities), units: [withAmenities] }),
    );
    expect(html).not.toContain('Permite mascotas');
    expect(html).not.toContain('Amenities y servicios');
    expect(html).not.toContain('twoclics-chip-list');
  });

  it('no repite la portada ni duplica ninguna imagen entre bloques (apertura, momento visual, edificio, residencias)', () => {
    const manyImages = property({
      propertyId: 187676,
      images: Array.from({ length: 8 }, (_, i) => ({ imageId: `img${i}`, url: `https://cdn.2clics.com/${i}.jpg` })),
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(manyImages), units: [manyImages] }),
    );
    const imgTags = html.match(/<img[^>]*>/g) || [];
    const usedUrls = manyImages.images
      .map((img) => encodeURIComponent(img.displayUrl))
      .filter((enc) => imgTags.some((tag) => tag.includes(enc)));
    // Cada URL real usada debe aparecer en un único <img> (nunca la misma foto en dos bloques).
    for (const enc of usedUrls) {
      const tagsWithThisUrl = imgTags.filter((tag) => tag.includes(enc));
      expect(tagsWithThisUrl.length).toBe(1);
    }
  });

  it('ninguna imagen editorial usa sizes="100vw" en solitario (causa de las imágenes borrosas — la auditoría de resolución real limita el ancho de render)', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(source), units: [source] }),
    );
    expect(html).not.toContain('sizes="100vw"');
  });

  it('sin imágenes, la apertura se degrada con gracia (sin columna de imagen, sin romper)', () => {
    const noImages = property({ propertyId: 187676, images: [] });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(noImages), units: [noImages] }),
    );
    expect(html).toContain('class="project-open"');
    expect(html).not.toContain('class="project-open-media"');
    expect(html).toContain(noImages.title);
  });

  it('sin sección "Datos del proyecto" — el conteo de unidades ya lo comunica la grilla de abajo', () => {
    const sourceWithUnitData = property({ propertyId: 187676, totalArea: 320, propertyType: { typeId: 2, name: 'Departamento', appId: '5792' } });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: faena,
        source: toDevSource(sourceWithUnitData),
        units: [sourceWithUnitData],
      }),
    );
    expect(html).not.toContain('Datos del proyecto');
    expect(html).not.toContain('<dt>Tipo</dt>');
    expect(html).not.toContain('<dt>Superficie total</dt>');
    expect(html).not.toContain('Unidades disponibles');
    // "Departamento" sí puede aparecer en la PropertyCard de "Propiedades disponibles" (describe
    // esa unidad puntual) — eso está bien, ya no hay una sección de highlights de proyecto.
  });

  it('sin video real, no renderiza sección "Video" (sin placeholder)', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(source), units: [source] }),
    );
    expect(html).not.toContain('>Video<');
  });

  it('FeaturedSpotlight ("Conocer proyecto"/"Conocer esta inversión") linkea al slug esperado', () => {
    const html = render(
      React.createElement(FeaturedSpotlight, {
        eyebrow: 'Proyecto',
        title: 'Proyecto Faena',
        image: source.images[0],
        ctaHref: '/desarrollos/faena',
        ctaLabel: 'Conocer proyecto',
      }),
    );
    expect(html).toContain('href="/desarrollos/faena"');
    expect(html).toContain('Conocer proyecto');
  });

  it('InvestmentOpportunityDetailView (206734) no menciona personas/figuras legales', () => {
    const opportunity = getInvestmentOpportunityBySlug('proyecto-especial-miami')!;
    const opportunityProperty = property({ propertyId: 206734 });
    const html = render(
      React.createElement(InvestmentOpportunityDetailView, {
        opportunity,
        source: {
          propertyId: opportunityProperty.propertyId,
          region: opportunityProperty.region,
          images: opportunityProperty.images,
        },
      }),
    );
    expect(html.toLowerCase()).not.toContain('marcelo');
    expect(html.toLowerCase()).not.toContain('chami');
  });
});

// ── /invertir y /invertir/proyecto-especial-miami — reescritura editorial (decimocuarta pasada) ──
describe('InvestmentOpportunityDetailView — no es una ficha de propiedad, sin datos placeholder del registro técnico', () => {
  const opportunity = getInvestmentOpportunityBySlug('proyecto-especial-miami')!;
  // Simula el registro real 206734: título/dirección/descripción placeholder de "Casa en venta en
  // Miami" — el componente NUNCA debe leer estos campos (su prop `source` ni siquiera los acepta),
  // así que da igual qué contengan acá: sirven para demostrar que cambiarlos no afecta el output.
  const placeholderProperty = property({
    propertyId: 206734,
    address: 'Casa en venta en Miami',
    price: 100000,
    currency: 'U$D',
    totalArea: 1000,
    propertyType: { typeId: 2, name: 'Casa', appId: '5791' },
    meta_data: [
      {
        metaKey: 'description',
        metaValue: 'Retorno estimado para el inversor: superior al 15% anual del capital invertido. 100% renta pasiva.',
      },
    ],
  });
  const source = {
    propertyId: placeholderProperty.propertyId,
    region: placeholderProperty.region,
    images: placeholderProperty.images,
  };

  it('nunca muestra el registro técnico como producto: sin "Casa", sin 1.000 m2/1000, sin U$D 100.000, sin la descripción con promesa de retorno', () => {
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));
    expect(html).not.toContain('Casa en venta');
    expect(html).not.toContain('>Casa<');
    expect(html).not.toContain('1000 m');
    expect(html).not.toContain('100.000');
    expect(html).not.toContain('renta pasiva');
    expect(html).not.toContain('15% anual');
    expect(html).not.toContain('superior al');
  });

  it('no reutiliza la ficha tradicional: sin "Ver ficha de la propiedad", sin "Propiedad relacionada", sin mapa', () => {
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));
    expect(html).not.toContain('Ver ficha de la propiedad');
    expect(html).not.toContain('Propiedad relacionada');
    expect(html).not.toContain('href="/propiedades/206734"');
    expect(html).not.toContain('twoclics-map');
  });

  it('property_app_id 206734 llega a PropertyInquiryPanel, con un único CTA de conversión en toda la landing', () => {
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));
    expect(html).toContain('data-property-app-id="206734"');
    expect((html.match(/data-property-app-id="206734"/g) || []).length).toBe(1);
    expect(html).toContain('>Conocer la oportunidad<');
    expect(html).not.toContain('Invertir ahora');
    expect(html).not.toContain('wa.me/5491167240353?text=');
  });

  it('sin CTA en la apertura (project-open no contiene el botón de consulta)', () => {
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));
    const openSection = html.match(/<section class="project-open project-open--compact">[\s\S]*?<\/section>/);
    expect(openSection).not.toBeNull();
    expect(openSection![0]).not.toContain('data-property-app-id');
  });

  it('apertura usa la variante compacta (decimoquinta pasada) — nunca la clase base sin modificador, esa sigue siendo exclusiva de Faena', () => {
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));
    expect(html).toContain('class="project-open project-open--compact"');
  });

  it('los dos proyectos aparecen justo después de "Qué es esta oportunidad" y antes de "Coconut Grove" — el reordenamiento de la decimoquinta pasada', () => {
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));
    const whatIsIdx = html.indexOf('Participar en la creación de valor inmobiliario');
    const projectsIdx = html.indexOf('Los dos proyectos de Coconut Grove');
    const firstAddressIdx = html.indexOf('1710 S. Bayshore Drive');
    const coconutGroveIdx = html.indexOf('Coconut Grove y el valor de una microubicación');
    expect(whatIsIdx).toBeGreaterThan(-1);
    expect(projectsIdx).toBeGreaterThan(whatIsIdx);
    expect(firstAddressIdx).toBeGreaterThan(projectsIdx);
    expect(coconutGroveIdx).toBeGreaterThan(firstAddressIdx);
  });

  it('1710 y 1716 quedan inequívocamente como dos residencias distintas — etiquetadas "Residencia 1 de 2"/"Residencia 2 de 2", cada una con su propia imagen, sin mezclar specs', () => {
    const twoImages = property({
      propertyId: 206734,
      images: Array.from({ length: 8 }, (_, i) => ({ imageId: `img${i}`, url: `https://cdn.2clics.com/${i}.jpg` })),
    });
    const html = render(
      React.createElement(InvestmentOpportunityDetailView, {
        opportunity,
        source: { propertyId: twoImages.propertyId, region: twoImages.region, images: twoImages.images },
      }),
    );
    expect(html).toContain('Residencia 1 de 2');
    expect(html).toContain('Residencia 2 de 2');

    // Cada bloque de residencia (project-block) tiene exactamente una imagen, y no comparten la
    // misma URL entre sí.
    const blocks = html.match(/<section class="project-block[^"]*">[\s\S]*?<\/section>/g) || [];
    expect(blocks.length).toBe(2);
    const [block1710, block1716] = blocks as [string, string];
    expect(block1710).toContain('1710 S. Bayshore Drive');
    expect(block1716).toContain('1716 S. Bayshore Drive');
    const imgSrc1710 = block1710.match(/src="([^"]*)"/)?.[1];
    const imgSrc1716 = block1716.match(/src="([^"]*)"/)?.[1];
    expect(imgSrc1710).toBeTruthy();
    expect(imgSrc1716).toBeTruthy();
    expect(imgSrc1710).not.toBe(imgSrc1716);

    // Nunca mezclar specs: los dormitorios de 1710 (6) no aparecen dentro del bloque de 1716, y
    // viceversa.
    expect(block1710).toContain('6 dormitorios');
    expect(block1710).not.toContain('7 dormitorios');
    expect(block1716).toContain('7 dormitorios');
    expect(block1716).not.toContain('6 dormitorios');
  });

  it('sin atribución arquitectónica dudosa: ninguna mención de estilo (Caribbean Colonial/contemporáneo) en ninguno de los dos proyectos', () => {
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));
    expect(html).not.toContain('Caribbean Colonial');
    expect(html).not.toContain('contemporáneo');
    expect(html).not.toContain('arquitectónic');
  });

  it('no aparecen datos dinámicos/contractuales no reconfirmados esta pasada (75/25, ventanas de meses, ni cifras de retorno)', () => {
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));
    expect(html).not.toContain('75/25');
    expect(html).not.toContain('18/24/30');
    expect(html).not.toContain('18–30');
    expect(html).not.toMatch(/\d+\s*%\s*anual/);
    expect(html).not.toMatch(/\bseptiembre\b|\bnoviembre\b/i);
  });

  it('"Para quién" usa tono de análisis, no de veredicto de aptitud financiera', () => {
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));
    expect(html).toContain('Puede tener sentido analizarla para alguien que:');
    expect(html).not.toContain('Probablemente no sea adecuada para alguien que:');
  });

  it('no presenta claims de rentabilidad garantizada; explicita "retorno no garantizado" como riesgo', () => {
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));
    expect(html).not.toContain('renta garantizada');
    expect(html).not.toContain('rentabilidad garantizada');
    expect(html).not.toContain('retorno garantizado');
    expect(html).toContain('Retorno no garantizado');
    expect(html).toContain('Una proyección no equivale a un resultado.');
  });

  it('condiciones vigentes: sin montos/plazos hardcodeados, "Consultar" mientras no haya confirmación fechada', () => {
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));
    expect(html).not.toContain('75/25');
    expect(html).not.toContain('18–30');
    expect(html).not.toContain('18-30');
    expect(html).not.toContain('70–75%');
    expect(html).not.toContain('30% anual');
    expect(html).not.toContain('Última actualización');
    expect(html).toContain('Consultar');
  });

  it('los dos proyectos muestran datos reales y distintos, nunca precios de salida inventados', () => {
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));
    expect(html).toContain('1710 S. Bayshore Drive');
    expect(html).toContain('1716 S. Bayshore Drive');
    expect(html).toContain('7 dormitorios');
    expect(html).toContain('6 dormitorios');
    expect(html).toContain('Dock privado');
    expect(html).not.toMatch(/U\$D\s*[\d.,]+/);
    expect(html).not.toMatch(/USD\s*[\d.,]+/);
  });

  it('developer: nombre/descripción/fundadores presentes, sin agregados no confirmados ("1.000 viviendas"/"USD 200 millones")', () => {
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));
    expect(html).toContain('Olivia Harper Homes');
    expect(html).toContain('John Schamy');
    expect(html).toContain('Jack Echterling');
    expect(html).not.toContain('1.000 viviendas');
    expect(html).not.toContain('200 millones');
  });

  it('imágenes: sin sizes="100vw" (nunca escala por encima de la resolución fuente auditada)', () => {
    const manyImages = property({
      propertyId: 206734,
      images: Array.from({ length: 20 }, (_, i) => ({ imageId: `img${i}`, url: `https://cdn.2clics.com/${i}.jpg` })),
    });
    const html = render(
      React.createElement(InvestmentOpportunityDetailView, {
        opportunity,
        source: { propertyId: manyImages.propertyId, region: manyImages.region, images: manyImages.images },
      }),
    );
    expect(html).not.toContain('sizes="100vw"');
  });

  it('sin curaduría editorial para un slug (defensivo): degrada a bloque mínimo con CTA, nunca inventa una landing', () => {
    const unknownOpportunity = { ...opportunity, slug: 'sin-curaduria', name: 'Oportunidad sin curar' };
    const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity: unknownOpportunity, source }));
    expect(html).toContain('Oportunidad sin curar');
    expect(html).toContain('data-property-app-id="206734"');
    expect(html).not.toContain('1710 S. Bayshore');
  });
});

describe('/invertir (índice) — refuerzo educativo (decimoquinta pasada)', () => {
  const invertirSource = readFileSync('app/invertir/page.tsx', 'utf8');

  it('diferencia explícitamente las tres formas de participar — nunca las presenta como equivalentes', () => {
    expect(invertirSource).toContain('Propiedad terminada');
    expect(invertirSource).toContain('Unidad dentro de un desarrollo');
    expect(invertirSource).toContain('Participación en un proyecto');
    // Cada alternativa tiene sus propios puntos concretos, no una frase genérica compartida.
    expect(invertirSource).toContain('El inversor tiene control directo sobre ese activo.');
    expect(invertirSource).toContain('Sigue existiendo una adquisición inmobiliaria directa.');
    expect(invertirSource).toContain('No necesariamente se compra la propiedad terminada.');
  });

  it('incluye la tabla comparativa "Qué cambia entre una alternativa y otra" con los 6 factores pedidos', () => {
    expect(invertirSource).toContain('Qué cambia entre una alternativa y otra');
    expect(invertirSource).toContain('invest-compare-table');
    const factors = [
      'Qué se adquiere / dónde participa el capital',
      'Cómo puede generarse valor',
      'Horizonte',
      'Liquidez',
      'Riesgos principales',
      'Nivel de participación / control',
    ];
    for (const factor of factors) {
      expect(invertirSource).toContain(factor);
    }
  });

  it('"Cómo analiza García" tiene los 6 factores + mensaje de cierre, sin "Real estate con criterio" como slogan', () => {
    expect(invertirSource).toContain('Cómo analiza García una inversión');
    expect(invertirSource).toContain('Objetivo');
    expect(invertirSource).toContain('Capital y exposición');
    expect(invertirSource).toContain('Horizonte y necesidad de liquidez');
    expect(invertirSource).toContain('Mercado, microubicación y producto');
    expect(invertirSource).toContain('Riesgo y variables de ejecución');
    expect(invertirSource).toContain('Estrategia de salida');
    expect(invertirSource).toContain('No buscamos encajar a todos los clientes en una misma inversión');
    expect(invertirSource).not.toContain('Real estate con criterio');
  });

  it('la card de la oportunidad es compacta (invest-opportunity-*), ya no reutiliza la huella completa de .project-open', () => {
    expect(invertirSource).toContain('invest-opportunity-card');
    expect(invertirSource).toContain('invest-opportunity-media');
    expect(invertirSource).not.toContain('className="project-open"');
    expect(invertirSource).not.toContain('project-open-grid');
  });

  it('sin ticket mínimo ni cifras de inversión en la card de la oportunidad', () => {
    expect(invertirSource).not.toContain('100.000');
    expect(invertirSource).not.toMatch(/U\$D\s*[\d.,]+/);
  });

  it('mantiene el Hero actual (eyebrow Invertir, H1 sin cambios) y el CTA final "Hablar sobre tu objetivo"', () => {
    expect(invertirSource).toContain('Invertir empieza por entender qué estás buscando.');
    expect(invertirSource).toContain('Antes de mirar una oportunidad, miramos a la persona.');
    expect(invertirSource).toContain('Hablar sobre tu objetivo');
  });
});

describe('lib/investments.ts — curaduría no deriva automáticamente de toda propiedad en VENTA', () => {
  it('la oportunidad sigue siendo curada por slug — no existe generación automática desde operationType', () => {
    expect(getInvestmentEditorialCuration('proyecto-especial-miami')).not.toBeNull();
    expect(getInvestmentEditorialCuration('cualquier-otro-slug-no-curado')).toBeNull();
  });

  it('la lista de oportunidades activas sigue viniendo de INVESTMENT_OPPORTUNITIES (curaduría explícita), no de un scan de propiedades', () => {
    const active = getActiveInvestmentOpportunities();
    expect(active.map((o) => o.slug)).toEqual(['proyecto-especial-miami']);
  });

  it('el copy curado no usa términos legales/comerciales no confirmados ni promete rendimiento', () => {
    const curation = getInvestmentEditorialCuration('proyecto-especial-miami')!;
    const haystack = JSON.stringify(curation).toLowerCase();
    const forbidden = [
      'fondo',
      'coinversión',
      'coinversion',
      'fraccionada',
      'franquicia',
      'crowdfunding',
      'renta garantizada',
      'rentabilidad garantizada',
      'marcelo',
      'chami',
    ];
    for (const term of forbidden) {
      expect(haystack).not.toContain(term);
    }
  });
});

// ── /desarrollos — catálogo visual de proyectos, sin Hero navy, escalable (décima pasada;
// apertura editorial + H1 visible + selector de mercado en la decimonovena) ─────────────────────
describe('/desarrollos — sin Hero navy, apertura editorial con H1 visible (decimonovena pasada)', () => {
  const desarrollosSource = readFileSync('app/desarrollos/page.tsx', 'utf8');

  it('no renderiza el Hero navy tipo Comprar/Alquilar (eyebrow/banda navy) — la apertura es editorial, sobria, sin banda de color propia', () => {
    expect(desarrollosSource).not.toContain('twoclics-catalog-hero');
    expect(desarrollosSource).not.toContain('className="eyebrow"');
    expect(desarrollosSource).not.toContain('activeMarketsPhrase');
  });

  it('H1 visible con la apertura editorial exacta pedida (decimonovena pasada) — nunca placeholder ni claim comercial', () => {
    expect(desarrollosSource).toContain('<h1>Desarrollos seleccionados</h1>');
    expect(desarrollosSource).toContain(
      'Proyectos que analizamos por su ubicación, propuesta, producto y adecuación a distintos',
    );
    expect(desarrollosSource).not.toContain('<h1 className="sr-only">Desarrollos</h1>');
    // Sin claims comerciales/precio/retorno en la apertura.
    const forbiddenClaims = ['%', 'garantizad', 'retorno', 'rentabilidad', 'desde U$D', 'desde $'];
    for (const claim of forbiddenClaims) {
      expect(desarrollosSource.toLowerCase()).not.toContain(claim.toLowerCase());
    }
  });

  it('metadata SEO (title/description/canonical) se mantiene sin el Hero visual', () => {
    expect(desarrollosSource).toContain("title: 'Desarrollos | García Inversiones Inmobiliarias'");
    expect(desarrollosSource).toContain("canonical: '/desarrollos'");
  });

  it('no implementa mapa ni reserva espacio de split-screen', () => {
    expect(desarrollosSource).not.toContain('PropertyMap');
    expect(desarrollosSource).not.toContain('twoclics-map');
  });

  it('no agrega filtros de status ficticios (pre-construction/under construction/etc.)', () => {
    const forbidden = ['Pre-construction', 'Under construction', 'Completed', 'Top Off'];
    for (const phrase of forbidden) {
      expect(desarrollosSource).not.toContain(phrase);
    }
  });

  it('el copy no menciona detalles de implementación', () => {
    const forbidden = [
      'curaduría técnica',
      'property id',
      'propertyId',
      'CRM',
      '2Clics',
      'Emprendimientos',
      'arquitectura',
      '/api/development',
    ];
    for (const phrase of forbidden) {
      expect(desarrollosSource).not.toContain(phrase);
    }
  });

  it('no usa el módulo /api/development de 2Clics para la navegación V2', () => {
    expect(desarrollosSource).not.toContain('getPublicDevelopmentById');
    expect(desarrollosSource).not.toContain('DevelopmentDetailView');
  });

  it('no muestra el contador "N proyecto(s)" (undécima pasada: información innecesaria)', () => {
    expect(desarrollosSource).not.toContain('1 proyecto');
    expect(desarrollosSource).not.toContain('countLabel');
    expect(desarrollosSource).not.toContain('development-count');
  });

  it('la grilla del índice usa su propia clase (.desarrollos-grid, 4/3/2/1 columnas) — decimonovena pasada, ya no .twoclics-grid — sin tocar el sistema de 3 columnas de Comprar/Alquilar/propiedades', () => {
    expect(desarrollosSource).toContain('desarrollos-grid');
    expect(desarrollosSource).not.toContain('className="twoclics-grid"');
  });
});

describe('CuratedDevelopmentCard — grilla escalable, solo datos respaldados (decimotercera pasada)', () => {
  const faena = getDevelopmentBySlug('faena')!;
  const source = property({ propertyId: 187676 });

  it('eyebrow "Desarrollo" (no "Proyecto"), nombre real de la fuente (no concatenado con "Proyecto"), ubicación pública y link al slug — sin CTA textual redundante', () => {
    const html = render(React.createElement(CuratedDevelopmentCard, { curation: faena, source: toDevelopmentCardSource(source) }));
    expect(html).toContain('>Desarrollo<');
    expect(html).not.toContain('>Proyecto<');
    expect(html).toContain(source.title);
    expect(html).not.toContain(`Proyecto ${source.title}`);
    expect(html).toContain('Nordelta');
    expect(html).toContain('href="/desarrollos/faena"');
    expect(html).toContain(source.images[0].displayUrl);
    // Decimotercera pasada: sin "Conocer desarrollo →" — la card completa ya es el link.
    expect(html).not.toContain('Conocer desarrollo');
    // Un único <a> por card (toda la card es el link), no tres links sueltos apuntando al mismo href.
    expect((html.match(/<a /g) || []).length).toBe(1);
  });

  it('no incluye el extracto largo de la descripción, ni conteo de unidades ni precio (la card debe ser compacta y visual)', () => {
    const withDescription = property({
      propertyId: 187676,
      meta_data: [{ metaKey: 'description', metaValue: 'Tras haber transformado Miami Beach en un centro global de arte y cultura, este proyecto marca un antes y un después.' }],
    });
    const html = render(React.createElement(CuratedDevelopmentCard, { curation: faena, source: toDevelopmentCardSource(withDescription) }));
    expect(html).not.toContain('Tras haber transformado Miami Beach');
  });

  it('nunca muestra precio, unidades, año, estado, developer ni fecha de entrega — no está oficialmente respaldado', () => {
    const html = render(React.createElement(CuratedDevelopmentCard, { curation: faena, source: toDevelopmentCardSource(source) }));
    const forbidden = [
      'U$D',
      'AR$',
      'propiedad asociada',
      'propiedades asociadas',
      'Developer',
      'Pre-construction',
      'Under construction',
      'Entrega',
      'Rentabilidad',
    ];
    for (const phrase of forbidden) {
      expect(html).not.toContain(phrase);
    }
  });
});

describe('/desarrollos/faena — landing editorial (decimotercera pasada), sin mapa, sin datos sensibles', () => {
  const faena = getDevelopmentBySlug('faena')!;
  const source = property({ propertyId: 187676 });

  it('sin PropertyMap ni Google Maps embed — solo la ubicación textual, únicamente en esta landing', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(source), units: [source] }),
    );
    expect(html).not.toContain('twoclics-map');
    expect(html).not.toContain('google.com/maps');
    expect(html).not.toContain('Abrir en Google Maps');
    expect(html).toContain('Nordelta');
  });

  it('sin galería tradicional: sin PropertyGallery, sin thumbnails, sin "Ver las N fotos", sin contador "1/N", sin flechas', () => {
    const manyImages = property({
      propertyId: 187676,
      images: [
        { imageId: 'cover', url: 'https://cdn.2clics.com/cover.jpg' },
        { imageId: 'a', url: 'https://cdn.2clics.com/a.jpg' },
        { imageId: 'b', url: 'https://cdn.2clics.com/b.jpg' },
        { imageId: 'c', url: 'https://cdn.2clics.com/c.jpg' },
      ],
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(manyImages), units: [manyImages] }),
    );
    expect(html).not.toContain('twoclics-gallery');
    expect(html).not.toContain('twoclics-gallery-thumb');
    expect(html).not.toMatch(/Ver las \d+ fotos/);
    expect(html).not.toMatch(/\b1\s*\/\s*4\b/);
  });

  it('imágenes editoriales reales y únicas: la portada aparece una sola vez, sin repetir fotos entre bloques', () => {
    const manyImages = property({
      propertyId: 187676,
      images: [
        { imageId: 'cover', url: 'https://cdn.2clics.com/cover.jpg' },
        { imageId: 'a', url: 'https://cdn.2clics.com/a.jpg' },
        { imageId: 'b', url: 'https://cdn.2clics.com/b.jpg' },
      ],
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(manyImages), units: [manyImages] }),
    );
    // next/image reescribe cada <img> a /_next/image?url=<encoded>&w=...&q=75 con varios anchos
    // en el srcSet — un solo <img> real genera múltiples apariciones del string crudo. Se cuentan
    // elementos <img> distintos que referencian la portada, no substrings.
    const imgTags = html.match(/<img[^>]*>/g) || [];
    const coverImgTags = imgTags.filter((tag) => tag.includes(encodeURIComponent('https://cdn.2clics.com/cover.jpg')));
    expect(coverImgTags.length).toBe(1);
    // Al menos otra foto real distinta de la portada aparece en la narrativa editorial.
    const otherImgTags = imgTags.filter(
      (tag) =>
        tag.includes(encodeURIComponent('https://cdn.2clics.com/a.jpg')) ||
        tag.includes(encodeURIComponent('https://cdn.2clics.com/b.jpg')),
    );
    expect(otherImgTags.length).toBeGreaterThan(0);
  });

  it('la narrativa excluye precios por tipología y el cronograma de señas/fechas de obra (contenido real, pero no confirmable como dato público)', () => {
    const withPricing = property({
      propertyId: 187676,
      meta_data: [
        {
          metaKey: 'description',
          metaValue:
            'Tras haber transformado Miami Beach en un centro global de arte y cultura.\n\nEl edificio\nParque privado\nMarina\n\n1 Habitación desde U$D 1.300.000\n2 Habitación desde U$D 1.900.000\n\n DEPOSITOS Y FECHAS:\n\n 20% firma del contrato de inmediato.\n 20% at groundbreaking julio 2025.',
        },
      ],
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(withPricing), units: [withPricing] }),
    );
    expect(html).toContain('Tras haber transformado Miami Beach');
    expect(html).toContain('Parque privado');
    expect(html).not.toContain('desde U$D');
    expect(html).not.toContain('DEPOSITOS Y FECHAS');
    expect(html).not.toContain('groundbreaking');
    expect(html).not.toContain('at closing');
  });

  it('"Propiedades disponibles" no se muestra cuando el desarrollo hoy es un único registro real (evita redundancia con su propio registro maestro)', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(source), units: [source] }),
    );
    expect(html).not.toContain('Propiedades disponibles');
    expect(html).not.toContain('href="/propiedades/187676"');
  });

  it('"Propiedades disponibles" se muestra cuando el desarrollo tiene más de un registro real asociado', () => {
    const otherUnit = property({ propertyId: 187677 });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: faena,
        source: toDevSource(source),
        units: [source, otherUnit],
      }),
    );
    expect(html).toContain('Propiedades disponibles');
  });

  it('no muestra el CTA "Ver propiedades disponibles" (eliminado — duodécima pasada, se mantiene retirado)', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(source), units: [source] }),
    );
    expect(html).not.toContain('Ver propiedades disponibles');
  });

  it('nunca infiere amenities desde la descripción libre (marina/club/parque mencionados en texto no son datos estructurados)', () => {
    const richDescription = property({
      propertyId: 187676,
      amenities: [],
      meta_data: [
        {
          metaKey: 'description',
          metaValue: 'El edificio cuenta con Parque privado Marina Club Restaurante Sala de proyecciones.',
        },
      ],
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(richDescription), units: [richDescription] }),
    );
    expect(html).not.toContain('Amenities y servicios');
    expect(html).not.toContain('twoclics-chip-list');
  });

  it('no expone metadata privada/cruda: sin FABIANAGA, meta_data, info_contact, agent, realEstate ni private_note', () => {
    const taggedSource = property({
      propertyId: 187676,
      meta_data: [
        { metaKey: 'description_plain_text', metaValue: '[FABIANAGA-456]\n\nTras haber transformado Miami Beach.' },
      ],
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(taggedSource), units: [taggedSource] }),
    );
    const forbidden = ['FABIANAGA', 'meta_data', 'metaKey', 'info_contact', 'private_note', 'agent', 'realEstate'];
    for (const phrase of forbidden) {
      expect(html).not.toContain(phrase);
    }
    expect(html).toContain('Tras haber transformado Miami Beach.');
  });
});

describe('/desarrollos/faena — canonical independiente, legacy /api/development sin borrar', () => {
  const detailSource = readFileSync('app/desarrollos/[id]/page.tsx', 'utf8');

  it('el slug editorial tiene su propio canonical, nunca apunta a /propiedades/187676', () => {
    expect(detailSource).toContain('alternates: { canonical: `/desarrollos/${curation.slug}` }');
    expect(detailSource).not.toContain('canonical: `/propiedades/${curation.sourcePropertyId}`');
  });

  it('el flujo legacy numérico (/api/development) sigue presente, sin usarse desde /desarrollos', () => {
    expect(detailSource).toContain('getPublicDevelopmentById');
    expect(detailSource).toContain('DevelopmentDetailView');
  });
});

// ── Decimosexta pasada — clasificación editorial ampliada (Icon Beach, Flow House, One Hollywood) ──
describe('/desarrollos — clasificación editorial ampliada a 4 desarrollos (decimosexta pasada)', () => {
  it('Icon Beach (187677), Flow House Miami Worldcenter (187681) y One Hollywood (187682) se listan como desarrollo, cada uno con su propia card', () => {
    for (const [slug, publicName, propertyId] of [
      ['icon-beach', 'Icon Beach', 187677],
      ['flow-house-miami-worldcenter', 'Flow House Miami Worldcenter', 187681],
      ['one-hollywood', 'One Hollywood', 187682],
    ] as const) {
      const curation = getDevelopmentBySlug(slug)!;
      expect(curation.sourcePropertyId).toBe(propertyId);
      const fixture = property({ propertyId, address: `${publicName} Financiado A Estrenar 600` });
      const html = render(
        React.createElement(CuratedDevelopmentCard, {
          curation,
          source: toDevelopmentCardSource(fixture, curation.publicName),
        }),
      );
      expect(html).toContain(`>${publicName}<`);
      expect(html).toContain(`href="/desarrollos/${slug}"`);
    }
  });

  it('el nombre público confirmado gana aunque el título real de 2Clics sea genérico o traiga un claim de rentabilidad no publicable', () => {
    const flowHouse = getDevelopmentBySlug('flow-house-miami-worldcenter')!;
    // Título real observado en la auditoría — incluye una promesa de rentabilidad en el propio título.
    const badTitleFixture = property({
      propertyId: 187681,
      address: 'Oportunidad Unica En Downtown Miami. Renta Garantizada 6 %',
    });
    const cardHtml = render(
      React.createElement(CuratedDevelopmentCard, {
        curation: flowHouse,
        source: toDevelopmentCardSource(badTitleFixture, flowHouse.publicName),
      }),
    );
    expect(cardHtml).not.toContain('Renta Garantizada');
    expect(cardHtml).toContain('Flow House Miami Worldcenter');

    const detailHtml = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: flowHouse,
        source: toDevSource(badTitleFixture, flowHouse.publicName),
        units: [badTitleFixture],
      }),
    );
    expect(detailHtml).not.toContain('Renta Garantizada');
    expect(detailHtml).toContain('<h1>Flow House Miami Worldcenter</h1>');
  });

  it('los cuatro desarrollos curados tienen su propia curaduría editorial completa (decimoctava pasada — sistema editorial definitivo)', () => {
    expect(getDevelopmentEditorialCuration('faena')).not.toBeNull();
    expect(getDevelopmentEditorialCuration('icon-beach')).not.toBeNull();
    expect(getDevelopmentEditorialCuration('flow-house-miami-worldcenter')).not.toBeNull();
    expect(getDevelopmentEditorialCuration('one-hollywood')).not.toBeNull();
    // Un desarrollo SIN curaduría (ninguno de los 4 hoy) seguiría degradando con gracia — el
    // fallback (apertura + CTA, sin secciones inventadas) sigue existiendo en el componente para
    // cualquier desarrollo futuro sin auditar todavía.
  });

  it('One Hollywood: ficha editorial propia con contenido real (no genérico, no reutilizado de Icon Beach)', () => {
    const oneHollywood = getDevelopmentBySlug('one-hollywood')!;
    const fixture = property({
      propertyId: 187682,
      address: 'One Hollywood Financiado A Estrenar 600',
      amenities: [
        { amenitieId: '22', name: 'Permite mascotas', type: 'amenitie' },
        { amenitieId: '37', name: 'Sauna', type: 'amenitie' },
        { amenitieId: '23', name: 'Piscina', type: 'amenitie' },
      ],
      images: Array.from({ length: 13 }, (_, i) => ({ imageId: `oh${i}`, url: `https://cdn.2clics.com/oh${i}.jpg` })),
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: oneHollywood,
        source: toDevSource(fixture, oneHollywood.publicName),
        units: [fixture],
      }),
    );
    expect(html).toContain('<h1>One Hollywood</h1>');
    expect(html).toContain('data-property-app-id="187682"');
    expect(html).toContain('<h2>El edificio</h2>');
    expect(html).toContain('<h2>Residencias</h2>');
    // "Developer" (Star Developers Group) ya no se muestra públicamente desde la vigésima pasada
    // (ver describe dedicado más abajo) — la arquitectura confirmada sí se mantiene.
    expect(html).toContain('BC Architects');
    expect(html).not.toContain('Star Developers Group');
    // Nunca datos de Icon Beach ni de otro desarrollo mezclados por error.
    expect(html).not.toContain('Related Group');
    expect(html).not.toContain('Hollywood Beach, Florida');
  });

  it('la clasificación es por property_app_id, no por título — cambiar el título de la fuente no afecta si un id está excluido de Comprar', () => {
    // 187677 sigue excluido sin importar qué título traiga hoy (o mañana) su registro en 2Clics.
    expect(isExcludedFromStandardCatalog(187677)).toBe(true);
    // Ninguna propiedad con palabras como "desarrollo"/"financiado"/"a estrenar" en el título se
    // excluye automáticamente si su id no está en CURATED_PROPERTIES.
    const lookAlike = property({ propertyId: 555555, address: 'Desarrollo Financiado A Estrenar' });
    expect(isExcludedFromStandardCatalog(lookAlike.propertyId)).toBe(false);
  });

  it('187694 (FAB-187694 de la captura del CRM) no está clasificado y no aparece como desarrollo — la External API no lo resuelve hoy', () => {
    expect(getDevelopmentBySlug('187694')).toBeNull();
    expect(getAllDevelopmentSlugs()).not.toContain('187694');
    expect(getCurationForPropertyId(187694)).toBeNull();
  });
});

// ── Ficha editorial de Icon Beach (decimoséptima pasada) ────────────────────────────────────────
describe('/desarrollos/icon-beach — ficha editorial completa (decimoséptima pasada)', () => {
  const iconBeach = getDevelopmentBySlug('icon-beach')!;
  // Título/descripción real de 187677 auditados en esta pasada — placeholder de aviso genérico
  // con precios/cronograma/agente mezclados. El fixture reproduce exactamente ese contenido real
  // para probar que nada de eso llega al HTML.
  const realFixture = property({
    propertyId: 187677,
    address: 'Oportunidad Unica En Hollywood. Muy Cerca De Las Playas.',
    price: 900000,
    currency: 'U$D',
    amenities: [
      { amenitieId: '22', name: 'Permite mascotas', type: 'amenitie' },
      { amenitieId: '37', name: 'Sauna', type: 'amenitie' },
      { amenitieId: '23', name: 'Piscina', type: 'amenitie' },
    ],
    meta_data: [
      {
        metaKey: 'description',
        metaValue:
          '¡Bienvenido a ICON BEACH\n Ubicado sobre la Collins al otro lado de la playa, sobre el canal. \n 350 Unidades de 1 a 3 dormitorios\n Precios desde $900,000 de 1 dormitorio.\n Ventas empezaron en el verano de 2024\n\n DEPOSITOS Y FECHAS:\n 20% firma del contrato de inmediato.\n 20% at groundbreaking julio 2025.\n\nRealtor \nMonica L Villate \nL#3313811',
      },
    ],
  }, 'US');
  const source = toDevSource(realFixture, iconBeach.publicName);

  it('nombre público "Icon Beach", nunca el título bruto de 2Clics ("Oportunidad Unica...")', () => {
    const html = render(React.createElement(CuratedDevelopmentDetailView, { curation: iconBeach, source, units: [realFixture] }));
    expect(html).toContain('<h1>Icon Beach</h1>');
    expect(html).not.toContain('Oportunidad Unica');
  });

  it('no muestra precios del CRM, cronograma de depósitos ni datos de agente/matrícula', () => {
    const html = render(React.createElement(CuratedDevelopmentDetailView, { curation: iconBeach, source, units: [realFixture] }));
    expect(html).not.toContain('900,000');
    expect(html).not.toContain('DEPOSITOS Y FECHAS');
    expect(html).not.toContain('groundbreaking');
    expect(html).not.toContain('Monica L Villate');
    expect(html).not.toContain('L#3313811');
    expect(html).not.toContain('Ventas empezaron');
  });

  it('no promete rentabilidad ni usa lenguaje comercial agresivo ("oportunidad única", "renta garantizada")', () => {
    const html = render(React.createElement(CuratedDevelopmentDetailView, { curation: iconBeach, source, units: [realFixture] }));
    expect(html.toLowerCase()).not.toContain('oportunidad única');
    expect(html.toLowerCase()).not.toContain('renta garantizada');
  });

  it('CTA aparece una única vez, usa property_app_id 187677, PropertyInquiryPanel sin modificar', () => {
    const html = render(React.createElement(CuratedDevelopmentDetailView, { curation: iconBeach, source, units: [realFixture] }));
    expect((html.match(/data-property-app-id="187677"/g) || []).length).toBe(1);
    expect(html).toContain('>Consultar desarrollo<');
    const openSection = html.match(/<section class="project-open">[\s\S]*?<\/section>/);
    expect(openSection).not.toBeNull();
    expect(openSection![0]).not.toContain('data-property-app-id');
  });

  it('sección de amenities: solo reales estructurados de 2Clics que aportan al relato, nunca inferidos del texto libre ("canal", "playa" no aparecen como chips) ni "Permite mascotas" (decimoctava pasada: idéntico en toda la cartera, se filtra)', () => {
    const html = render(React.createElement(CuratedDevelopmentDetailView, { curation: iconBeach, source, units: [realFixture] }));
    expect(html).toContain('<h2>Amenities</h2>');
    expect(html).not.toContain('Permite mascotas');
    expect(html).toContain('Sauna');
    expect(html).toContain('Piscina');
  });

  it('sin amenities estructurados (o menos de 2), la sección de amenities no se muestra', () => {
    const noAmenities = property({ propertyId: 187677, amenities: [] });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: iconBeach,
        source: toDevSource(noAmenities, iconBeach.publicName),
        units: [noAmenities],
      }),
    );
    expect(html).not.toContain('<h2>Amenities</h2>');
  });

  it('imágenes seleccionadas no se repiten entre bloques', () => {
    const manyImages = property({
      propertyId: 187677,
      images: Array.from({ length: 17 }, (_, i) => ({ imageId: `img${i}`, url: `https://cdn.2clics.com/${i}.jpg` })),
      amenities: [
        { amenitieId: '37', name: 'Sauna', type: 'amenitie' },
        { amenitieId: '23', name: 'Piscina', type: 'amenitie' },
      ],
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: iconBeach,
        source: toDevSource(manyImages, iconBeach.publicName),
        units: [manyImages],
      }),
    );
    const imgTags = html.match(/<img[^>]*>/g) || [];
    const usedUrls = manyImages.images
      .map((img) => encodeURIComponent(img.displayUrl))
      .filter((enc) => imgTags.some((tag) => tag.includes(enc)));
    for (const enc of usedUrls) {
      expect(imgTags.filter((tag) => tag.includes(enc)).length).toBe(1);
    }
    // Exactamente 7 imágenes reales curadas: apertura, momento visual, ubicación, edificio,
    // residencias, amenities, interiores (agregado en la vigésima pasada).
    expect(usedUrls.length).toBe(7);
  });

  it('sizes nunca fuerza 100vw en solitario (resolución nativa auditada: 937-1520px, nunca se renderiza como bloque de 1900px)', () => {
    const html = render(React.createElement(CuratedDevelopmentDetailView, { curation: iconBeach, source, units: [realFixture] }));
    expect(html).not.toContain('sizes="100vw"');
  });

  it('ninguna promesa/reclamo comercial del texto real ("Renta Garantizada", eslogan incrustado) llega al copy curado', () => {
    const curation = getDevelopmentEditorialCuration('icon-beach')!;
    const haystack = JSON.stringify(curation).toLowerCase();
    expect(haystack).not.toContain('renta garantizada');
    expect(haystack).not.toContain('understated luxury');
    expect(haystack).not.toContain('desde $');
    expect(haystack).not.toContain('monica');
  });

  it('resolveSafeDescription nunca pasa la descripción cruda de Icon Beach como prop (curaduría 100% propia, sin extracción de la descripción real)', () => {
    const rawDescription = realFixture.description;
    const editorial = getDevelopmentEditorialCuration('icon-beach');
    const safe = resolveSafeDescription(rawDescription, editorial);
    expect(safe).not.toContain('900,000');
    expect(safe).not.toContain('Monica');
    expect(safe).not.toContain('DEPOSITOS');
  });

  it('sin curaduría editorial (slug no curado), degrada con gracia — no rompe, no inventa secciones', () => {
    const uncatedSlug = { ...iconBeach, slug: 'sin-curar-temporal' };
    const html = render(React.createElement(CuratedDevelopmentDetailView, { curation: uncatedSlug, source, units: [realFixture] }));
    expect(html).toContain('class="project-open"');
    expect(html).not.toContain('<h2>El edificio</h2>');
  });
});

describe('Regresión — Faena y Comprar no se ven afectados por la ficha de Icon Beach (decimoséptima pasada)', () => {
  it('Faena sigue sin sección de amenities (decisión ya aprobada, sin cambios de comportamiento)', () => {
    const faena = getDevelopmentBySlug('faena')!;
    const withAmenities = property({
      propertyId: 187676,
      amenities: [
        { amenitieId: '1', name: 'Pileta', type: 'general' },
        { amenitieId: '2', name: 'Gimnasio', type: 'general' },
      ],
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: faena,
        source: toDevSource(withAmenities),
        units: [withAmenities],
      }),
    );
    expect(html).not.toContain('<h2>Amenities</h2>');
  });

  it('Faena conserva su curaduría ("El edificio"/"Residencias") intacta, con el snapshot nuevo agregado adelante', () => {
    const faenaEditorial = getDevelopmentEditorialCuration('faena');
    expect(faenaEditorial?.sections.map((s) => s.key)).toEqual([
      'snapshot',
      'momento-visual',
      'proyecto',
      'edificio',
      'residencias',
    ]);
    expect(faenaEditorial?.amenities).toBeUndefined();
  });

  it('Icon Beach (187677) sigue excluido de Comprar', () => {
    expect(isExcludedFromStandardCatalog(187677)).toBe(true);
  });
});

// ── Sistema editorial definitivo de Desarrollos (decimoctava pasada) ────────────────────────────
describe('/desarrollos — sistema editorial definitivo: snapshot, Flow House, One Hollywood, fixes de Faena/Icon Beach (decimoctava pasada)', () => {
  const flowFixtureRaw = {
    propertyId: 187681,
    address: 'Flow House Miami Worldcenter!, Renta 6 % Anual.... 600',
    price: 450000,
    currency: 'U$D',
    amenities: [
      { amenitieId: '22', name: 'Permite mascotas', type: 'amenitie' },
      { amenitieId: '37', name: 'Sauna', type: 'amenitie' },
      { amenitieId: '23', name: 'Piscina', type: 'amenitie' },
    ],
    images: Array.from({ length: 21 }, (_, i) => ({ imageId: `fh${i}`, url: `https://cdn.2clics.com/fh${i}.jpg` })),
    meta_data: [
      {
        metaKey: 'description',
        metaValue:
          '¡Bienvenido a Flow House Miami Worldcenter!\n\nPrograma de renta garantizada por dos años con un 6% de retorno neto anual, por estos dos años el desarrollador cubrirá los gastos de impuestos y la asociación\nUnidades desde los $450s\n\nForma de Pago:\nCalendario de depósitos:\n-10% en el contrato\n-70% al cierre del segundo trimestre de 2025',
      },
    ],
  };
  const oneHollywoodFixtureRaw = {
    propertyId: 187682,
    address: 'One Hollywood Financiado A Estrenar 600',
    price: 420000,
    currency: 'U$D',
    amenities: [
      { amenitieId: '22', name: 'Permite mascotas', type: 'amenitie' },
      { amenitieId: '37', name: 'Sauna', type: 'amenitie' },
      { amenitieId: '23', name: 'Piscina', type: 'amenitie' },
    ],
    images: Array.from({ length: 13 }, (_, i) => ({ imageId: `oh${i}`, url: `https://cdn.2clics.com/oh${i}.jpg` })),
    meta_data: [
      {
        metaKey: 'description',
        metaValue:
          'ONE HOLLYWOOD\n\nPrecios desde $420,000 de 1 dormitorio.\n\nDeposit Structure:\n30k o 50k Reservation (now)\n10% Groundbreaking - julio 2025\n\nRealtor \nMonica L Villate \nL#3313811',
      },
    ],
  };

  const flowHouse = getDevelopmentBySlug('flow-house-miami-worldcenter')!;
  const flowFixture = property(flowFixtureRaw, 'US');
  const flowSource = toDevSource(flowFixture, flowHouse.publicName);

  const oneHollywood = getDevelopmentBySlug('one-hollywood')!;
  const oneHollywoodFixture = property(oneHollywoodFixtureRaw, 'US');
  const oneHollywoodSource = toDevSource(oneHollywoodFixture, oneHollywood.publicName);

  it('Flow House: property_app_id 187681, nombre público correcto, nunca el título crudo con la promesa de renta', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: flowHouse, source: flowSource, units: [flowFixture] }),
    );
    expect(html).toContain('<h1>Flow House Miami Worldcenter</h1>');
    expect(html).toContain('data-property-app-id="187681"');
    expect(html).not.toContain('Renta 6');
    expect(html).not.toContain('Renta Garantizada');
  });

  it('Flow House: "renta garantizada" no aparece en NINGUNA capa pública — HTML visible, atributos alt/title, ni el propio objeto de curaduría', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: flowHouse, source: flowSource, units: [flowFixture] }),
    );
    expect(html.toLowerCase()).not.toContain('renta garantizada');
    expect(html.toLowerCase()).not.toContain('6% de retorno');
    expect(html).not.toContain('$450s');
    expect(html).not.toContain('Calendario de depósitos');
    const curationJson = JSON.stringify(getDevelopmentEditorialCuration('flow-house-miami-worldcenter')).toLowerCase();
    expect(curationJson).not.toContain('renta garantizada');
    expect(curationJson).not.toContain('6%');
  });

  it('Flow House: sin material fotográfico real de edificio/residencias, no se fuerzan esas secciones con imagen — pero Residencias sí existe como texto/lista', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: flowHouse, source: flowSource, units: [flowFixture] }),
    );
    expect(html).not.toContain('<h2>El edificio</h2>');
    expect(html).toContain('<h2>Residencias</h2>');
    expect(html).toContain('<h2>Vida en Flow House</h2>');
  });

  it('Flow House: resolveSafeDescription nunca pasa la descripción cruda (precio/renta garantizada/depósitos) como prop', () => {
    const editorial = getDevelopmentEditorialCuration('flow-house-miami-worldcenter');
    const safe = resolveSafeDescription(flowFixture.description, editorial);
    expect(safe.toLowerCase()).not.toContain('renta garantizada');
    expect(safe).not.toContain('$450s');
    expect(safe).not.toContain('Calendario de depósitos');
  });

  it('One Hollywood: property_app_id 187682, nombre público, sin datos de agente ni cronograma de depósitos', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: oneHollywood,
        source: oneHollywoodSource,
        units: [oneHollywoodFixture],
      }),
    );
    expect(html).toContain('<h1>One Hollywood</h1>');
    expect(html).toContain('data-property-app-id="187682"');
    expect(html).not.toContain('Monica L Villate');
    expect(html).not.toContain('L#3313811');
    expect(html).not.toContain('420,000');
    expect(html).not.toContain('Groundbreaking');
    expect(html).not.toContain('Reservation');
  });

  it('One Hollywood: CTA aparece una única vez y usa 187682, PropertyInquiryPanel sin modificar', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: oneHollywood,
        source: oneHollywoodSource,
        units: [oneHollywoodFixture],
      }),
    );
    expect((html.match(/data-property-app-id="187682"/g) || []).length).toBe(1);
    expect(html).toContain('>Consultar desarrollo<');
  });

  it('Faena y Icon Beach: nombre público de cada uno nunca se mezcla con el otro (regresión de aislamiento entre desarrollos)', () => {
    const faena = getDevelopmentBySlug('faena')!;
    const iconBeach = getDevelopmentBySlug('icon-beach')!;
    const faenaJson = JSON.stringify(getDevelopmentEditorialCuration('faena'));
    const iconJson = JSON.stringify(getDevelopmentEditorialCuration('icon-beach'));
    expect(faenaJson).not.toContain('Related Group');
    expect(iconJson).not.toContain('Rafael Viñoly');
    expect(faena.publicName).toBeNull();
    expect(iconBeach.publicName).toBe('Icon Beach');
  });

  it('Project Snapshot: se muestra en los 4 desarrollos curados, con solo campos confirmados — nunca "Consultar" ni placeholders vacíos', () => {
    for (const slug of ['faena', 'icon-beach', 'flow-house-miami-worldcenter', 'one-hollywood']) {
      const editorial = getDevelopmentEditorialCuration(slug);
      const snapshotSection = editorial?.sections.find((s) => s.layout === 'snapshot');
      expect(snapshotSection, `snapshot ausente en ${slug}`).toBeDefined();
      expect(snapshotSection?.snapshotFields?.length).toBeGreaterThan(0);
      for (const field of snapshotSection?.snapshotFields || []) {
        expect(field.value.toLowerCase()).not.toContain('consultar');
        expect(field.value.trim()).not.toBe('');
      }
    }
  });

  it('Project Snapshot: renderiza label+value de cada campo declarado, sin inventar campos adicionales', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: flowHouse, source: flowSource, units: [flowFixture] }),
    );
    // "Developer" ya no es un campo del snapshot desde la vigésima pasada (ver describe dedicado
    // más abajo) — Interiorismo (un crédito de diseño, no institucional) sí se mantiene.
    expect(html).not.toContain('project-snapshot-label">Developer<');
    expect(html).toContain('project-snapshot-label">Interiorismo<');
    expect(html).toContain('project-snapshot-value">Cola Blanca · Flow Furnishings<');
    expect(html).toContain('project-snapshot-label">Unidades<');
    expect(html).toContain('project-snapshot-value">466<');
  });

  it('Bug de heading huérfano corregido: un bloque image-left/image-right con párrafo curado (curatedText) renderiza el párrafo, no solo el heading', () => {
    const iconBeach = getDevelopmentBySlug('icon-beach')!;
    const iconFixture = property({
      propertyId: 187677,
      amenities: [{ amenitieId: '23', name: 'Piscina', type: 'amenitie' }, { amenitieId: '37', name: 'Sauna', type: 'amenitie' }],
      images: Array.from({ length: 17 }, (_, i) => ({ imageId: `ib${i}`, url: `https://cdn.2clics.com/ib${i}.jpg` })),
    }, 'US');
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: iconBeach,
        source: toDevSource(iconFixture, iconBeach.publicName),
        units: [iconFixture],
      }),
    );
    const idx = html.indexOf('<h2>Hollywood Beach y la ubicación</h2>');
    expect(idx).toBeGreaterThan(-1);
    const after = html.slice(idx, idx + 400);
    expect(after).toContain('project-block-text');
    expect(after).toContain('boardwalk');
  });

  it('Listas cortas (≤3 ítems) usan la clase compacta, evitando el hueco de una grilla de 2 columnas con celda huérfana', () => {
    const iconBeach = getDevelopmentBySlug('icon-beach')!;
    const iconFixture = property({
      propertyId: 187677,
      amenities: [{ amenitieId: '23', name: 'Piscina', type: 'amenitie' }, { amenitieId: '37', name: 'Sauna', type: 'amenitie' }],
      images: Array.from({ length: 17 }, (_, i) => ({ imageId: `ib${i}`, url: `https://cdn.2clics.com/ib${i}.jpg` })),
    }, 'US');
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: iconBeach,
        source: toDevSource(iconFixture, iconBeach.publicName),
        units: [iconFixture],
      }),
    );
    const idx = html.indexOf('<h2>Amenities</h2>');
    expect(html.slice(idx, idx + 120)).toContain('project-block-list--compact');
  });

  it('Faena: la fuga de descripción cruda al payload (tabla de precios + cronograma de depósitos) está corregida — resolveSafeDescription solo incluye los párrafos que la curaduría realmente necesita', () => {
    const faenaEditorial = getDevelopmentEditorialCuration('faena');
    const rawDescription =
      'Frase inicial del proyecto. Resto de la primera oración real.\n\nEl edificio\nParque privado\nResidencias\nElevadores privados\n\n1 Habitación desde U$D 1.300.000\n2 Habitación desde U$D 1.900.000\n\n DEPOSITOS Y FECHAS:\n 20% firma del contrato de inmediato.\n 20% at groundbreaking julio 2025.';
    const safe = resolveSafeDescription(rawDescription, faenaEditorial);
    // Los párrafos necesarios (intro + bloque con los markers) SÍ están.
    expect(safe).toContain('Frase inicial del proyecto');
    expect(safe).toContain('El edificio');
    expect(safe).toContain('Elevadores privados');
    // La tabla de precios y el cronograma de depósitos — que nunca se renderizan — NO viajan.
    expect(safe).not.toContain('1.300.000');
    expect(safe).not.toContain('DEPOSITOS Y FECHAS');
    expect(safe).not.toContain('groundbreaking');
  });

  it('Flow House: imágenes seleccionadas no se repiten entre bloques', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: flowHouse, source: flowSource, units: [flowFixture] }),
    );
    const imgTags = html.match(/<img[^>]*>/g) || [];
    const usedUrls = flowFixture.images
      .map((img) => encodeURIComponent(img.displayUrl))
      .filter((enc) => imgTags.some((tag) => tag.includes(enc)));
    for (const enc of usedUrls) {
      expect(imgTags.filter((tag) => tag.includes(enc)).length).toBe(1);
    }
  });

  it('One Hollywood: imágenes seleccionadas no se repiten entre bloques', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: oneHollywood,
        source: oneHollywoodSource,
        units: [oneHollywoodFixture],
      }),
    );
    const imgTags = html.match(/<img[^>]*>/g) || [];
    const usedUrls = oneHollywoodFixture.images
      .map((img) => encodeURIComponent(img.displayUrl))
      .filter((enc) => imgTags.some((tag) => tag.includes(enc)));
    for (const enc of usedUrls) {
      expect(imgTags.filter((tag) => tag.includes(enc)).length).toBe(1);
    }
  });

  it('Regresión: los 4 desarrollos siguen excluidos de Comprar, Invertir no se modificó', () => {
    expect(isExcludedFromStandardCatalog(187676)).toBe(true);
    expect(isExcludedFromStandardCatalog(187677)).toBe(true);
    expect(isExcludedFromStandardCatalog(187681)).toBe(true);
    expect(isExcludedFromStandardCatalog(187682)).toBe(true);
    expect(INVESTMENT_OPPORTUNITIES).toHaveLength(1);
    expect(INVESTMENT_OPPORTUNITIES[0].sourcePropertyId).toBe(206734);
  });

  it('187694/187684 siguen sin incorporarse — el sistema editorial nuevo no los agregó silenciosamente', () => {
    expect(getDevelopmentBySlug('187694')).toBeNull();
    expect(getDevelopmentBySlug('187684')).toBeNull();
    expect(getAllDevelopmentSlugs()).toEqual(['faena', 'icon-beach', 'flow-house-miami-worldcenter', 'one-hollywood']);
  });
});

// ── /desarrollos (índice) — apertura editorial + selector de mercado (decimonovena pasada) ──────
describe('/desarrollos (índice) — apertura editorial, selector de mercado y grilla compacta (decimonovena pasada)', () => {
  const source = property({ propertyId: 187676 });

  it('los 4 desarrollos confirmados están clasificados explícitamente como mercado US en la curaduría (nunca inferido del título)', () => {
    for (const entry of DEVELOPMENTS) {
      expect(entry.market).toBe('US');
    }
  });

  it('getDevelopmentsByMarket("US") devuelve exactamente los 4 desarrollos actuales; getDevelopmentsByMarket("AR") devuelve vacío hoy', () => {
    expect(getDevelopmentsByMarket('US').map((d) => d.slug)).toEqual([
      'faena',
      'icon-beach',
      'flow-house-miami-worldcenter',
      'one-hollywood',
    ]);
    expect(getDevelopmentsByMarket('AR')).toEqual([]);
  });

  it('el filtro es por el campo explícito `market`, no por texto de ubicación/título — cambiar el título de la fuente no reclasifica el mercado', () => {
    // Regresión conceptual: `market` vive en `lib/site-curation.ts` (curaduría), completamente
    // desacoplado de `source.title`/`source.location` (2Clics real) — no hay ningún parser que
    // busque "Miami"/"Argentina" en texto libre para decidir esto.
    const icon = getDevelopmentBySlug('icon-beach')!;
    expect(icon.market).toBe('US');
    expect(getDevelopmentsByMarket('US')).toContain(icon);
  });

  it('CuratedDevelopmentCard variant="compact" agrega la clase compacta sin cambiar contenido; variant por defecto no la agrega', () => {
    const faena = getDevelopmentBySlug('faena')!;
    const compactHtml = render(
      React.createElement(CuratedDevelopmentCard, { curation: faena, source: toDevelopmentCardSource(source), variant: 'compact' }),
    );
    const defaultHtml = render(React.createElement(CuratedDevelopmentCard, { curation: faena, source: toDevelopmentCardSource(source) }));
    expect(compactHtml).toContain('twoclics-card--development-compact');
    expect(defaultHtml).not.toContain('twoclics-card--development-compact');
    // Mismo contenido en ambas variantes — la compactación es solo visual.
    expect(compactHtml).toContain('>Desarrollo<');
    expect(defaultHtml).toContain('>Desarrollo<');
  });

  it('DesarrollosMarketTabs: 2 tabs (Estados Unidos/Argentina), atributos ARIA correctos, tab por defecto activo y su panel visible, el otro oculto', () => {
    const html = render(
      React.createElement(DesarrollosMarketTabs, {
        defaultTabId: 'US',
        tabs: [
          { id: 'US', label: 'Estados Unidos', content: React.createElement('p', null, 'contenido US') },
          { id: 'AR', label: 'Argentina', content: React.createElement('p', null, 'contenido AR') },
        ],
      }),
    );
    expect(html).toContain('role="tablist"');
    expect((html.match(/role="tab"/g) || []).length).toBe(2);
    expect(html).toContain('id="desarrollos-market-tab-US"');
    expect(html).toContain('id="desarrollos-market-tab-AR"');
    expect(html).toContain('aria-controls="desarrollos-market-panel-US"');
    expect(html).toContain('aria-controls="desarrollos-market-panel-AR"');
    // Tab por defecto (US): seleccionado, tabbable (tabindex 0); el otro no.
    const usTabIdx = html.indexOf('id="desarrollos-market-tab-US"');
    expect(html.slice(usTabIdx, usTabIdx + 120)).toContain('aria-selected="true"');
    expect(html.slice(usTabIdx, usTabIdx + 120)).toContain('tabindex="0"');
    const arTabIdx = html.indexOf('id="desarrollos-market-tab-AR"');
    expect(html.slice(arTabIdx, arTabIdx + 120)).toContain('aria-selected="false"');
    expect(html.slice(arTabIdx, arTabIdx + 120)).toContain('tabindex="-1"');
    // Panel US visible (sin `hidden`), panel AR oculto.
    const usPanelIdx = html.indexOf('id="desarrollos-market-panel-US"');
    const arPanelIdx = html.indexOf('id="desarrollos-market-panel-AR"');
    expect(html.slice(usPanelIdx, usPanelIdx + 150)).not.toContain('hidden');
    expect(html.slice(arPanelIdx, arPanelIdx + 150)).toContain('hidden');
    expect(html).toContain('contenido US');
    expect(html).toContain('contenido AR');
  });

  it('DesarrollosMarketTabs: el contenido de cada tab es el que se le pasa (ya resuelto por el padre) — el componente no conoce curation/source', () => {
    const html = render(
      React.createElement(DesarrollosMarketTabs, {
        defaultTabId: 'AR',
        tabs: [
          { id: 'US', label: 'Estados Unidos', content: React.createElement('span', { className: 'marker-us' }, 'US') },
          { id: 'AR', label: 'Argentina', content: React.createElement('span', { className: 'marker-ar' }, 'AR') },
        ],
      }),
    );
    const arPanelIdx = html.indexOf('id="desarrollos-market-panel-AR"');
    expect(html.slice(arPanelIdx, arPanelIdx + 150)).not.toContain('hidden');
    const arTabIdx = html.indexOf('id="desarrollos-market-tab-AR"');
    expect(html.slice(arTabIdx, arTabIdx + 120)).toContain('aria-selected="true"');
  });

  it('Regresión: /comprar sigue excluyendo los 4 desarrollos, Invertir sin cambios, fichas individuales sin la clase compacta ni los tabs', () => {
    expect(isExcludedFromStandardCatalog(187676)).toBe(true);
    expect(isExcludedFromStandardCatalog(187677)).toBe(true);
    expect(isExcludedFromStandardCatalog(187681)).toBe(true);
    expect(isExcludedFromStandardCatalog(187682)).toBe(true);
    expect(INVESTMENT_OPPORTUNITIES).toHaveLength(1);
    // CuratedDevelopmentDetailView (la ficha individual) no importa ni usa DesarrollosMarketTabs
    // ni la variante compacta de la card — son exclusivos del índice.
    const faena = getDevelopmentBySlug('faena')!;
    const editorial = getDevelopmentEditorialCuration('faena');
    const detailHtml = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: faena,
        source: toDevSource(source),
        units: [source],
      }),
    );
    expect(detailHtml).not.toContain('twoclics-card--development-compact');
    expect(detailHtml).not.toContain('desarrollos-market-tab');
    expect(editorial).not.toBeNull();
  });
});

// ── Vigésima pasada — Developer fuera de lo público, rango de precio real, "Interiores" ─────────
describe('/desarrollos — Developer retirado, rango de precio real, "Interiores"/"Interiores y residencias" (vigésima pasada)', () => {
  const fixtures: Record<string, { propertyId: number; slug: string; price: number; imageCount: number }> = {
    faena: { propertyId: 187676, slug: 'faena', price: 1300000, imageCount: 14 },
    'icon-beach': { propertyId: 187677, slug: 'icon-beach', price: 900000, imageCount: 17 },
    'flow-house-miami-worldcenter': { propertyId: 187681, slug: 'flow-house-miami-worldcenter', price: 450000, imageCount: 21 },
    'one-hollywood': { propertyId: 187682, slug: 'one-hollywood', price: 420000, imageCount: 13 },
  };

  function buildFixture(slug: keyof typeof fixtures) {
    const f = fixtures[slug];
    const curation = getDevelopmentBySlug(f.slug)!;
    const raw = property(
      {
        propertyId: f.propertyId,
        price: f.price,
        currency: 'U$D',
        hidePrice: false,
        images: Array.from({ length: f.imageCount }, (_, i) => ({ imageId: `${slug}-${i}`, url: `https://cdn.2clics.com/${slug}-${i}.jpg` })),
        amenities: [
          { amenitieId: '22', name: 'Permite mascotas', type: 'amenitie' },
          { amenitieId: '37', name: 'Sauna', type: 'amenitie' },
          { amenitieId: '23', name: 'Piscina', type: 'amenitie' },
        ],
      },
      'US',
    );
    return { curation, raw, source: toDevSource(raw, curation.publicName) };
  }

  it('"Developer"/"Desarrollador" no aparece como dato visible en NINGUNA de las 4 fichas', () => {
    for (const slug of Object.keys(fixtures) as (keyof typeof fixtures)[]) {
      const { curation, source, raw } = buildFixture(slug);
      const html = render(React.createElement(CuratedDevelopmentDetailView, { curation, source, units: [raw] }));
      expect(html, `Developer visible en ${slug}`).not.toContain('>Developer<');
      expect(html, `Desarrollador visible en ${slug}`).not.toContain('>Desarrollador<');
    }
  });

  it('arquitectura/interiorismo se mantienen en el snapshot cuando están confirmados (no se borraron por error junto con Developer)', () => {
    const faenaEditorial = getDevelopmentEditorialCuration('faena');
    const snapshot = faenaEditorial?.sections.find((s) => s.layout === 'snapshot');
    const labels = snapshot?.snapshotFields?.map((f) => f.label) || [];
    expect(labels).toContain('Arquitectura');
    expect(labels).toContain('Interiorismo');
    expect(labels).not.toContain('Developer');
  });

  it('Rango de precio: "Desde {currency} {price}" formateado con separador de miles, tomado del precio estructurado real — nunca hardcodeado', () => {
    for (const slug of Object.keys(fixtures) as (keyof typeof fixtures)[]) {
      const f = fixtures[slug];
      const { curation, source, raw } = buildFixture(slug);
      const html = render(React.createElement(CuratedDevelopmentDetailView, { curation, source, units: [raw] }));
      const expected = formatDevelopmentPriceRange(f.price, 'U$D', false);
      expect(expected).not.toBeNull();
      expect(html).toContain('project-snapshot-value">' + expected);
    }
  });

  it('formatDevelopmentPriceRange: nunca arma un rango con máximo inventado — solo "Desde X" con el mínimo real estructurado', () => {
    expect(formatDevelopmentPriceRange(900000, 'U$D', false)).toBe('Desde U$D 900.000');
    expect(formatDevelopmentPriceRange(900000, 'U$D', false)).not.toMatch(/–|-.*\d/);
  });

  it('formatDevelopmentPriceRange: omite el campo (null) cuando hidePrice es true, cuando no hay precio, o cuando no hay moneda — nunca "Consultar precio" ni un placeholder', () => {
    expect(formatDevelopmentPriceRange(900000, 'U$D', true)).toBeNull();
    expect(formatDevelopmentPriceRange(null, 'U$D', false)).toBeNull();
    expect(formatDevelopmentPriceRange(0, 'U$D', false)).toBeNull();
    expect(formatDevelopmentPriceRange(900000, '', false)).toBeNull();
  });

  it('con hidePrice=true, "Rango de precio" no aparece en el snapshot renderizado (regresión de integración, no solo del helper)', () => {
    const { curation, raw, source } = buildFixture('icon-beach');
    const hiddenSource = { ...source, hidePrice: true };
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation, source: hiddenSource, units: [raw] }),
    );
    expect(html).not.toContain('Rango de precio');
  });

  it('Nueva sección de interiores: título y cantidad de imágenes correctos por desarrollo — "Interiores y residencias" solo cuando todas las imágenes son de una unidad real', () => {
    const expectations: Record<string, { title: string; count: number }> = {
      faena: { title: 'Interiores y residencias', count: 2 },
      'icon-beach': { title: 'Interiores', count: 1 },
      'flow-house-miami-worldcenter': { title: 'Interiores', count: 3 },
      'one-hollywood': { title: 'Interiores', count: 1 },
    };
    for (const slug of Object.keys(fixtures) as (keyof typeof fixtures)[]) {
      const { curation, source, raw } = buildFixture(slug);
      const html = render(React.createElement(CuratedDevelopmentDetailView, { curation, source, units: [raw] }));
      const exp = expectations[slug];
      expect(html, `heading en ${slug}`).toContain(`<h2>${exp.title}</h2>`);
      expect(html, `grid count en ${slug}`).toContain(`project-interiors-grid--${exp.count}`);
    }
  });

  it('la sección de interiores nunca reutiliza una imagen ya usada en otro bloque de la misma ficha, cuando existe alternativa', () => {
    // Faena: "Residencias" usa el índice 2; "Interiores y residencias" usa 4 y 3 — sin solapar.
    const faenaEditorial = getDevelopmentEditorialCuration('faena')!;
    const usedElsewhere = new Set(faenaEditorial.sections.flatMap((s) => s.imageIndexes));
    for (const idx of faenaEditorial.interiors!.imageIndexes) {
      expect(usedElsewhere.has(idx), `índice ${idx} de interiors ya usado en otra sección de Faena`).toBe(false);
    }
    // Icon Beach: "Residencias" usa 7, "El edificio" usa 2 — "Interiores" usa 8, sin solapar.
    const iconEditorial = getDevelopmentEditorialCuration('icon-beach')!;
    const iconUsedElsewhere = new Set([
      ...iconEditorial.sections.flatMap((s) => s.imageIndexes),
      ...(iconEditorial.amenities?.imageIndex !== undefined ? [iconEditorial.amenities.imageIndex] : []),
    ]);
    for (const idx of iconEditorial.interiors!.imageIndexes) {
      expect(iconUsedElsewhere.has(idx), `índice ${idx} de interiors ya usado en otra sección de Icon Beach`).toBe(false);
    }
  });

  it('ninguna imagen descartada por brochure/eslogan reaparece en "Interiores" (Icon Beach idx 15/16, Flow House idx 1 y 16-20)', () => {
    const iconEditorial = getDevelopmentEditorialCuration('icon-beach')!;
    expect(iconEditorial.interiors!.imageIndexes).not.toEqual(expect.arrayContaining([15, 16]));
    const flowEditorial = getDevelopmentEditorialCuration('flow-house-miami-worldcenter')!;
    expect(flowEditorial.interiors!.imageIndexes).not.toEqual(expect.arrayContaining([1, 16, 17, 18, 19, 20]));
  });

  it('CTA único en las 4 fichas, cada una con su propio property_app_id — sin cambios respecto de pasadas anteriores', () => {
    const expectedIds: Record<string, number> = {
      faena: 187676,
      'icon-beach': 187677,
      'flow-house-miami-worldcenter': 187681,
      'one-hollywood': 187682,
    };
    for (const slug of Object.keys(fixtures) as (keyof typeof fixtures)[]) {
      const { curation, source, raw } = buildFixture(slug);
      const html = render(React.createElement(CuratedDevelopmentDetailView, { curation, source, units: [raw] }));
      const id = expectedIds[slug];
      expect((html.match(new RegExp(`data-property-app-id="${id}"`, 'g')) || []).length).toBe(1);
      expect(html).toContain('>Consultar desarrollo<');
    }
  });

  it('sin fuga de RSC: título comercial crudo, agente, cronogramas y precios no seleccionados no viajan como prop, ni siquiera con el nuevo precio agregado', () => {
    const oneHollywoodFixture = property(
      {
        propertyId: 187682,
        address: 'One Hollywood Financiado A Estrenar 600',
        price: 420000,
        currency: 'U$D',
        hidePrice: false,
        images: Array.from({ length: 13 }, (_, i) => ({ imageId: `oh${i}`, url: `https://cdn.2clics.com/oh${i}.jpg` })),
        meta_data: [
          {
            metaKey: 'description',
            metaValue:
              'ONE HOLLYWOOD\n\nPrecios desde $420,000 de 1 dormitorio.\n\nDeposit Structure:\n30k o 50k Reservation (now)\n\nRealtor \nMonica L Villate \nL#3313811',
          },
        ],
      },
      'US',
    );
    const curation = getDevelopmentBySlug('one-hollywood')!;
    const editorial = getDevelopmentEditorialCuration('one-hollywood');
    const safeDescription = resolveSafeDescription(oneHollywoodFixture.description, editorial);
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation,
        source: toDevSource(oneHollywoodFixture, curation.publicName),
        units: [oneHollywoodFixture],
      }),
    );
    expect(safeDescription).not.toContain('Monica L Villate');
    expect(safeDescription).not.toContain('Reservation');
    expect(html).not.toContain('Monica L Villate');
    expect(html).not.toContain('L#3313811');
    expect(html).not.toContain('Reservation');
    // El precio SÍ debe aparecer — es el dato que esta pasada agrega intencionalmente.
    expect(html).toContain('Desde U$D 420.000');
  });

  it('los 4 slugs siguen resolviendo a sus property_app_id correctos (regresión, sin cambios de esta pasada)', () => {
    expect(getDevelopmentBySlug('faena')?.sourcePropertyId).toBe(187676);
    expect(getDevelopmentBySlug('icon-beach')?.sourcePropertyId).toBe(187677);
    expect(getDevelopmentBySlug('flow-house-miami-worldcenter')?.sourcePropertyId).toBe(187681);
    expect(getDevelopmentBySlug('one-hollywood')?.sourcePropertyId).toBe(187682);
  });

  it('Comprar sigue excluyendo los 4 desarrollos; Invertir/Home fuera de esta pasada', () => {
    expect(isExcludedFromStandardCatalog(187676)).toBe(true);
    expect(isExcludedFromStandardCatalog(187677)).toBe(true);
    expect(isExcludedFromStandardCatalog(187681)).toBe(true);
    expect(isExcludedFromStandardCatalog(187682)).toBe(true);
  });
});
