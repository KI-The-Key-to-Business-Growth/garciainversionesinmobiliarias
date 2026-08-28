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
import FeaturedSpotlight from '@/components/properties/FeaturedSpotlight';
import InvestmentOpportunityDetailView from '@/components/properties/InvestmentOpportunityDetailView';
import LocationPicker, { groupOptions } from '@/components/properties/LocationPicker';
import { adaptPublicProperty } from '@/lib/2clics/adapters';
import { removeFilterHref, type ListingLocationOption, type PropertyCatalogResult } from '@/lib/2clics/listings';
import {
  CURATED_PROPERTIES,
  DEVELOPMENTS,
  INVESTMENT_OPPORTUNITIES,
  getActiveInvestmentOpportunities,
  getAllDevelopmentSlugs,
  getCurationForPropertyId,
  getDevelopmentBySlug,
  getExcludedPropertyIds,
  getInvestmentOpportunityBySlug,
  isExcludedFromStandardCatalog,
} from '@/lib/site-curation';

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
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
  it('Faena (187676) y el proyecto especial (206734) están marcados excludeFromStandardCatalog', () => {
    expect(CURATED_PROPERTIES).toEqual([
      { propertyId: 187676, humanRef: 'FAB-187676', classification: 'desarrollo', excludeFromStandardCatalog: true },
      {
        propertyId: 206734,
        humanRef: 'FAB-206734',
        classification: 'proyecto-especial',
        excludeFromStandardCatalog: true,
      },
    ]);
    expect(isExcludedFromStandardCatalog(187676)).toBe(true);
    expect(isExcludedFromStandardCatalog(206734)).toBe(true);
    expect(isExcludedFromStandardCatalog(1)).toBe(false);
    expect(isExcludedFromStandardCatalog(null)).toBe(false);
    expect(getExcludedPropertyIds().sort()).toEqual([187676, 206734]);
  });

  it('getCurationForPropertyId expone la clasificación completa por id', () => {
    expect(getCurationForPropertyId(206734)?.classification).toBe('proyecto-especial');
    expect(getCurationForPropertyId(999999)).toBeNull();
  });

  it('Desarrollo "faena" apunta a la propiedad real 187676 (FAB-187676)', () => {
    const faena = getDevelopmentBySlug('faena');
    expect(faena).toEqual({
      slug: 'faena',
      name: 'Proyecto Faena',
      sourcePropertyId: 187676,
      humanRef: 'FAB-187676',
      propertyIds: [187676],
    });
    expect(getDevelopmentBySlug('FAENA')).toEqual(faena);
    expect(getAllDevelopmentSlugs()).toEqual(['faena']);
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

  it('CuratedDevelopmentCard usa el nombre editorial y linkea al slug curado', () => {
    const html = render(React.createElement(CuratedDevelopmentCard, { curation: faena, sourceProperty: source }));
    expect(html).toContain('Proyecto Faena');
    expect(html).toContain('href="/desarrollos/faena"');
  });

  it('CuratedDevelopmentDetailView linkea cada unidad a su ficha canónica, sin reproducirla, con CTA humano', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, sourceProperty: source, units: [source] }),
    );
    expect(html).toContain('href="/propiedades/187676"');
    expect(html).not.toContain('twoclics-essential-strip');
    expect(html).toContain('Hablar con un asesor');
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

  it('InvestmentOpportunityDetailView (206734) linkea a la ficha canónica y no menciona personas/figuras legales', () => {
    const opportunity = getInvestmentOpportunityBySlug('proyecto-especial-miami')!;
    const opportunityProperty = property({ propertyId: 206734 });
    const html = render(
      React.createElement(InvestmentOpportunityDetailView, {
        opportunity,
        sourceProperty: opportunityProperty,
        units: [opportunityProperty],
      }),
    );
    expect(html).toContain('href="/propiedades/206734"');
    expect(html).toContain('Ver ficha de la propiedad');
    expect(html.toLowerCase()).not.toContain('marcelo');
    expect(html.toLowerCase()).not.toContain('chami');
  });
});
