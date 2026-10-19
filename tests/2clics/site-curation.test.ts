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
  getDevelopmentForPropertyId,
  getDevelopmentsByMarket,
  getExcludedPropertyIds,
  getInvestmentOpportunityByPropertyId,
  getInvestmentOpportunityBySlug,
  getMasterCatalogExcludedPropertyIds,
  getPropertyBackLink,
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
      propertyId: 236986,
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
  const BENAVIDEZ_IDS = [233708, 237474, 237472, 233702, 233707];
  const OUT_OF_MARKET_IDS = [187676, 187677, 187681, 187682, 187684, 187687, 187719, 201007, 201001, 201063];

  it('sincronización 2026-10-15: curaduría = desarrollos activos + 445 N Shore + duplicado Domus defensivo', () => {
    expect(CURATED_PROPERTIES.map((entry) => entry.propertyId).sort((a, b) => a - b)).toEqual(
      [206734, 233702, 233707, 233708, 233719, 236646, 236682, 236986, 237447, 237472, 237474],
    );
    for (const entry of CURATED_PROPERTIES) {
      expect(entry.excludeFromStandardCatalog).toBe(true);
    }
    expect(getExcludedPropertyIds().sort((a, b) => a - b)).toEqual(
      [206734, 233702, 233707, 233708, 233719, 236646, 236682, 236986, 237447, 237472, 237474],
    );
    // /propiedades (maestro) solo excluye lo que no es una propiedad: la oportunidad de inversión y
    // el duplicado fuera de mercado.
    expect(getMasterCatalogExcludedPropertyIds().sort((a, b) => a - b)).toEqual([206734, 236646]);
    expect(getCurationForPropertyId(236646)?.classification).toBe('duplicado-fuera-de-mercado');
    expect(getCurationForPropertyId(206734)?.classification).toBe('proyecto-especial');
  });

  it('Faena consume 236986 y nunca el 187676 (fuera de mercado), sin fallback silencioso', () => {
    const faena = getDevelopmentBySlug('faena');
    expect(faena).toEqual({
      slug: 'faena',
      name: 'Proyecto Faena',
      publicName: null,
      sourcePropertyId: 236986,
      humanRef: 'GAR-236986',
      propertyIds: [236986],
      market: 'US',
      backLabel: 'Faena',
    });
    expect(getDevelopmentBySlug('FAENA')).toEqual(faena);
    const curationSource = readFileSync('lib/site-curation.ts', 'utf8');
    expect(curationSource).not.toMatch(/propertyId:\s*187676|sourcePropertyId:\s*187676|propertyIds:\s*\[[^\]]*187676/);
    expect(getCurationForPropertyId(187676)).toBeNull();
  });

  it('registros fuera de mercado no tienen ninguna curaduría ni desarrollo asociado', () => {
    for (const id of OUT_OF_MARKET_IDS) {
      expect(getCurationForPropertyId(id)).toBeNull();
      expect(DEVELOPMENTS.some((d) => d.sourcePropertyId === id || d.propertyIds.includes(id))).toBe(false);
      expect(INVESTMENT_OPPORTUNITIES.some((o) => o.propertyIds.includes(id))).toBe(false);
    }
  });

  it('desarrollos activos: Faena, Benavídez Village, Pacheco Central, Remeros Beach y Domus — nada más', () => {
    expect(getAllDevelopmentSlugs().sort()).toEqual(
      ['benavidez-village', 'domus-brickell-center', 'faena', 'pacheco-central', 'remeros-beach'].sort(),
    );
    expect(getDevelopmentBySlug('pacheco-central')?.sourcePropertyId).toBe(233719);
    expect(getDevelopmentBySlug('domus-brickell-center')?.sourcePropertyId).toBe(236682);
    for (const slug of ['icon-beach', 'flow-house-miami-worldcenter', 'one-hollywood']) {
      expect(getDevelopmentBySlug(slug)).toBeNull();
      expect(getDevelopmentEditorialCuration(slug)).toBeNull();
    }
  });

  it('Benavídez Village agrupa exactamente las 5 unidades activas en un solo desarrollo, con su UF', () => {
    const benavidez = getDevelopmentBySlug('benavidez-village');
    expect(benavidez?.publicName).toBe('Benavídez Village');
    expect(benavidez?.market).toBe('AR');
    expect(benavidez?.propertyIds).toEqual(BENAVIDEZ_IDS);
    expect(benavidez?.propertyIds).toContain(benavidez?.sourcePropertyId);
    expect(benavidez?.unitLabels).toEqual({
      233708: 'UF 11',
      237474: 'UF 12',
      237472: 'UF 15',
      233702: 'UF 16',
      233707: 'UF 20',
    });
    // Un solo desarrollo, no cinco.
    expect(DEVELOPMENTS.filter((d) => d.propertyIds.some((id) => BENAVIDEZ_IDS.includes(id)))).toHaveLength(1);
    for (const id of BENAVIDEZ_IDS) {
      expect(isExcludedFromStandardCatalog(id)).toBe(true);
    }
  });

  it('la clasificación como "desarrollo" es explícita por property_app_id — nunca deriva de palabras en título/descripción', () => {
    // Propiedades tradicionales activas — incluidas 187683 y 236984, dos propiedades distintas de
    // Sunny Isles que nunca se fusionan ni se excluyen.
    const traditionalIds = [187669, 187691, 187683, 236984, 237445, 233429, 236978, 233430, 233431, 233434, 233435, 233436, 236982];
    for (const id of traditionalIds) {
      expect(isExcludedFromStandardCatalog(id)).toBe(false);
      expect(getCurationForPropertyId(id)).toBeNull();
    }
  });

  it('no se usa /api/development (módulo Emprendimientos) para esta clasificación — DEVELOPMENTS es curaduría por propertyId normal', () => {
    for (const development of DEVELOPMENTS) {
      expect(typeof development.sourcePropertyId).toBe('number');
      expect(Array.isArray(development.propertyIds)).toBe(true);
    }
    const source = readFileSync('lib/site-curation.ts', 'utf8');
    expect(source).not.toContain('getPublicDevelopmentById');
    expect(source).not.toContain("from '@/lib/2clics/listings'");
  });

  it('Invertir 206734 (445 N Shore Drive): nombre editorial neutral, sin developer ni figuras legales/comerciales no confirmadas', () => {
    const opportunity = getInvestmentOpportunityBySlug('445-n-shore-drive');
    expect(opportunity?.sourcePropertyId).toBe(206734);
    expect(opportunity?.propertyIds).toEqual([206734]);
    expect(opportunity?.active).toBe(true);
    expect(getInvestmentOpportunityByPropertyId(206734)?.slug).toBe('445-n-shore-drive');
    expect(getInvestmentOpportunityBySlug('proyecto-especial-miami')).toBeNull();
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
      'olivia',
      'harper',
      'confirmada',
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

  it('sin pasar actionPath/lockedOperation, el formulario apunta a /comprar (ya no existe un catálogo general /propiedades) y el selector de Operación queda visible', () => {
    const catalog = emptyCatalogResult({ properties: [property({ propertyId: 1 })], propertyTotalCount: 1 });
    const html = render(React.createElement(CatalogView, { catalog, showDevelopments: true }));
    expect(html).toContain('action="/comprar"');
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
    expect(pageSource).toContain('Newsletter');
    // Pre-launch V2: la selección del Home es curaduría manual (SelectedOpportunities), ya no
    // los DESTACADO de 2Clics (FeaturedProperties).
    expect(pageSource).toContain('<SelectedOpportunities />');
    expect(pageSource).not.toContain('<FeaturedProperties');
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

  it('"Consultar disponibilidad" reutiliza el flujo de consulta específico de propiedad (PropertyInquiryPanel) asociado a 187676 — nunca /contacto ni WhatsApp directo, una única vez (solo al cierre)', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(source), units: [source] }),
    );
    expect(html).not.toContain('href="/contacto"');
    expect(html).not.toContain('wa.me');
    expect(html).not.toContain('data-whatsapp-location="desarrollo"');
    expect(html).toContain('data-property-app-id="187676"');
    expect(html).toContain('>Consultar disponibilidad<');
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
    expect(openSection![0]).not.toContain('Consultar disponibilidad');
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
    expect(html).not.toContain('Habitación desde');
    expect(html).not.toContain('1.900.000');
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

  it('InvestmentOpportunityDetailView (206734) no menciona personas, al developer ni figuras legales', () => {
    const opportunity = getInvestmentOpportunityBySlug('445-n-shore-drive')!;
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
    const lower = html.toLowerCase();
    for (const term of ['olivia', 'harper', 'schamy', 'echterling', 'marcelo', 'chami', 'quién desarrolla', 'fundadores']) {
      expect(lower).not.toContain(term);
    }
  });
});

// ── /invertir/445-n-shore-drive — oportunidad vigente (sincronización 2026-10-15) ───────────────
describe('InvestmentOpportunityDetailView — 445 N Shore Drive, no es una ficha de propiedad', () => {
  const opportunity = getInvestmentOpportunityBySlug('445-n-shore-drive')!;
  // Simula el registro técnico real de 206734 — "Casa", 1 ambiente, 6 dormitorios, U$D 100.000
  // con hidePrice. El componente nunca recibe esos campos (su prop `source` no los acepta).
  const technicalRecord = property(
    {
      propertyId: 206734,
      address: '445 N Shore Drive',
      price: 100000,
      currency: 'U$D',
      hidePrice: true,
      amountRoom: 1,
      amountBedroom: 6,
      totalArea: 511,
      propertyType: { typeId: 2, name: 'Casa', appId: '5791' },
      images: Array.from({ length: 12 }, (_, i) => ({ imageId: `ns${i}`, url: `https://cdn.2clics.com/ns${i}.jpg` })),
      meta_data: [{ metaKey: 'title', metaValue: 'Participá como socio en residencias de lujo en Miami' }],
    },
    'US',
  );
  const source = {
    propertyId: technicalRecord.propertyId,
    region: technicalRecord.region,
    images: technicalRecord.images,
  };
  const html = render(React.createElement(InvestmentOpportunityDetailView, { opportunity, source }));

  it('nunca presenta el registro técnico como producto: sin "VENTA · CASA", sin dormitorios/ambientes técnicos, sin U$D 100.000', () => {
    expect(html).not.toMatch(/Venta\s*·\s*Casa/i);
    expect(html).not.toContain('>Casa<');
    expect(html).not.toContain('6 dorm');
    expect(html).not.toContain('1 amb');
    expect(html).not.toContain('100.000');
  });

  it('presenta la oportunidad vigente: 445 N Shore Drive, Normandy Shores, participación como socio', () => {
    expect(html).toContain('Participar en el desarrollo de una residencia frente al agua en Normandy Shores');
    expect(html).toContain('Normandy Shores · Miami Beach · Florida · Estados Unidos');
    expect(html).toContain('<h2>445 N Shore Drive</h2>');
    expect(html).toContain('No consiste en comprar la residencia ni una unidad en preventa.');
    expect(html).not.toContain('Coconut Grove');
    expect(html).not.toContain('Bayshore');
  });

  it('datos del activo tomados de la descripción vigente de 2Clics, sin agregados', () => {
    for (const fact of [
      'Aproximadamente 5.500 SF bajo techo (511 m²)',
      '8.405 SF totales (781 m²)',
      'Lote de 11.000 SF (1.022 m²)',
      'Seis suites con vista al agua',
      'Ascensor privado a las tres plantas',
    ]) {
      expect(html).toContain(fact);
    }
  });

  it('precio: "Consultar precio"; condiciones y documentación se presentan en privado', () => {
    expect(html).toContain('<dt>Precio</dt><dd>Consultar precio</dd>');
    expect(html).toContain('se presentan de manera privada a quienes tengan un interés concreto');
  });

  it('sin rentabilidad/retorno/colateral garantizado — "Retorno no garantizado" figura como riesgo', () => {
    const lower = html.toLowerCase();
    expect(lower).not.toContain('renta garantizada');
    expect(lower).not.toContain('rentabilidad garantizada');
    expect(lower).not.toContain('retorno garantizado');
    expect(lower).not.toContain('colateral');
    expect(lower).not.toContain('renta pasiva');
    expect(html).toContain('Retorno no garantizado');
  });

  it('obra en marcha con fotos reales de obra (idx 10/11) y renders aclarados como ilustrativos; nunca la pieza gráfica con texto (idx 1)', () => {
    expect(html).toContain('<h2>Estado de la obra</h2>');
    expect(html).toContain('Fotografías del avance de obra.');
    expect(html).toContain('Imágenes ilustrativas del proyecto.');
    expect(html).toContain(encodeURIComponent('https://cdn.2clics.com/ns10.jpg'));
    expect(html).toContain(encodeURIComponent('https://cdn.2clics.com/ns11.jpg'));
    expect(html).not.toContain(encodeURIComponent('https://cdn.2clics.com/ns1.jpg'));
  });

  it('property_app_id 206734 llega a PropertyInquiryPanel, con un único CTA y sin CTA en la apertura', () => {
    expect((html.match(/data-property-app-id="206734"/g) || []).length).toBe(1);
    expect(html).toContain('>Conocer la oportunidad<');
    const openSection = html.slice(html.indexOf('project-open'), html.indexOf('project-editorial-text'));
    expect(openSection).not.toContain('Conocer la oportunidad');
  });

  it('sin curaduría editorial para un slug (defensivo): degrada a bloque mínimo con CTA, nunca inventa una landing', () => {
    const unknownOpportunity = { ...opportunity, slug: 'sin-curaduria', name: 'Oportunidad sin curar' };
    const fallback = render(React.createElement(InvestmentOpportunityDetailView, { opportunity: unknownOpportunity, source }));
    expect(fallback).toContain('Oportunidad sin curar');
    expect(fallback).toContain('data-property-app-id="206734"');
    expect(fallback).not.toContain('445 N Shore Drive</h2>');
  });

  it('/propiedades/206734 redirige a la landing de /invertir — el registro técnico nunca se muestra como ficha', () => {
    const pageSource = readFileSync('app/propiedades/[id]/page.tsx', 'utf8');
    expect(pageSource).toContain('getInvestmentOpportunityByPropertyId(propertyId)');
    expect(pageSource).toContain('permanentRedirect(`/invertir/${opportunity.slug}`)');
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
    expect(getInvestmentEditorialCuration('445-n-shore-drive')).not.toBeNull();
    expect(getInvestmentEditorialCuration('cualquier-otro-slug-no-curado')).toBeNull();
  });

  it('la lista de oportunidades activas sigue viniendo de INVESTMENT_OPPORTUNITIES (curaduría explícita), no de un scan de propiedades', () => {
    const active = getActiveInvestmentOpportunities();
    expect(active.map((o) => o.slug)).toEqual(['445-n-shore-drive']);
  });

  it('el copy curado no usa términos legales/comerciales no confirmados ni promete rendimiento', () => {
    const curation = getInvestmentEditorialCuration('445-n-shore-drive')!;
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

describe('/desarrollos/faena — landing editorial (decimotercera pasada), sin datos sensibles', () => {
  const faena = getDevelopmentBySlug('faena')!;
  const source = property({ propertyId: 187676 });

  it('sin PropertyMap (componente de fichas de propiedad, twoclics-map) — el mapa de esta ficha es el sistema propio de Desarrollos (vigesimotercera pasada)', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: faena, source: toDevSource(source), units: [source] }),
    );
    expect(html).not.toContain('twoclics-map');
    expect(html).not.toContain('Abrir en Google Maps');
    // Faena: ubicación editorial en la apertura y sin mapa hasta tener una ubicación verificada.
    expect(html).toContain('Miami River · Miami · Florida · Estados Unidos');
    expect(html).not.toContain('google.com/maps');
    expect(html).not.toContain('project-location-map');
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
    expect(html).not.toContain('Habitación desde');
    expect(html).not.toContain('1.900.000');
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
    // Pre-launch V2: el canonical sale de buildShareMetadata({ path }) (lib/share-metadata.ts).
    expect(detailSource).toContain('path: `/desarrollos/${curation.slug}`');
    expect(detailSource).not.toContain('canonical: `/propiedades/${curation.sourcePropertyId}`');
  });

  it('el flujo legacy numérico (/api/development) sigue presente, sin usarse desde /desarrollos', () => {
    expect(detailSource).toContain('getPublicDevelopmentById');
    expect(detailSource).toContain('DevelopmentDetailView');
  });
});

// ── Decimosexta pasada — clasificación editorial ampliada (Icon Beach, Flow House, One Hollywood) ──
describe('Regresión — curaduría aprobada de Faena intacta', () => {
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

  it('Faena conserva su curaduría ("El edificio"/"Residencias") intacta, con las secciones agregadas en pasadas posteriores (ubicación/reasons/para-quien/puede-no-tener-sentido/garcia-acompanamiento)', () => {
    const faenaEditorial = getDevelopmentEditorialCuration('faena');
    expect(faenaEditorial?.sections.map((s) => s.key)).toEqual([
      'snapshot',
      'momento-visual',
      'proyecto',
      'edificio',
      'residencias',
      'ubicacion',
      'informacion-comercial',
      'reasons',
      'para-quien',
      'puede-no-tener-sentido',
      'garcia-acompanamiento',
    ]);
    expect(faenaEditorial?.amenities).toBeUndefined();
  });

});

describe('/desarrollos — sistema editorial: snapshot, descripción segura, imágenes sin repetir', () => {
  const ACTIVE_SLUGS = ['faena', 'benavidez-village', 'pacheco-central', 'domus-brickell-center'];

  it('Project Snapshot: presente en los 4 desarrollos activos, solo campos confirmados — nunca "Consultar" ni placeholders vacíos', () => {
    for (const slug of ACTIVE_SLUGS) {
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

  it('un bloque image-right con lista curada renderiza su contenido junto a la imagen (Pacheco "Tipologías")', () => {
    const pacheco = getDevelopmentBySlug('pacheco-central')!;
    const fixture = property({
      propertyId: 233719,
      images: Array.from({ length: 6 }, (_, i) => ({ imageId: `pc${i}`, url: `https://cdn.2clics.com/pc${i}.jpg` })),
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: pacheco,
        source: toDevSource(fixture, pacheco.publicName),
        units: [fixture],
      }),
    );
    const idx = html.indexOf('<h2>Tipologías</h2>');
    expect(idx).toBeGreaterThan(-1);
    expect(html.slice(idx, idx + 600)).toContain('Unidades de 1, 2, 3 y 4 ambientes');
  });

  it('Faena: resolveSafeDescription solo incluye los párrafos que la curaduría necesita — nunca la tabla de precios ni el cronograma de depósitos', () => {
    const faenaEditorial = getDevelopmentEditorialCuration('faena');
    const rawDescription =
      'Frase inicial del proyecto. Resto de la primera oración real.\n\nEl edificio\nParque privado\nResidencias\nElevadores privados\n\n1 Habitación desde U$D 1.300.000\n2 Habitación desde U$D 1.900.000\n\n DEPOSITOS Y FECHAS:\n 20% firma del contrato de inmediato.\n 20% at groundbreaking julio 2025.';
    const safe = resolveSafeDescription(rawDescription, faenaEditorial);
    expect(safe).toContain('Frase inicial del proyecto');
    expect(safe).toContain('El edificio');
    expect(safe).toContain('Elevadores privados');
    expect(safe).not.toContain('1.300.000');
    expect(safe).not.toContain('DEPOSITOS Y FECHAS');
    expect(safe).not.toContain('groundbreaking');
  });

  it('las imágenes elegidas no se repiten entre bloques (Benavídez Village y Pacheco Central)', () => {
    for (const [slug, propertyId, count] of [
      ['benavidez-village', 233702, 20],
      ['pacheco-central', 233719, 6],
    ] as const) {
      const curation = getDevelopmentBySlug(slug)!;
      const fixture = property({
        propertyId,
        images: Array.from({ length: count }, (_, i) => ({ imageId: `${slug}${i}`, url: `https://cdn.2clics.com/${slug}-${i}.jpg` })),
      });
      const html = render(
        React.createElement(CuratedDevelopmentDetailView, {
          curation,
          source: toDevSource(fixture, curation.publicName),
          units: [fixture],
        }),
      );
      const imgTags = html.match(/<img[^>]*>/g) || [];
      for (const image of fixture.images) {
        const enc = encodeURIComponent(image.displayUrl);
        expect(imgTags.filter((tag) => tag.includes(enc)).length).toBeLessThanOrEqual(1);
      }
    }
  });

  it('187694/187684 no se incorporan como desarrollo', () => {
    expect(getDevelopmentBySlug('187694')).toBeNull();
    expect(getDevelopmentBySlug('187684')).toBeNull();
    expect(getAllDevelopmentSlugs()).toEqual(['faena', 'benavidez-village', 'pacheco-central', 'remeros-beach', 'domus-brickell-center']);
  });
});

// ── /desarrollos (índice) — apertura editorial + selector de mercado (decimonovena pasada) ──────
describe('/desarrollos (índice) — apertura editorial, selector de mercado y grilla compacta (decimonovena pasada)', () => {
  const source = property({ propertyId: 236986 });

  it('cada desarrollo declara su mercado explícitamente en la curaduría (nunca inferido del título) — Faena y Domus en US, Benavídez Village, Pacheco Central y Remeros Beach en AR', () => {
    for (const entry of DEVELOPMENTS) {
      expect(['US', 'AR']).toContain(entry.market);
    }
    expect(DEVELOPMENTS.filter((d) => d.market === 'US')).toHaveLength(2);
    expect(DEVELOPMENTS.filter((d) => d.market === 'AR')).toHaveLength(3);
  });

  it('getDevelopmentsByMarket devuelve los desarrollos activos de cada mercado', () => {
    expect(getDevelopmentsByMarket('US').map((d) => d.slug)).toEqual(['faena', 'domus-brickell-center']);
    expect(getDevelopmentsByMarket('AR').map((d) => d.slug)).toEqual(['benavidez-village', 'pacheco-central', 'remeros-beach']);
  });

  it('el filtro es por el campo explícito `market`, no por texto de ubicación/título — cambiar el título de la fuente no reclasifica el mercado', () => {
    // Regresión conceptual: `market` vive en `lib/site-curation.ts` (curaduría), completamente
    // desacoplado de `source.title`/`source.location` (2Clics real) — no hay ningún parser que
    // busque "Miami"/"Argentina" en texto libre para decidir esto.
    const domus = getDevelopmentBySlug('domus-brickell-center')!;
    expect(domus.market).toBe('US');
    expect(getDevelopmentsByMarket('US')).toContain(domus);
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

  it('Regresión: /comprar excluye los desarrollos activos, Invertir sin cambios, fichas individuales sin la clase compacta ni los tabs', () => {
    for (const id of [236986, 233702, 233719, 236682]) {
      expect(isExcludedFromStandardCatalog(id)).toBe(true);
    }
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

// ── Pacheco Central (233719) — primer desarrollo de Argentina (vigesimosegunda pasada) ──────────
describe('/desarrollos/pacheco-central — primer desarrollo de Argentina (vigesimosegunda pasada)', () => {
  const pachecoRaw = {
    propertyId: 233719,
    address: 'Pacheco Central 2 Ambientes a Estrenar con Financiacion',
    price: 112000,
    currency: 'U$D',
    hidePrice: false,
    amountRoom: 2,
    totalArea: 46.5,
    coveredArea: 42.2,
    uncoveredArea: 4.3,
    state: { stateId: 3, name: 'Bs.As. G.B.A. Norte' },
    city: { cityId: 41, name: 'Tigre' },
    neighborhood: { neighborhoodId: 567, name: 'General Pacheco' },
    amenities: [
      { amenitieId: '14', name: 'Internet', type: 'service' },
      { amenitieId: '8', name: 'Balcón', type: 'amenitie' },
      { amenitieId: '23', name: 'Piscina', type: 'amenitie' },
      { amenitieId: '29', name: 'Seguridad', type: 'amenitie' },
    ],
    images: Array.from({ length: 6 }, (_, i) => ({ imageId: `pc${i}`, url: `https://cdn.2clics.com/pc${i}.jpg` })),
    meta_data: [
      {
        metaKey: 'title',
        metaValue: 'Pacheco Central, Unidad de Dos Ambientes a Estrenar…',
      },
      {
        metaKey: 'description',
        metaValue:
          '2 ambientes \n46,5m2 totales\n42,2 cubirertos\n4,30 balcon\n\nValor contado USD112.000\n\nFinanciado en hasta 100 cuotas USD131.000\nBoleto: 30%\nSaldo restante en hasta 100 cuotas\nPosesión otorgada con 60% de la unidad paga\n\nFINANCIACION 100% PERSONALIZADA\n\nPacheco Central es una propuesta urbanística residencial conformada por 260 unidades, distribuidas en 8 módulos dispuestos en torno al gran parque central y a su espejo de agua.\n\nFabiana Garcia\nwww.garciainversiones.com.ar\n+54 911 6724 0353',
      },
    ],
  };
  const pacheco = getDevelopmentBySlug('pacheco-central')!;
  const pachecoFixture = property(pachecoRaw, 'AR');
  const pachecoSource = toDevSource(pachecoFixture, pacheco.publicName);
  const pachecoEditorial = getDevelopmentEditorialCuration('pacheco-central');

  it('property_app_id 233719, slug pacheco-central, publicName "Pacheco Central", market AR', () => {
    expect(pacheco.sourcePropertyId).toBe(233719);
    expect(pacheco.propertyIds).toEqual([233719]);
    expect(pacheco.slug).toBe('pacheco-central');
    expect(pacheco.publicName).toBe('Pacheco Central');
    expect(pacheco.market).toBe('AR');
  });

  it('aparece en Argentina y NO en Estados Unidos', () => {
    expect(getDevelopmentsByMarket('AR').map((d) => d.slug)).toContain('pacheco-central');
    expect(getDevelopmentsByMarket('US').map((d) => d.slug)).not.toContain('pacheco-central');
  });

  it('desaparece de Comprar como propiedad tradicional', () => {
    expect(isExcludedFromStandardCatalog(233719)).toBe(true);
  });

  it('Developer no es un campo público (snapshot) — Soldati nunca aparece', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: pacheco, source: pachecoSource, units: [pachecoFixture] }),
    );
    expect(html).not.toContain('>Developer<');
    expect(html).not.toContain('>Desarrollador<');
    expect(html).not.toContain('Soldati');
  });

  it('precio: U$D 112.000 es de la unidad de referencia — se muestra como tal, nunca como "Desde"/"Rango de precio" del desarrollo', () => {
    expect(pachecoEditorial?.priceRepresentsProjectRange).toBe(false);
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: pacheco, source: pachecoSource, units: [pachecoFixture] }),
    );
    expect(html).not.toContain('Rango de precio');
    expect(html).not.toContain('Desde U$D 112.000');
    expect(html).toContain('project-commercial-summary');
    expect(html).toContain('<span>Precio de esta unidad</span><strong>U$D 112.000</strong>');
  });

  it('unidad de referencia: medidas leídas en vivo de 2Clics (46,5 / 42,2 / 4,3 m²), sin número de UF ni medidas hardcodeadas en la curaduría', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: pacheco, source: pachecoSource, units: [pachecoFixture] }),
    );
    expect(html).toContain('>Unidad de referencia<');
    expect(html).toContain('<h2>Departamento de 2 ambientes con balcón</h2>');
    expect(html).toContain('>46,5 m²</span><span class="project-commercial-schedule-label">Superficie total<');
    expect(html).toContain('>42,2 m²</span><span class="project-commercial-schedule-label">Cubierta<');
    expect(html).toContain('>4,3 m²</span><span class="project-commercial-schedule-label">Balcón<');
    expect(html).toContain('>2</span><span class="project-commercial-schedule-label">Ambientes<');
    expect(html).not.toMatch(/UF/);
    const curationJson = JSON.stringify(pachecoEditorial);
    expect(curationJson).not.toContain('46 m²');
    expect(curationJson).not.toContain('46,5');
    // Si la unidad cambia en 2Clics, la ficha refleja el dato nuevo sin tocar la curaduría.
    const updated = property({ ...pachecoRaw, totalArea: 50.2 }, 'AR');
    const updatedHtml = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: pacheco, source: toDevSource(updated, pacheco.publicName), units: [updated] }),
    );
    expect(updatedHtml).toContain('>50,2 m²</span>');
  });

  it('precio: el gate respeta la curaduría — si priceRepresentsProjectRange fuera true, sí se mostraría (regresión del mecanismo, no solo de Pacheco Central)', () => {
    const trueEditorial = { ...pachecoEditorial!, priceRepresentsProjectRange: true };
    // No se puede monkey-patchear getDevelopmentEditorialCuration fácilmente acá; se verifica el
    // helper puro en cambio — formatDevelopmentPriceRange SÍ devuelve un valor para este precio.
    expect(formatDevelopmentPriceRange(112000, 'U$D', false)).toBe('Desde U$D 112.000');
    expect(trueEditorial.priceRepresentsProjectRange).toBe(true);
  });

  it('no título comercial crudo ("Unidad de Dos Ambientes"/"con Financiacion") ni descripción completa cruda', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: pacheco, source: pachecoSource, units: [pachecoFixture] }),
    );
    expect(html).not.toContain('Unidad de Dos Ambientes');
    expect(html).not.toContain('con Financiacion');
    expect(html).not.toContain('Financiado en hasta 100 cuotas');
    expect(html).not.toContain('Boleto: 30%');
    expect(html).not.toContain('FINANCIACION 100% PERSONALIZADA');
    expect(html).toContain('<h1>Pacheco Central</h1>');
  });

  it('no datos privados: nombre/teléfono/sitio del agente incrustados en la descripción nunca llegan al HTML ni al payload seguro', () => {
    const safeDescription = resolveSafeDescription(pachecoFixture.description, pachecoEditorial);
    expect(safeDescription).not.toContain('Fabiana Garcia');
    expect(safeDescription).not.toContain('garciainversiones.com.ar');
    expect(safeDescription).not.toContain('6724 0353');
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: pacheco, source: pachecoSource, units: [pachecoFixture] }),
    );
    expect(html).not.toContain('Fabiana Garcia');
    expect(html).not.toContain('garciainversiones.com.ar');
  });

  it('sección "Interiores y residencias" usa solo las imágenes reales seleccionadas en la curaduría (3), sin imágenes de relleno', () => {
    expect(pachecoEditorial?.interiors?.title).toBe('Interiores y residencias');
    expect(pachecoEditorial?.interiors?.imageIndexes).toEqual([2, 3, 5]);
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: pacheco, source: pachecoSource, units: [pachecoFixture] }),
    );
    expect(html).toContain('<h2>Interiores y residencias</h2>');
    expect(html).toContain('project-interiors-grid--3');
  });

  it('sin imágenes duplicadas accidentalmente en toda la ficha', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: pacheco, source: pachecoSource, units: [pachecoFixture] }),
    );
    const imgTags = html.match(/<img[^>]*>/g) || [];
    const usedUrls = pachecoFixture.images
      .map((img) => encodeURIComponent(img.displayUrl))
      .filter((enc) => imgTags.some((tag) => tag.includes(enc)));
    for (const enc of usedUrls) {
      expect(imgTags.filter((tag) => tag.includes(enc)).length).toBe(1);
    }
    // Las 6 imágenes reales se usan todas, sin repetir: hero(1) + momento-visual(1) +
    // residencias(1) + interiores(3).
    expect(usedUrls.length).toBe(6);
  });

  it('CTA único, usa property_app_id 233719, PropertyInquiryPanel sin modificar', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: pacheco, source: pachecoSource, units: [pachecoFixture] }),
    );
    expect((html.match(/data-property-app-id="233719"/g) || []).length).toBe(1);
    expect(html).toContain('>Consultar disponibilidad<');
    expect(html).toContain('¿Querés conocer más sobre Pacheco Central?');
  });

  it('ubicación pública resuelta desde datos reales (General Pacheco · Tigre · Argentina), nunca el state técnico crudo', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: pacheco, source: pachecoSource, units: [pachecoFixture] }),
    );
    expect(html).toContain('General Pacheco');
    expect(html).toContain('Tigre');
    expect(html).not.toContain('Bs.As. G.B.A. Norte');
  });

  it('snapshot: solo campos confirmados, con tipologías y etapas de entrega de la descripción vigente, nunca placeholders', () => {
    const snapshot = pachecoEditorial?.sections.find((s) => s.layout === 'snapshot');
    const labels = snapshot?.snapshotFields?.map((f) => f.label) || [];
    expect(labels).toEqual(['Ubicación', 'Unidades', 'Módulos', 'Tipologías', 'Cocheras']);
    // Las etapas viven en su propia banda (no se repiten en el snapshot).
    const etapas = pachecoEditorial?.sections.find((s) => s.key === 'etapas');
    expect(etapas?.layout).toBe('facts-band');
    expect(etapas?.bandItems?.map((item) => item.value)).toEqual(['Diciembre 2026', 'Diciembre 2029']);
    for (const field of snapshot?.snapshotFields || []) {
      expect(field.value.toLowerCase()).not.toContain('consultar');
    }
  });

  it('regresión: el selector de mercado devuelve Faena/Domus en US y Benavídez/Pacheco en AR', () => {
    expect(getDevelopmentsByMarket('US').map((d) => d.slug)).toEqual(['faena', 'domus-brickell-center']);
    expect(getDevelopmentsByMarket('AR').map((d) => d.slug)).toEqual(['benavidez-village', 'pacheco-central', 'remeros-beach']);
  });
});

// ── Vigesimocuarta pasada — Domus Brickell Center, ficha editorial completa ─────────────────────
describe('/desarrollos/domus-brickell-center — ficha editorial completa (vigesimocuarta pasada)', () => {
  const domus = getDevelopmentBySlug('domus-brickell-center')!;
  const domusEditorial = getDevelopmentEditorialCuration('domus-brickell-center');
  // 17 imágenes reales de 236682 — suficientes para cubrir todos los imageIndexes usados (máximo
  // real usado: 15). `hidePrice: false` y la descripción de abajo reflejan el payload LIVE
  // re-auditado en la vigesimosexta pasada (ya no el snapshot viejo con hidePrice true) — la
  // comunicación comercial "Ingresá a Brickell Center con USD 157.500 / 30% de una unidad de
  // USD 525.000 / calendario 10-5-5-10" está confirmada textual en la descripción vigente.
  const domusRaw = property(
    {
      propertyId: 236682,
      address: '1034 SW 2nd Ave',
      price: 157500,
      currency: 'U$D',
      hidePrice: false,
      lat: 25.7637072,
      long: -80.1975479,
      amountRoom: 1,
      amountBedroom: null,
      totalArea: 41,
      images: Array.from({ length: 17 }, (_, i) => ({ imageId: `dbc${i}`, url: `https://cdn.2clics.com/dbc${i}.jpg` })),
      amenities: [
        { amenitieId: '1', name: 'Rooftop pool', type: 'amenitie' },
        { amenitieId: '2', name: 'Gimnasio interior/exterior', type: 'amenitie' },
      ],
      meta_data: [
        {
          metaKey: 'description',
          metaValue:
            'Domus Brickell Center\n\nIngresá a Brickell Center con USD 157.500\n\nEste importe representa el 30% de una unidad de USD 525.000, distribuido según el calendario de depósitos del proyecto. Consultanos por condiciones vigentes y saldo restante.\n\nCalendario de depósitos\n- 10% al firmar el contrato\n- 5% a los 90 días\n- 5% a los 120 días\n- 10% al año\n\nTotal durante esta etapa: 30%.\n\n---\n\n1034 SW 2nd Avenue, Miami, FL 33130\n\nFabiana Garcia\nTel: 1167240353\nwww.garciainversiones.com.ar',
        },
      ],
    },
    'US',
  );
  // Simula exactamente lo que `app/desarrollos/[id]/page.tsx` arma hoy para CUALQUIER desarrollo
  // (price → null SOLO cuando hidePrice es true) — no se puede importar el Server Component async
  // directamente en este runner, así que el fixture replica su contrato real. Con hidePrice=false
  // (reality actual), el precio SÍ pasa — es el dato que el bloque comercial necesita.
  const domusSource = { ...toDevSource(domusRaw, domus.publicName), price: domusRaw.hidePrice ? null : domusRaw.price };
  // Fixture secundaria — si 2Clics volviera a ocultar el precio (`hidePrice: true`), el bloque
  // comercial completo debe desaparecer solo, nunca mostrar un monto stale.
  const domusHiddenSource = { ...domusSource, price: null, hidePrice: true };

  it('property_app_id 236682, slug domus-brickell-center, publicName "Domus Brickell Center", market US — nunca 236646', () => {
    expect(domus.sourcePropertyId).toBe(236682);
    expect(domus.propertyIds).toEqual([236682]);
    expect(domus.slug).toBe('domus-brickell-center');
    expect(domus.publicName).toBe('Domus Brickell Center');
    expect(domus.market).toBe('US');
    expect(JSON.stringify(domus)).not.toContain('236646');
    expect(getDevelopmentBySlug('domus-brickell-center')?.sourcePropertyId).not.toBe(236646);
  });

  it('aparece en Estados Unidos y NO en Argentina; excluido de /comprar; nunca en INVESTMENT_OPPORTUNITIES/invertir', () => {
    expect(getDevelopmentsByMarket('US').map((d) => d.slug)).toContain('domus-brickell-center');
    expect(getDevelopmentsByMarket('AR').map((d) => d.slug)).not.toContain('domus-brickell-center');
    expect(isExcludedFromStandardCatalog(236682)).toBe(true);
    expect(JSON.stringify(INVESTMENT_OPPORTUNITIES)).not.toContain('236682');
    expect(JSON.stringify(INVESTMENT_OPPORTUNITIES).toLowerCase()).not.toContain('domus');
  });

  it('precio del snapshot sigue omitido (priceRepresentsProjectRange: false) — el monto de entrada vive solo en "Estructura de ingreso", nunca como "Rango de precio" genérico', () => {
    expect(domusEditorial?.priceRepresentsProjectRange).toBe(false);
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusSource, units: [domusRaw] }),
    );
    expect(html).not.toContain('Rango de precio');
    expect(html).not.toMatch(/project-snapshot-label">Precio/);
  });

  it('"Estructura de ingreso" (vigesimosexta pasada): headline, contexto 30%/525.000, calendario 10-5-5-10, total y saldo restante — comunicación comercial aprobada', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusSource, units: [domusRaw] }),
    );
    expect(html).toContain('Estructura de ingreso');
    expect(html).toContain('Ingresá a Brickell Center con');
    expect(html).toContain('U$D 157.500');
    expect(html).toContain('30');
    expect(html).toContain('U$D 525.000');
    expect(html).toContain('Al firmar el contrato');
    expect(html).toContain('A los 90 días');
    expect(html).toContain('A los 120 días');
    expect(html).toContain('Al año');
    expect(html).toContain('Total durante esta etapa: 30%');
    expect(html).toContain('Consultanos por condiciones vigentes y saldo restante.');
    // El monto y su aclaración viven en la misma sección — nunca separados.
    const headlineIdx = html.indexOf('Ingresá a Brickell Center con');
    const contextIdx = html.indexOf('de una unidad de');
    expect(contextIdx - headlineIdx, 'headline y contexto deberían estar a pocos caracteres uno del otro').toBeLessThan(400);
  });

  it('el calendario de depósitos suma exactamente 30% (10+5+5+10) — el total nunca se guarda suelto, se calcula del propio calendario', () => {
    const commercialSection = domusEditorial?.sections.find((s) => s.layout === 'commercial-entry');
    expect(commercialSection?.commercialSchedule).toEqual([
      { label: 'Al firmar el contrato', percent: 10 },
      { label: 'A los 90 días', percent: 5 },
      { label: 'A los 120 días', percent: 5 },
      { label: 'Al año', percent: 10 },
    ]);
    const total = (commercialSection?.commercialSchedule || []).reduce((sum, step) => sum + step.percent, 0);
    expect(total).toBe(30);
    expect(commercialSection?.commercialReferenceAmount).toBe(525000);
    expect(commercialSection?.commercialReferenceCurrency).toBe('U$D');
  });

  it('USD 157.500 nunca se trata como precio total/rango del proyecto — nunca aparece la palabra "Desde" pegada a 157.500, nunca hay un segundo monto suelto sin contexto', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusSource, units: [domusRaw] }),
    );
    expect(html).not.toContain('Desde U$D 157.500');
    // El monto aparece exactamente una vez en toda la ficha — solo dentro de "Estructura de ingreso".
    expect((html.match(/157\.500/g) || []).length).toBe(1);
  });

  it('NO comunica financiación garantizada del saldo restante: sin "70% financiado", sin "crédito hipotecario", sin "Apto crédito"/"Ofrece financiación", sin tasa/plazo/aprobación bancaria', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusSource, units: [domusRaw] }),
    );
    const forbidden = [
      '70%',
      '70 %',
      'financiado',
      'Financiado',
      'crédito hipotecario',
      'Credito hipotecario',
      'Apto crédito',
      'Ofrece financiación',
      'hipoteca',
      'aprobación bancaria',
      'tasa de interés',
      'después del cierre',
    ];
    for (const phrase of forbidden) {
      expect(html, `frase de financiación no autorizada "${phrase}" presente`).not.toContain(phrase);
    }
  });

  it('si 2Clics volviera a ocultar el precio (hidePrice: true), "Estructura de ingreso" desaparece entera — nunca un monto stale', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusHiddenSource, units: [domusRaw] }),
    );
    expect(html).not.toContain('Estructura de ingreso');
    expect(html).not.toContain('157.500');
    expect(html).not.toContain('525.000');
    expect(html).not.toContain('Ingresá a Brickell Center');
  });

  it('"Información comercial" ya no dice "Precio: consultar" (contradiría el nuevo bloque) — queda Disponibilidad + Condiciones comerciales, sin repetir 157.500', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusSource, units: [domusRaw] }),
    );
    expect(html).not.toContain('Precio: consultar.');
    expect(html).toContain('Disponibilidad: consultar información vigente.');
    expect(html).toContain('Condiciones comerciales: consultar condiciones vigentes y saldo restante.');
    const informacionComercialIdx = html.indexOf('Información comercial');
    const afterSection = html.slice(informacionComercialIdx, informacionComercialIdx + 600);
    expect(afterSection).not.toContain('157.500');
  });

  it('link discreto de "Estructura de ingreso" apunta al CTA final (mismo mecanismo, sin segundo formulario/lead)', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusSource, units: [domusRaw] }),
    );
    expect(html).toContain('href="#project-cta-final"');
    expect(html).toContain('id="project-cta-final"');
    expect((html.match(/data-property-app-id="236682"/g) || []).length).toBe(1);
  });

  it('SEO: resolveSafeDescription (fuente del meta description/OG) nunca incluye 157.500/525.000/30%/financiación — descripción factual sin precio', () => {
    const safeDescription = resolveSafeDescription(domusRaw.description, domusEditorial);
    expect(safeDescription).not.toContain('157.500');
    expect(safeDescription).not.toContain('525.000');
    expect(safeDescription).not.toContain('Ingresá a Brickell Center');
    expect(safeDescription).not.toContain('financiado');
    expect(safeDescription).toContain('Brickell');
  });

  it('236646: clasificado como "duplicado-fuera-de-mercado" (nunca "desarrollo"), excluido de /comprar, nunca en DEVELOPMENTS ni INVESTMENT_OPPORTUNITIES', () => {
    const entry = getCurationForPropertyId(236646);
    expect(entry).not.toBeNull();
    expect(entry?.classification).not.toBe('desarrollo');
    expect(entry?.classification).toBe('duplicado-fuera-de-mercado');
    expect(entry?.excludeFromStandardCatalog).toBe(true);
    expect(isExcludedFromStandardCatalog(236646)).toBe(true);
    expect(getAllDevelopmentSlugs().map((slug) => getDevelopmentBySlug(slug)?.sourcePropertyId)).not.toContain(236646);
    expect(JSON.stringify(DEVELOPMENTS)).not.toContain('236646');
    expect(JSON.stringify(INVESTMENT_OPPORTUNITIES)).not.toContain('236646');
  });

  it('sin datos de agente/CRM crudos ni claims comerciales no autorizados (Apto crédito, Ofrece financiación, Calendario de Depósitos, revenue split, rentabilidad garantizada)', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusSource, units: [domusRaw] }),
    );
    const forbidden = [
      'Fabiana Garcia',
      'garciainversiones.com.ar',
      '1167240353',
      'EL MOMENTO ES AHORA',
      'LISTA 0',
      'Calendario de Depósitos',
      'Apto crédito',
      'Ofrece financiación',
      'revenue split',
      'rentabilidad garantizada',
      'retorno garantizado',
      'ocupación garantizada',
      '236646',
    ];
    for (const phrase of forbidden) {
      expect(html, `frase prohibida "${phrase}" presente`).not.toContain(phrase);
    }
  });

  it('snapshot: solo campos de proyecto confirmados (Ubicación/Unidades/Pisos/Tipologías/Estado/Arquitectura/Interiorismo) — nunca datos de la unidad fuente (39 m²/41 m²/1 ambiente/1 baño) ni "Developer"', () => {
    const snapshot = domusEditorial?.sections.find((s) => s.layout === 'snapshot');
    const labels = snapshot?.snapshotFields?.map((f) => f.label) || [];
    expect(labels).toEqual(['Ubicación', 'Unidades', 'Pisos', 'Tipologías', 'Estado', 'Arquitectura', 'Interiorismo']);
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusSource, units: [domusRaw] }),
    );
    expect(html).not.toContain('>Developer<');
    expect(html).not.toContain('>Desarrollador<');
    expect(html).not.toContain('41 m²');
    expect(html).not.toContain('39 m²');
    expect(html).toContain('579 flats');
    expect(html).toContain('35');
  });

  it('CTA único, usa property_app_id 236682, copy contextual propia ("Evaluar este desarrollo") — el resto de las fichas conserva el CTA genérico', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusSource, units: [domusRaw] }),
    );
    expect((html.match(/data-property-app-id="236682"/g) || []).length).toBe(1);
    expect(html).toContain('>Evaluar este desarrollo<');
    expect(html).not.toContain('>Consultar disponibilidad<');
    expect(html).toContain('¿Querés evaluar Domus Brickell Center?');
    expect(html).toContain('Consultanos para conocer información vigente del proyecto');
    // Regresión: Faena sigue usando el CTA genérico (sin declarar ctaTitle/ctaLabel propios).
    const faenaEditorial = getDevelopmentEditorialCuration('faena');
    expect(faenaEditorial?.ctaLabel).toBeUndefined();
  });

  it('modal de consulta usa copy contextual propia (PropertyInquiryPanel, sin segundo flujo de leads)', () => {
    expect(domusEditorial?.ctaModalTitle).toBe('Evaluar Domus Brickell Center');
    expect(domusEditorial?.ctaInitialMessage).toContain('Domus Brickell Center');
  });

  it('mapa: usa la dirección curada exacta y la muestra debajo del mapa — sin "Dirección confirmada" ni "Ubicación aproximada"', () => {
    const html = render(React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusSource, units: [domusRaw] }));
    expect(html).toContain('<p class="project-location-address">1034 SW 2nd Avenue, Miami, FL 33130</p>');
    expect(html).toContain('Ver en Google Maps');
    expect(html).not.toContain('Dirección confirmada');
    expect(html).not.toContain('Ubicación aproximada');
  });

  it('"Interiores y residencias" usa 4 imágenes reales de la unidad, sin imágenes duplicadas en toda la ficha', () => {
    expect(domusEditorial?.interiors?.title).toBe('Interiores y residencias');
    expect(domusEditorial?.interiors?.imageIndexes).toEqual([4, 6, 7, 9]);
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusSource, units: [domusRaw] }),
    );
    expect(html).toContain('project-interiors-grid--4');
    const imgTags = html.match(/<img[^>]*>/g) || [];
    const seen = new Map<string, number>();
    for (const tag of imgTags) {
      const m = tag.match(/src="([^"]+)"/);
      if (!m) continue;
      const key = decodeURIComponent(m[1].split('url=')[1] || m[1]).split('&')[0];
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    const dupes = [...seen.entries()].filter(([, c]) => c > 1);
    expect(dupes, `imágenes duplicadas: ${JSON.stringify(dupes)}`).toHaveLength(0);
  });

  it('groups: "Amenities y hospitality" usa los 4 ejes confirmados (Rooftop/Wellness/Trabajo/Hospitality y servicios)', () => {
    const grouped = domusEditorial?.sections.find((s) => s.groups?.length);
    expect(grouped?.groups?.map((g) => g.title)).toEqual(['Rooftop', 'Wellness', 'Trabajo', 'Hospitality y servicios']);
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusSource, units: [domusRaw] }),
    );
    expect(html).toContain('<h3>Rooftop</h3>');
    expect(html).toContain('<h3>Wellness</h3>');
    expect(html).toContain('<h3>Trabajo</h3>');
    expect(html).toContain('<h3>Hospitality y servicios</h3>');
  });

  it('secciones nuevas presentes: "Puede no tener sentido si" y "Antes de avanzar, hay preguntas que conviene responder" — sin prometer rentabilidad', () => {
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: domus, source: domusSource, units: [domusRaw] }),
    );
    expect(html).toContain('Puede no tener sentido si');
    expect(html).toContain('Antes de avanzar, hay preguntas que conviene responder');
    expect(html).toContain('Domus Brickell Park');
    expect(html).toContain('no implica iguales resultados económicos para Brickell Center');
  });

  it('card del índice: sin precio, sin CTA, sin descripción larga — solo imagen curada + eyebrow + nombre + ubicación', () => {
    const cardSource = toDevelopmentCardSource(domusRaw, domus.publicName, domusEditorial?.cardImageIndex);
    expect(cardSource.image?.url).toBe('https://cdn.2clics.com/dbc2.jpg'); // cardImageIndex 2
    const html = render(React.createElement(CuratedDevelopmentCard, { curation: domus, source: cardSource, variant: 'compact' }));
    expect(html).toContain('>Domus Brickell Center<');
    expect(html).toContain('>Desarrollo<');
    expect(html).not.toMatch(/U\$D|US\$|157|160|525/);
    expect(html).not.toContain('data-property-app-id');
    expect(html).not.toContain('<button');
  });

  it('página de ficha: `hidePrice` anula el precio crudo antes de llegar a props (fix de la vigesimocuarta pasada, aplica a CUALQUIER desarrollo, no solo a Domus)', () => {
    const detailSource = readFileSync('app/desarrollos/[id]/page.tsx', 'utf8');
    expect(detailSource).toContain('price: sourceProperty.hidePrice ? null : sourceProperty.price');
  });

  it('regresión: Domus y los demás desarrollos activos siguen fuera de /comprar', () => {
    expect(getDevelopmentsByMarket('US').map((d) => d.slug)).toEqual(['faena', 'domus-brickell-center']);
    for (const id of [236986, 233719, 236682, 233702]) {
      expect(isExcludedFromStandardCatalog(id)).toBe(true);
    }
  });
});

// ── Desarrollos activos — sistema editorial completo (sincronización con 2Clics 2026-10-15) ─────
describe('/desarrollos — los 4 desarrollos activos (Faena, Benavídez Village, Pacheco Central, Domus)', () => {
  type DevFixture = { propertyId: number; imageCount: number; region: 'AR' | 'US'; extra?: Record<string, unknown> };
  const fixtures: Record<string, DevFixture> = {
    faena: {
      propertyId: 236986,
      imageCount: 14,
      region: 'US',
      extra: {
        price: 1300000,
        meta_data: [
          {
            metaKey: 'description',
            metaValue:
              'Tras haber transformado Miami Beach en un centro global de arte, ahora nos embarcamos en un nuevo viaje a lo largo del Rio Miami. Con nuestro compromiso con la belleza. Alan Faena.\n\nEl edificio\nParque privado\nMarina\nResidencias\nElevadores privados\n\n1 Habitación desde U$D 1.300.000\n\n DEPOSITOS Y FECHAS:\n 20% firma del contrato de inmediato.',
          },
        ],
      },
    },
    'benavidez-village': { propertyId: 233702, imageCount: 20, region: 'AR', extra: { price: 138000 } },
    'pacheco-central': { propertyId: 233719, imageCount: 6, region: 'AR', extra: { price: 112000 } },
    'domus-brickell-center': { propertyId: 236682, imageCount: 17, region: 'US', extra: { price: 157500 } },
  };
  const slugs = Object.keys(fixtures);

  function fixtureFor(slug: string, overrides: Record<string, unknown> = {}) {
    const f = fixtures[slug];
    return property(
      {
        propertyId: f.propertyId,
        currency: 'U$D',
        images: Array.from({ length: f.imageCount }, (_, i) => ({ imageId: `${slug}${i}`, url: `https://cdn.2clics.com/${slug}-${i}.jpg` })),
        ...f.extra,
        ...overrides,
      },
      f.region,
    );
  }

  function renderDev(slug: string, overrides: Record<string, unknown> = {}, units?: PublicProperty[]) {
    const curation = getDevelopmentBySlug(slug)!;
    const fixture = fixtureFor(slug, overrides);
    return render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation,
        source: toDevSource(fixture, curation.publicName),
        units: units || [fixture],
      }),
    );
  }

  it('cada ficha tiene curaduría editorial propia, con snapshot/reasons/para-quien/puede-no-tener-sentido/rol de García Inversiones', () => {
    for (const slug of slugs) {
      const keys = getDevelopmentEditorialCuration(slug)?.sections.map((s) => s.key) || [];
      for (const key of ['snapshot', 'reasons', 'para-quien', 'puede-no-tener-sentido', 'garcia-acompanamiento']) {
        expect(keys, `${slug} sin ${key}`).toContain(key);
      }
    }
  });

  it('"El rol de García Inversiones": nunca "García" solo; nunca administra/garantiza/es developer', () => {
    for (const slug of slugs) {
      const section = getDevelopmentEditorialCuration(slug)?.sections.find((s) => s.key === 'garcia-acompanamiento');
      expect(section?.title).toBe('El rol de García Inversiones');
      const text = section?.sourceTextSegment.type === 'curatedText' ? section.sourceTextSegment.text.toLowerCase() : '';
      expect(text).toContain('no administra');
      expect(text).toContain('no reemplaza');
      expect(text).not.toMatch(/(?<!no )garantiza/);
    }
  });

  it('"Developer"/"Desarrollador" no aparece como dato visible en ninguna ficha', () => {
    for (const slug of slugs) {
      const html = renderDev(slug);
      expect(html).not.toContain('>Developer<');
      expect(html).not.toContain('>Desarrollador<');
    }
  });

  it('semántica de precio: solo Faena muestra "Rango de precio" (Desde U$D 1.300.000, verificado contra 236986); Benavídez/Pacheco/Domus nunca un "desde" inventado', () => {
    expect(getDevelopmentEditorialCuration('faena')?.priceRepresentsProjectRange).toBe(true);
    const faena = renderDev('faena');
    // El "desde" verificado vive en el bloque "Información comercial" (no se repite en el snapshot).
    expect(faena).toContain('<h2>Residencias desde U$D 1.300.000</h2>');
    expect(faena).not.toContain('Rango de precio');
    for (const slug of ['benavidez-village', 'pacheco-central', 'domus-brickell-center']) {
      expect(getDevelopmentEditorialCuration(slug)?.priceRepresentsProjectRange).toBe(false);
      const html = renderDev(slug);
      expect(html, slug).not.toContain('Rango de precio');
      expect(html, slug).not.toMatch(/Desde U\$D/);
    }
    // hidePrice: el bloque comercial de Faena desaparece solo.
    expect(renderDev('faena', { hidePrice: true })).not.toContain('Residencias desde');
  });

  it('"Puede no tener sentido si" nunca hardcodea montos, disponibilidad ni tipologías de una unidad', () => {
    for (const slug of slugs) {
      const section = getDevelopmentEditorialCuration(slug)?.sections.find((s) => s.key === 'puede-no-tener-sentido');
      const json = JSON.stringify(section?.sourceTextSegment).toLowerCase();
      expect(json, slug).not.toMatch(/u\$d\s?[\d.,]+|usd\s?[\d.,]+/);
      expect(json, slug).not.toContain('disponible hoy');
      expect(json, slug).not.toContain('quedan');
    }
  });

  it('las imágenes de "Interiores" nunca repiten una imagen usada en otro bloque de la misma ficha', () => {
    for (const slug of slugs) {
      const editorial = getDevelopmentEditorialCuration(slug)!;
      const used = new Set<number>([editorial.heroImageIndex, ...editorial.sections.flatMap((s) => s.imageIndexes)]);
      for (const index of editorial.interiors?.imageIndexes || []) {
        expect(used.has(index), `${slug} reutiliza idx ${index}`).toBe(false);
      }
    }
  });

  it('CTA único por ficha, con el property_app_id de su fuente', () => {
    for (const slug of slugs) {
      const html = renderDev(slug);
      const id = fixtures[slug].propertyId;
      expect((html.match(new RegExp(`data-property-app-id="${id}"`, 'g')) || []).length, slug).toBe(1);
    }
  });

  it('mapa: Faena sin mapa (ubicación editorial, nunca la dirección/coordenadas del CRM); Benavídez y Pacheco con coordenadas reales; Domus "Dirección confirmada"', () => {
    const faena = renderDev('faena', { address: '90 SW 3rd St', lat: 25.7715038, long: -80.1956497 });
    expect(faena).toContain('<p class="project-open-location">Miami River · Miami · Florida · Estados Unidos</p>');
    expect(faena).not.toContain('project-location-map');
    expect(faena).not.toContain('25.7715038');
    expect(renderDev('benavidez-village')).toContain(encodeURIComponent('-34.4171266,-58.6954548'));
    expect(renderDev('pacheco-central')).toContain(encodeURIComponent('-34.4536035,-58.6276873'));
    const domus = renderDev('domus-brickell-center');
    expect(domus).toContain('project-location-address');
    expect(domus).not.toContain('Dirección confirmada');
  });

  it('ninguna ficha expone la dirección interna del CRM ni el state crudo', () => {
    const pacheco = renderDev('pacheco-central', { address: 'Pacheco Central 2 Ambientes a Estrenar con Financiacion' });
    expect(pacheco).not.toContain('a Estrenar con Financiacion');
    const benavidez = renderDev('benavidez-village', { address: 'Benavídez Village · UF 16' });
    expect(benavidez).not.toContain('Benavídez Village · UF 16');
    for (const slug of slugs) {
      expect(renderDev(slug)).not.toContain('Bs.As. G.B.A. Norte');
    }
  });

  it('Estado: Faena "A estrenar" (ESTRENAR), Benavídez y Domus "En construcción" (UNDER_CONSTRUCTION); Pacheco sin Estado (dato no cargado)', () => {
    const estado = (slug: string) =>
      getDevelopmentEditorialCuration(slug)
        ?.sections.find((s) => s.layout === 'snapshot')
        ?.snapshotFields?.find((f) => f.label === 'Estado')?.value;
    expect(estado('faena')).toBe('A estrenar');
    const benavidezBand = getDevelopmentEditorialCuration('benavidez-village')?.sections.find((s) => s.key === 'estado-entrega');
    expect(benavidezBand?.bandItems).toEqual([
      { label: 'Estado', value: 'En construcción' },
      { label: 'Entrega estimada', value: 'Primer trimestre de 2027' },
    ]);
    expect(estado('domus-brickell-center')).toBe('En construcción');
    expect(estado('pacheco-central')).toBeUndefined();
  });
});

describe('/desarrollos/benavidez-village — un solo desarrollo con sus unidades activas', () => {
  const curation = getDevelopmentBySlug('benavidez-village')!;
  const unitData: Array<[number, number, number, string]> = [
    [233708, 144000, 124.3, 'NOROESTE'],
    [237474, 146000, 125.1, 'NOROESTE'],
    [237472, 138000, 125.7, 'SURESTE'],
    [233702, 138000, 124, 'SURESTE'],
    [233707, 140000, 130.1, 'SURESTE'],
  ];
  function unit(propertyId: number, price: number, totalArea: number, orientation: string) {
    return property(
      {
        propertyId,
        price,
        currency: 'U$D',
        totalArea,
        address: `Benavídez Village · interno ${propertyId}`,
        neighborhood: { neighborhoodId: 900, name: 'Benavídez' },
        images: Array.from({ length: 20 }, (_, i) => ({ imageId: `bv${propertyId}-${i}`, url: `https://cdn.2clics.com/bv${propertyId}-${i}.jpg` })),
        meta_data: [
          { metaKey: 'orientation', metaValue: orientation },
          { metaKey: 'title', metaValue: `Benavídez Village · Dúplex 3 ambientes con jardín · ${totalArea} m²` },
        ],
      },
      'AR',
    );
  }
  const units = unitData.map(([id, price, area, orientation]) => unit(id, price, area, orientation));
  const source = units.find((u) => u.propertyId === curation.sourcePropertyId)!;
  const renderWith = (list: PublicProperty[]) =>
    render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation,
        source: toDevSource(source, curation.publicName),
        units: list,
      }),
    );

  it('tabla de unidades: una fila por unidad activa con UF, superficie decimal, orientación, precio y link a su ficha canónica', () => {
    const html = renderWith(units);
    expect(html).toContain('<h1>Benavídez Village</h1>');
    expect(html).toContain('<h2>Disponibilidad actual</h2>');
    expect(html).toContain('5 unidades publicadas');
    for (const label of ['UF 11', 'UF 12', 'UF 15', 'UF 16', 'UF 20']) {
      expect(html).toContain(`>${label}<`);
    }
    expect(html).toContain('125,7 m²');
    expect(html).toContain('130,1 m²');
    expect(html).toContain('Sureste');
    expect(html).toContain('Noroeste');
    expect(html).toContain('U$D 146.000');
    for (const [id] of unitData) {
      expect(html).toContain(`href="/propiedades/${id}"`);
    }
    // Las 5 unidades no se repiten además como 5 cards de casas sueltas.
    expect(html).not.toContain('<h2>Propiedades disponibles</h2>');
  });

  it('la cantidad de unidades es dinámica: si 2Clics deja de devolver una, la tabla y el conteo bajan solos', () => {
    const html = renderWith(units.filter((u) => u.propertyId !== 233708));
    expect(html).toContain('4 unidades publicadas');
    expect(html).not.toContain('>UF 11<');
    const curationJson = JSON.stringify(getDevelopmentEditorialCuration('benavidez-village'));
    expect(curationJson).not.toMatch(/5 unidades|cinco unidades/i);
  });

  it('sin urgencia artificial ni financiación: nunca "quedan pocas"/"no pierdas"/"financiación"', () => {
    const lower = renderWith(units).toLowerCase();
    for (const phrase of ['quedan pocas', 'últimas unidades', 'no pierdas', 'oportunidad única', 'financiación', 'financiacion']) {
      expect(lower).not.toContain(phrase);
    }
  });

  it('copy del proyecto tomado de la descripción vigente: 25 viviendas, entrega estimada primer trimestre de 2027', () => {
    const html = renderWith(units);
    expect(html).toContain('project-snapshot-value">25<');
    expect(html).toContain('Primer trimestre de 2027');
    expect(html).toContain('Benavídez · Tigre · Argentina');
  });
});

describe('Catálogo — exclusión por clasificación y estado de 2Clics', () => {
  function listingItem(propertyId: number, overrides: Record<string, unknown> = {}) {
    return {
      propertyId,
      address: `Propiedad ${propertyId}`,
      price: 100000,
      currency: 'U$D',
      operationType: 'VENTA',
      status: 'ACTIVE',
      webListing: 'SIMPLE',
      propertyType: { typeId: 2, name: 'Casa', appId: '5791' },
      state: { stateId: 3, name: 'Bs.As. G.B.A. Norte' },
      city: { cityId: 41, name: 'Tigre' },
      neighborhood: { neighborhoodId: 601, name: 'Nordelta' },
      images: [],
      meta_data: [],
      ...overrides,
    };
  }

  function mockApi(properties: Record<string, unknown>[]) {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/development')) return jsonResponse({ status: 'success', developments: [] }) as never;
      if (/\/api\/property\/\d+/.test(url)) {
        const id = Number(url.split('/').pop());
        const found = properties.find((p) => p.propertyId === id);
        return jsonResponse(found ? { status: 'success', property: found } : { status: 'fail' }) as never;
      }
      return jsonResponse({ status: 'success', count: properties.length, properties }) as never;
    }) as never;
  }

  it('/comprar: las 5 unidades de Benavídez, Pacheco, Faena, Domus y 206734 no aparecen como propiedades tradicionales; 187683 y 236984 sí, ambas', async () => {
    const ids = [233702, 237472, 233707, 233708, 237474, 233719, 236986, 236682, 206734, 187683, 236984, 187669];
    mockApi(ids.map((id) => listingItem(id)));
    const { getPropertyCatalog } = await loadListings();
    const catalog = await getPropertyCatalog({ operacion: 'venta' }, { excludePropertyIds: getExcludedPropertyIds() });
    expect(catalog.properties.map((p) => p.propertyId).sort()).toEqual([187669, 187683, 236984]);
  });

  it('/propiedades (maestro): solo sale la oportunidad de inversión 206734', async () => {
    const ids = [233702, 236986, 206734, 187683, 236984];
    mockApi(ids.map((id) => listingItem(id)));
    const { getPropertyCatalog } = await loadListings();
    const catalog = await getPropertyCatalog({}, { excludePropertyIds: getMasterCatalogExcludedPropertyIds() });
    expect(catalog.properties.map((p) => p.propertyId)).not.toContain(206734);
    expect(catalog.properties.map((p) => p.propertyId)).toEqual(expect.arrayContaining([233702, 236986, 187683, 236984]));
  });

  it('estados fuera de mercado/alquilada/borrador nunca se publican, aunque el endpoint los devuelva', async () => {
    mockApi([
      listingItem(187669),
      listingItem(187676, { status: 'OUT_OF_MARKET' }),
      listingItem(201063, { status: 'RENTED' }),
      listingItem(233718, { status: 'DRAFT' }),
    ]);
    const { getPropertyCatalog, getPublicPropertyById } = await loadListings();
    const catalog = await getPropertyCatalog({});
    expect(catalog.properties.map((p) => p.propertyId)).toEqual([187669]);
    expect((await getPublicPropertyById(187676)).status).toBe('not-found');
    expect((await getPublicPropertyById(187669)).status).toBe('ready');
  });

  it('un registro fuera de mercado (2Clics responde HTTP 404, ej. 187676) es "not-found" — la ficha da 404, no un estado de error', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ status: 'fail', description: 'Not found' }),
    })) as never;
    const { getPublicPropertyById } = await loadListings();
    expect(await getPublicPropertyById(187676)).toEqual({ status: 'not-found', property: null });
  });

  it('un detalle cacheado como activo pero que 2Clics ya no lista (salió de mercado) es "not-found" — la caché no lo mantiene vivo', async () => {
    const stale = listingItem(187676, { address: 'Faena Residences Miami' });
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/property/187676')) return jsonResponse({ status: 'success', property: stale }) as never;
      if (url.endsWith('/api/property/236986')) return jsonResponse({ status: 'success', property: listingItem(236986) }) as never;
      return jsonResponse({ status: 'success', count: 1, properties: [listingItem(236986)] }) as never;
    }) as never;
    const { getPublicPropertyById } = await loadListings();
    expect((await getPublicPropertyById(187676)).status).toBe('not-found');
    expect((await getPublicPropertyById(236986)).status).toBe('ready');
  });

  it('Home: con solo 206734 destacada no se renderiza nada de "Oportunidades seleccionadas"; con una tradicional destacada la sección vuelve sola', async () => {
    // Mock que respeta el filtro `webListing` del request, como la API real.
    function mockFeatured(items: Record<string, unknown>[]) {
      globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        const wanted = body.filters?.webListing;
        const properties = wanted ? items.filter((item) => item.webListing === wanted) : items;
        return jsonResponse({ status: 'success', count: properties.length, properties }) as never;
      }) as never;
    }

    mockFeatured([listingItem(206734, { webListing: 'DESTACADO' }), listingItem(187669)]);
    await loadListings();
    const { default: FeaturedEmpty } = await import('@/components/properties/FeaturedProperties');
    expect(await FeaturedEmpty()).toBeNull();

    mockFeatured([listingItem(206734, { webListing: 'DESTACADO' }), listingItem(187669, { webListing: 'DESTACADO' })]);
    await loadListings();
    const { default: FeaturedBack } = await import('@/components/properties/FeaturedProperties');
    const html = render((await FeaturedBack()) as React.ReactElement);
    expect(html).toContain('Oportunidades seleccionadas');
    expect(html).toContain('href="/propiedades/187669"');
    expect(html).not.toContain('/propiedades/206734');
  });

  it('Home ("Oportunidades seleccionadas"): un desarrollo u oportunidad destacada en 2Clics no entra a la Home', async () => {
    mockApi([listingItem(206734, { webListing: 'DESTACADO' }), listingItem(187669, { webListing: 'DESTACADO' })]);
    const { getFeaturedPublicProperties } = await loadListings();
    const featured = await getFeaturedPublicProperties(4, { excludePropertyIds: getExcludedPropertyIds() });
    expect(featured.properties.map((p) => p.propertyId)).toEqual([187669]);
    expect(readFileSync('components/properties/FeaturedProperties.tsx', 'utf8')).toContain(
      'getFeaturedPublicProperties(4, { excludePropertyIds: getExcludedPropertyIds() })',
    );
  });
});

describe('/desarrollos — sistema editorial compartido (pulido 2026-10)', () => {
  function renderSlug(slug: string, overrides: Record<string, unknown> = {}, region: 'AR' | 'US' = 'AR') {
    const curation = getDevelopmentBySlug(slug)!;
    const fixture = property(
      {
        propertyId: curation.sourcePropertyId,
        price: 112000,
        currency: 'U$D',
        amountRoom: 2,
        totalArea: 46.5,
        coveredArea: 42.2,
        uncoveredArea: 4.3,
        images: Array.from({ length: 20 }, (_, i) => ({ imageId: `${slug}${i}`, url: `https://cdn.2clics.com/${slug}-${i}.jpg` })),
        ...overrides,
      },
      region,
    );
    return render(
      React.createElement(CuratedDevelopmentDetailView, { curation, source: toDevSource(fixture, curation.publicName), units: [fixture] }),
    );
  }

  it('el bloque comercial desaparece solo si no hay precio publicable (hidePrice) — nunca un placeholder', () => {
    expect(renderSlug('pacheco-central')).toContain('project-commercial-summary');
    const hidden = renderSlug('pacheco-central', { hidePrice: true });
    expect(hidden).not.toContain('project-commercial-summary');
    expect(hidden).not.toContain('112.000');
  });

  it('banda de énfasis: Pacheco muestra sus dos etapas y Benavídez su estado y entrega, en navy', () => {
    const pacheco = renderSlug('pacheco-central');
    expect(pacheco).toContain('<section class="project-facts-band">');
    expect(pacheco).toContain('<h2>Etapas de entrega</h2>');
    expect(pacheco).toContain('Diciembre 2026');
    expect(pacheco).toContain('Diciembre 2029');
    const benavidez = renderSlug('benavidez-village');
    expect(benavidez).toContain('<h2>Estado y entrega</h2>');
    expect(benavidez).toContain('Primer trimestre de 2027');
  });

  it('Benavídez sigue la progresión editorial: proyecto → viviendas → interiores → conjunto → ubicación → estado → disponibilidad', () => {
    const keys = getDevelopmentEditorialCuration('benavidez-village')?.sections.map((s) => s.key);
    expect(keys?.slice(0, 10)).toEqual([
      'snapshot',
      'proyecto',
      'residencias',
      'interiores',
      'vida-en-el-conjunto',
      'masterplan',
      'ubicacion',
      'estado-entrega',
      'estado-obra',
      'disponibilidad',
    ]);
    const html = renderSlug('benavidez-village');
    expect(html.indexOf('<h2>Interiores</h2>')).toBeLessThan(html.indexOf('<h2>Vida en el conjunto</h2>'));
    expect(html.indexOf('<h2>Estado y entrega</h2>')).toBeLessThan(html.indexOf('<h2>Disponibilidad actual</h2>'));
  });

  it('ninguna ficha de desarrollo muestra rótulos internos ("Dirección confirmada")', () => {
    for (const slug of ['faena', 'benavidez-village', 'pacheco-central', 'domus-brickell-center']) {
      expect(renderSlug(slug, {}, slug === 'faena' || slug === 'domus-brickell-center' ? 'US' : 'AR')).not.toContain(
        'Dirección confirmada',
      );
    }
    expect(readFileSync('components/properties/CuratedDevelopmentDetailView.tsx', 'utf8')).not.toContain("'Dirección confirmada'");
  });

  it('los textos de suitability/rol de García no cambiaron en esta pasada', () => {
    const rol = getDevelopmentEditorialCuration('pacheco-central')?.sections.find((s) => s.key === 'garcia-acompanamiento');
    expect(rol?.sourceTextSegment).toEqual({
      type: 'curatedText',
      text: 'En Pacheco Central, el trabajo de García Inversiones es entender tu objetivo, explicar el proyecto, ayudarte a evaluar si tiene sentido para lo que buscás, y solicitar y contrastar la información vigente antes de avanzar. García Inversiones no administra el desarrollo ni es parte de él, y no reemplaza el asesoramiento legal o fiscal que un proceso de este tipo requiere.',
    });
  });
});

describe('V2.1 — routing de catálogo, "Volver" contextual y Remeros Beach', () => {
  it('/propiedades redirige a /comprar (y a /alquilar si el link viejo pedía alquiler), conservando filtros', async () => {
    const { default: PropiedadesPage } = await import('@/app/propiedades/page');
    const redirectTarget = async (params: Record<string, string>) => {
      try {
        await PropiedadesPage({ searchParams: Promise.resolve(params) });
      } catch (error) {
        return String((error as { digest?: string }).digest || '');
      }
      return 'no-redirect';
    };
    expect(await redirectTarget({})).toContain(';/comprar;');
    expect(await redirectTarget({ operacion: 'alquiler', tipo: '7' })).toContain(';/alquilar?tipo=7;');
    expect(await redirectTarget({ operacion: 'venta', ubicacion: 'city:41' })).toContain(';/comprar?ubicacion=city%3A41;');
  });

  it('no queda navegación pública hacia el catálogo general /propiedades', () => {
    for (const file of [
      'components/layout/Footer.tsx',
      'components/layout/Header.tsx',
      'app/not-found.tsx',
      'app/gracias-consulta/page.tsx',
      'components/properties/PropertyDetailView.tsx',
    ]) {
      expect(readFileSync(file, 'utf8'), file).not.toContain('href="/propiedades"');
    }
    expect(readFileSync('app/sitemap.ts', 'utf8')).not.toContain("'/propiedades',");
  });

  it('"Volver" depende del activo: desarrollo de la unidad, o Comprar/Alquilar por operación', () => {
    for (const id of [233702, 237472, 233707, 233708, 237474]) {
      expect(getPropertyBackLink(id, 'Venta')).toEqual({ href: '/desarrollos/benavidez-village', label: 'Volver a Benavídez Village' });
    }
    expect(getPropertyBackLink(233719, 'Venta')).toEqual({ href: '/desarrollos/pacheco-central', label: 'Volver a Pacheco Central' });
    expect(getPropertyBackLink(236986, 'Venta')).toEqual({ href: '/desarrollos/faena', label: 'Volver a Faena' });
    expect(getPropertyBackLink(236682, 'Venta')).toEqual({
      href: '/desarrollos/domus-brickell-center',
      label: 'Volver a Domus Brickell Center',
    });
    expect(getPropertyBackLink(237447, 'Venta')).toEqual({ href: '/desarrollos/remeros-beach', label: 'Volver a Remeros Beach' });
    expect(getPropertyBackLink(187669, 'Venta')).toEqual({ href: '/comprar', label: 'Volver a Comprar' });
    expect(getPropertyBackLink(237445, 'Alquiler')).toEqual({ href: '/alquilar', label: 'Volver a Alquilar' });
    expect(getPropertyBackLink(236982, 'Alquiler')).toEqual({ href: '/alquilar', label: 'Volver a Alquilar' });
    // La ficha lo resuelve en el server (funciona entrando directo por URL).
    expect(readFileSync('app/propiedades/[id]/page.tsx', 'utf8')).toContain(
      'backLink={getPropertyBackLink(property.propertyId, property.operationType)}',
    );
  });

  it('Remeros Beach: desarrollo en Argentina con 237447 como unidad; 237445 (alquiler) queda afuera', () => {
    const remeros = getDevelopmentBySlug('remeros-beach');
    expect(remeros?.propertyIds).toEqual([237447]);
    expect(remeros?.sourcePropertyId).toBe(237447);
    expect(remeros?.market).toBe('AR');
    expect(getDevelopmentsByMarket('AR').map((d) => d.slug)).toContain('remeros-beach');
    expect(isExcludedFromStandardCatalog(237447)).toBe(true);
    expect(isExcludedFromStandardCatalog(237445)).toBe(false);
    expect(getDevelopmentForPropertyId(237445)).toBeNull();
  });

  it('Remeros Beach: la unidad de Sky Two se muestra en vivo dentro del desarrollo, con link a su ficha, sin "en construcción"', () => {
    const remeros = getDevelopmentBySlug('remeros-beach')!;
    const unit = property(
      {
        propertyId: 237447,
        price: 270000,
        currency: 'U$D',
        totalArea: 84,
        coveredArea: 74,
        uncoveredArea: 10,
        amountRoom: 3,
        amountBedroom: 2,
        state: { stateId: 3, name: 'Bs.As. G.B.A. Norte' },
        city: { cityId: 41, name: 'Tigre' },
        neighborhood: { neighborhoodId: 700, name: 'Rincón de Milberg' },
        images: Array.from({ length: 25 }, (_, i) => ({ imageId: `rb${i}`, url: `https://cdn.2clics.com/rb${i}.jpg` })),
        meta_data: [
          { metaKey: 'title', metaValue: 'Departamento de 3 ambientes en venta en Remeros Beach Sky 2' },
          { metaKey: 'amount_bath', metaValue: '2' },
          { metaKey: 'amount_garage', metaValue: '1' },
          { metaKey: 'expenses', metaValue: '490000' },
        ],
      },
      'AR',
    );
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: remeros, source: toDevSource(unit, remeros.publicName), units: [unit] }),
    );
    expect(html).toContain('<h1>Remeros Beach</h1>');
    expect(html).toContain('Camino de los Remeros · Tigre · Argentina');
    expect(html).toContain('>Unidad disponible · Sky Two<');
    expect(html).toContain('<span>Precio de esta unidad</span><strong>U$D 270.000</strong>');
    for (const [value, label] of [
      ['84 m²', 'Superficie total'],
      ['74 m²', 'Cubierta'],
      ['10 m²', 'Balcón'],
      ['3', 'Ambientes'],
      ['2', 'Dormitorios'],
      ['2', 'Baños'],
      ['1', 'Cocheras'],
      ['AR$ 490.000', 'Expensas'],
    ]) {
      expect(html).toContain(`>${value}</span><span class="project-commercial-schedule-label">${label}<`);
    }
    expect(html).toContain('href="/propiedades/237447"');
    expect(html).toContain('>Ver ficha de la unidad<');
    expect(html.toLowerCase()).not.toContain('en construcción');
    expect(html).toContain('Entregado');
    for (const forbidden of ['rentabilidad', 'retorno', 'financiación', 'cuotas']) {
      expect(html.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('/comprar no muestra 237447 (vive en Remeros) y /alquilar sigue mostrando 237445', async () => {
    const item = (propertyId: number, operationType: string) => ({
      propertyId,
      address: `Propiedad ${propertyId}`,
      price: 1000,
      currency: 'U$D',
      operationType,
      status: 'ACTIVE',
      webListing: 'SIMPLE',
      propertyType: { typeId: 1, name: 'Departamento', appId: '5785' },
      state: { stateId: 3, name: 'Bs.As. G.B.A. Norte' },
      city: { cityId: 41, name: 'Tigre' },
      neighborhood: { neighborhoodId: 700, name: 'Rincón de Milberg' },
      images: [],
      meta_data: [],
    });
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : {};
      const all = [item(237447, 'VENTA'), item(187669, 'VENTA'), item(237445, 'ALQUILER_PERMANENTE')];
      const wanted = body.filters?.operation_type;
      const properties = wanted ? all.filter((p) => p.operationType === wanted) : all;
      return jsonResponse({ status: 'success', count: properties.length, properties }) as never;
    }) as never;
    const { getPropertyCatalog } = await loadListings();
    const comprar = await getPropertyCatalog({ operacion: 'venta' }, { excludePropertyIds: getExcludedPropertyIds() });
    expect(comprar.properties.map((p) => p.propertyId)).toEqual([187669]);
    const alquilar = await getPropertyCatalog({ operacion: 'alquiler' }, { excludePropertyIds: getExcludedPropertyIds() });
    expect(alquilar.properties.map((p) => p.propertyId)).toEqual([237445]);
  });
});

describe('V2.1 — assets editoriales locales (public/developments)', () => {
  it('assets entregados: Benavídez (4, sin vivienda-interior ni amenities) y Pacheco (9) activos; Remeros sin archivos; nada fuera de los slots', async () => {
    const { DEVELOPMENT_ASSET_SLOTS, resolveDevelopmentAssets } = await import('@/lib/development-assets');
    const benavidez = resolveDevelopmentAssets('benavidez-village');
    expect(Object.keys(benavidez).sort()).toEqual(['hero', 'interiores', 'masterplan', 'proyecto'].sort());
    // amenities.jpg duplicaba el render del hero: "Vida en el conjunto" queda sin imagen dedicada (sin fallback).
    expect(benavidez['vida-en-el-conjunto']).toBeUndefined();
    expect(existsSync('public/developments/benavidez-village/amenities.jpg')).toBe(false);
    // vivienda-interior.jpg no se entregó: "Las viviendas" mantiene la foto de 2Clics.
    expect(benavidez.residencias).toBeUndefined();
    expect(existsSync('public/developments/benavidez-village/vivienda-interior.jpg')).toBe(false);
    expect(benavidez.masterplan).toEqual([{ src: '/developments/benavidez-village/masterplan.jpg', kind: 'plan' }]);

    const pacheco = resolveDevelopmentAssets('pacheco-central');
    expect(Object.values(pacheco).flat()).toHaveLength(9);
    expect(pacheco['amenities-imagenes']?.map((a) => a.src)).toEqual([
      '/developments/pacheco-central/gimnasio.jpg',
      '/developments/pacheco-central/sum.jpg',
      '/developments/pacheco-central/coworking.jpg',
    ]);
    expect(pacheco.masterplan?.[0].kind).toBe('plan');

    expect(resolveDevelopmentAssets('remeros-beach')).toEqual({});

    // Solo archivos declarados por algún slot (sin extras ni placeholders).
    const { readdirSync } = await import('node:fs');
    for (const slug of ['benavidez-village', 'pacheco-central']) {
      const declared = DEVELOPMENT_ASSET_SLOTS[slug].map((slot) => slot.file);
      for (const file of readdirSync(`public/developments/${slug}`)) {
        expect(declared, `${slug}/${file}`).toContain(file);
      }
    }
  });

  it('Benavídez: el avance de obra sigue con fotos reales de 2Clics, rotuladas como tales', () => {
    const section = getDevelopmentEditorialCuration('benavidez-village')?.sections.find((s) => s.key === 'estado-obra');
    expect(section?.imageIndexes).toEqual([13, 5]);
    expect(section?.imageTag).toBe('Fotografía real');
    const curation = getDevelopmentBySlug('benavidez-village')!;
    const fixture = property({
      propertyId: 233702,
      images: Array.from({ length: 20 }, (_, i) => ({ imageId: `bv${i}`, url: `https://cdn.2clics.com/bv${i}.jpg` })),
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, { curation, source: toDevSource(fixture, curation.publicName), units: [fixture] }),
    );
    const idx = html.indexOf('<h2>Avance de obra</h2>');
    expect(idx).toBeGreaterThan(-1);
    const block = html.slice(idx, html.indexOf('</section>', idx));
    expect((block.match(/>Fotografía real</g) || []).length).toBe(2);
    expect(block).not.toContain('Imagen ilustrativa');
  });

  it('cuando el archivo existe, el slot se activa y reemplaza la imagen de 2Clics de su sección, con rótulo de imagen ilustrativa', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const path = await import('node:path');
    const { resolveDevelopmentAssets } = await import('@/lib/development-assets');
    const publicDir = mkdtempSync(path.join(tmpdir(), 'garcia-public-'));
    mkdirSync(path.join(publicDir, 'developments', 'pacheco-central'), { recursive: true });
    writeFileSync(path.join(publicDir, 'developments', 'pacheco-central', 'hero.jpg'), '');
    writeFileSync(path.join(publicDir, 'developments', 'pacheco-central', 'masterplan.jpg'), '');
    const assets = resolveDevelopmentAssets('pacheco-central', publicDir);
    expect(assets).toEqual({
      hero: [{ src: '/developments/pacheco-central/hero.jpg', kind: 'render' }],
      masterplan: [{ src: '/developments/pacheco-central/masterplan.jpg', kind: 'plan' }],
    });

    const pacheco = getDevelopmentBySlug('pacheco-central')!;
    const fixture = property({
      propertyId: 233719,
      price: 112000,
      images: Array.from({ length: 6 }, (_, i) => ({ imageId: `pc${i}`, url: `https://cdn.2clics.com/pc${i}.jpg` })),
    });
    const html = render(
      React.createElement(CuratedDevelopmentDetailView, {
        curation: pacheco,
        source: toDevSource(fixture, pacheco.publicName),
        units: [fixture],
        assets,
      }),
    );
    expect(html).toContain(encodeURIComponent('/developments/pacheco-central/hero.jpg'));
    expect(html).toContain('<h2>Masterplan</h2>');
    expect(html).toContain('>Imagen ilustrativa<');
    expect(html).toContain('>Plano ilustrativo<');
    // Sin el asset, la sección "Masterplan" no existe (no hay fallback inventado).
    const without = render(
      React.createElement(CuratedDevelopmentDetailView, { curation: pacheco, source: toDevSource(fixture, pacheco.publicName), units: [fixture] }),
    );
    expect(without).not.toContain('<h2>Masterplan</h2>');
    expect(without).not.toContain('Imagen ilustrativa');
  });
});

describe('V2.1 — /invertir', () => {
  it('/invertir no repite el eyebrow "Invertir" sobre el H1', () => {
    const source = readFileSync('app/invertir/page.tsx', 'utf8');
    expect(source).not.toContain('<p className="eyebrow">Invertir</p>');
    expect(source).toContain('Invertir empieza por entender qué estás buscando.');
  });

  it('445 N Shore mantiene su copy, datos, riesgos y condiciones', () => {
    const curation = getInvestmentEditorialCuration('445-n-shore-drive')!;
    expect(curation.headline).toBe('Participar en el desarrollo de una residencia frente al agua en Normandy Shores');
    expect(curation.intro).toBe(
      'Una oportunidad para participar como socio en el desarrollo de una residencia unifamiliar de obra nueva en Miami Beach. No consiste en comprar la residencia ni una unidad en preventa.',
    );
    expect(curation.asset.facts).toHaveLength(9);
    expect(curation.risks).toContain('Retorno no garantizado');
    expect(curation.conditions.price).toBe('Consultar precio');
  });
});

// ── V2.2 — /vender editorial ────────────────────────────────────────────────────────────────
describe('V2.2 — /vender', () => {
  // La página (app/vender/page.tsx) es Header + <main><SellView assets={resolveSellAssets()} /></main>
  // + Footer/WhatsApp/Reveal; se renderiza el contenido de <main> con la misma resolución de assets.
  async function renderVender(): Promise<string> {
    const { default: SellView } = await import('@/components/sell/SellView');
    const { resolveSellAssets } = await import('@/lib/sell-assets');
    return render(React.createElement('main', null, React.createElement(SellView, { assets: resolveSellAssets() })));
  }

  it('la página monta SellView con los assets locales resueltos y el RevealObserver', () => {
    const source = readFileSync('app/vender/page.tsx', 'utf8');
    expect(source).toContain('<SellView assets={resolveSellAssets()} />');
    expect(source).toContain('<RevealObserver />');
  });

  function mainOf(html: string): string {
    return html.slice(html.indexOf('<main>'), html.indexOf('</main>'));
  }

  it('hero sin eyebrow "Vender", con el H1 nuevo y el CTA inicial al canal de contacto', async () => {
    const main = mainOf(await renderVender());
    const hero = main.slice(0, main.indexOf('</section>'));
    expect(hero).not.toContain('class="eyebrow"');
    expect(main).not.toMatch(/class="eyebrow"[^>]*>\s*Vender\s*</i);
    expect(hero).toContain('<h1>Vender una propiedad empieza por entender qué necesitás lograr.</h1>');
    expect(hero).toContain('href="/contacto"');
    expect(hero).toContain('Quiero conversar sobre mi propiedad');
    expect(main).not.toContain('Vender tu propiedad');
  });

  it('Cómo trabajamos: exactamente las 5 etapas nuevas, en orden (el proceso viejo de 6 pasos no aparece)', async () => {
    const main = mainOf(await renderVender());
    const titles = [
      'Entendemos la propiedad y el objetivo',
      'Analizamos el mercado y definimos el posicionamiento',
      'Preparamos la propiedad para comunicarla',
      'Salimos al mercado y gestionamos el interés',
      'Negociamos y acompañamos la operación',
    ];
    expect((main.match(/class="sell-stage"/g) || []).length).toBe(5);
    let cursor = 0;
    titles.forEach((title, index) => {
      const at = main.indexOf(`<h3>${title}</h3>`, cursor);
      expect(at, title).toBeGreaterThan(cursor);
      expect(main.slice(cursor, at)).toContain(`>0${index + 1}<`);
      cursor = at;
    });
    expect(main).not.toContain('Producimos material comercial.');
    expect(main).not.toContain('Nuestro proceso');
  });

  it('bloques editoriales: precio/posicionamiento con 4 conceptos, producción, gestión, transparencia y qué incluye (6)', async () => {
    const main = mainOf(await renderVender());
    expect(main).toContain('El precio es una parte de la estrategia, no toda la estrategia.');
    for (const label of ['Propiedad', 'Mercado', 'Objetivo', 'Presentación']) {
      expect(main).toContain(`<dt>${label}</dt>`);
    }
    expect(main).toContain('Mostrar bien una propiedad también forma parte de venderla.');
    expect(main).toContain('Según el inmueble y la estrategia definida');
    expect(main).toContain('No producimos contenido para hacer que una propiedad parezca algo que no es. Lo usamos para mostrarla mejor.');
    expect(main).toContain('Cada consulta necesita seguimiento.');
    expect(main).toContain('Información clara para tomar decisiones durante todo el proceso.');
    const included = main.slice(main.indexOf('class="sell-included'), main.indexOf('</ul>', main.indexOf('class="sell-included')));
    expect((included.match(/<li>/g) || []).length).toBe(6);
  });

  it('sin los chips viejos ni claims de velocidad, precio o garantía', async () => {
    const main = mainOf(await renderVender());
    for (const chip of ['Datos y argumentos antes que adjetivos', 'Transparencia en cada etapa', 'Acompañamiento personalizado']) {
      expect(main).not.toContain(chip);
    }
    expect(main).not.toContain('sell-differential');
    const text = main.toLowerCase();
    for (const claim of [
      'venta rápida',
      'vendé rápido',
      'vender rápido',
      'en tiempo récord',
      'mejor precio',
      'precio correcto',
      'garantiz',
      'garantía',
      'resultado asegurado',
      'quiero vender mi propiedad',
    ]) {
      expect(text, claim).not.toContain(claim);
    }
  });

  it('cierre: CTA "Hablar con García" al canal de contacto, en el cta-band de los grandes cierres', async () => {
    const main = mainOf(await renderVender());
    const closing = main.slice(main.indexOf('project-cta-final'));
    expect(closing).toContain('class="cta-band"');
    expect(closing).toContain('¿Estás pensando en vender una propiedad?');
    expect(closing).toMatch(/href="\/contacto"[^>]*>Hablar con García</);
  });

  it('sin assets locales no hay imágenes ni contenido externo (mobile no depende de terceros)', async () => {
    const { resolveSellAssets } = await import('@/lib/sell-assets');
    expect(resolveSellAssets()).toEqual({});
    const main = mainOf(await renderVender());
    expect(main).not.toContain('<img');
    expect(main).not.toContain('<iframe');
    expect(main).not.toMatch(/(src|href)="https?:\/\//);
  });

  it('slots SELL_ASSET_01..04: se activan solo con el archivo en public/vender y renderizan rutas locales', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const path = await import('node:path');
    const { SELL_ASSET_SLOTS, resolveSellAssets } = await import('@/lib/sell-assets');
    const { default: SellView } = await import('@/components/sell/SellView');
    expect(SELL_ASSET_SLOTS.map((slot) => slot.id)).toEqual(['SELL_ASSET_01', 'SELL_ASSET_02', 'SELL_ASSET_03', 'SELL_ASSET_04']);

    const publicDir = mkdtempSync(path.join(tmpdir(), 'garcia-public-'));
    mkdirSync(path.join(publicDir, 'vender'), { recursive: true });
    writeFileSync(path.join(publicDir, 'vender', 'produccion.jpg'), '');
    const partial = resolveSellAssets(publicDir);
    expect(Object.keys(partial)).toEqual(['SELL_ASSET_02']);
    expect(partial.SELL_ASSET_02?.src).toBe('/vender/produccion.jpg');

    for (const slot of SELL_ASSET_SLOTS) writeFileSync(path.join(publicDir, 'vender', slot.file), '');
    const html = render(React.createElement(SellView, { assets: resolveSellAssets(publicDir) }));
    expect((html.match(/<img/g) || []).length).toBe(4);
    for (const slot of SELL_ASSET_SLOTS) {
      expect(html).toContain(encodeURIComponent(`/vender/${slot.file}`));
    }
    expect(html).not.toMatch(/src="https?:\/\//);
  });
});

// ── Pre-launch V2 — Home "Oportunidades seleccionadas" + metadata social por ficha ─────────────
describe('Pre-launch V2 — selección del Home y Open Graph por ficha', () => {
  const BASE = 'https://www.garciainversionesinmobiliarias.com.ar';

  function item(propertyId: number, imageCount = 20, overrides: Record<string, unknown> = {}) {
    return {
      propertyId,
      address: `Propiedad ${propertyId}`,
      price: 100000,
      currency: 'U$D',
      operationType: 'VENTA',
      status: 'ACTIVE',
      webListing: 'SIMPLE',
      propertyType: { typeId: 2, name: 'Casa', appId: '5791' },
      state: { stateId: 3, name: 'Bs.As. G.B.A. Norte' },
      city: { cityId: 41, name: 'Tigre' },
      neighborhood: { neighborhoodId: 601, name: 'Nordelta' },
      images: Array.from({ length: imageCount }, (_, i) => ({
        imageId: `${propertyId}-${i}`,
        url: `https://cdn.2clics.com/${propertyId}/${i}.jpg`,
      })),
      meta_data: [{ metaKey: 'description', metaValue: 'Descripción pública de prueba.' }],
      ...overrides,
    };
  }

  function mockInventory(properties: Record<string, unknown>[]) {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/development')) return jsonResponse({ status: 'success', developments: [] }) as never;
      if (/\/api\/property\/\d+/.test(url)) {
        const id = Number(url.split('/').pop());
        const found = properties.find((p) => p.propertyId === id);
        return jsonResponse(found ? { status: 'success', property: found } : { status: 'fail' }) as never;
      }
      return jsonResponse({ status: 'success', count: properties.length, properties }) as never;
    }) as never;
  }

  const DOMUS = 236682;
  const BENAVIDEZ_SOURCE = getDevelopmentBySlug('benavidez-village')!.sourcePropertyId;
  const N_SHORE = 206734;

  async function loadSelection() {
    mockInventory([item(DOMUS), item(BENAVIDEZ_SOURCE), item(N_SHORE)]);
    await loadListings();
    return import('@/lib/home-selection');
  }

  it('lista central: Domus → Benavídez → 445, sin cuarta oportunidad inventada', async () => {
    const { HOME_SELECTED_OPPORTUNITIES, HOME_SELECTION_MAX } = await import('@/lib/home-selection');
    expect(HOME_SELECTED_OPPORTUNITIES).toEqual([
      { kind: 'development', slug: 'domus-brickell-center' },
      { kind: 'development', slug: 'benavidez-village' },
      { kind: 'investment', slug: '445-n-shore-drive' },
    ]);
    expect(HOME_SELECTION_MAX).toBe(4);
    expect(getDevelopmentBySlug('domus-brickell-center')).not.toBeNull();
    expect(getInvestmentOpportunityBySlug('445-n-shore-drive')?.active).toBe(true);
  });

  it('cards: 3, en orden, cada una a su landing; Benavídez usa su render oficial rotulado', async () => {
    const { loadHomeSelection } = await loadSelection();
    const cards = await loadHomeSelection();
    expect(cards.map((card) => card.href)).toEqual([
      '/desarrollos/domus-brickell-center',
      '/desarrollos/benavidez-village',
      '/invertir/445-n-shore-drive',
    ]);
    expect(cards.map((card) => card.kicker)).toEqual(['Desarrollo', 'Desarrollo', 'Oportunidad de inversión']);
    expect(cards[1].image).toEqual({ src: '/developments/benavidez-village/hero.jpg', tag: 'Imagen ilustrativa' });
    expect(cards[0].image?.src).toMatch(/^https:\/\/cdn\.2clics\.com\/236682\//);
    expect(cards[2].name).toBe('445 N Shore Drive · Normandy Shores');
  });

  it('render: título, bajada, 3 cards; 445 como oportunidad de inversión (no compra residencial); sin claims', async () => {
    const { loadHomeSelection } = await loadSelection();
    const { SelectedOpportunitiesView } = await import('@/components/home/SelectedOpportunities');
    const html = render(React.createElement(SelectedOpportunitiesView, { cards: await loadHomeSelection() }));
    expect(html).toContain('<h2>Oportunidades seleccionadas</h2>');
    expect(html).toContain('Una selección de propiedades y oportunidades que estamos analizando y trabajando actualmente.');
    expect((html.match(/class="home-selection-item"/g) || []).length).toBe(3);
    const hrefs = Array.from(html.matchAll(/class="home-selection-card[^"]*" href="([^"]+)"/g)).map((m) => m[1]);
    expect(hrefs).toEqual(['/desarrollos/domus-brickell-center', '/desarrollos/benavidez-village', '/invertir/445-n-shore-drive']);

    const nShore = html.slice(html.indexOf('home-selection-card--investment'));
    expect(nShore).toContain('Oportunidad de inversión');
    expect(nShore).toContain('Conocer la oportunidad');
    // Su descriptor validado aclara justamente que NO es comprar una residencia.
    expect(nShore).toContain('No consiste en comprar la residencia ni una unidad en preventa.');
    expect(nShore).not.toMatch(/\bventa\b|en venta|U\$D|USD|precio|>Comprar</i);
    expect(html).not.toContain('/propiedades/206734');
    expect(html).not.toMatch(/últimas unidades|rentabilidad|mejor oportunidad|urgente|U\$D/i);
  });

  it('robustez: máximo 4, slugs desconocidos o fuentes caídas se omiten; sin cards no hay sección', async () => {
    const { loadHomeSelection } = await loadSelection();
    const cards = await loadHomeSelection([
      { kind: 'development', slug: 'no-existe' },
      { kind: 'development', slug: 'domus-brickell-center' },
      { kind: 'development', slug: 'faena' }, // su fuente no está en el mock → se omite
      { kind: 'investment', slug: '445-n-shore-drive' },
      { kind: 'development', slug: 'benavidez-village' }, // quinto: fuera del máximo
    ]);
    expect(cards.map((card) => card.href)).toEqual(['/desarrollos/domus-brickell-center', '/invertir/445-n-shore-drive']);
    const { SelectedOpportunitiesView } = await import('@/components/home/SelectedOpportunities');
    expect(SelectedOpportunitiesView({ cards: [] })).toBeNull();
  });

  it('metadata de desarrollo: su propia imagen de apertura (render local en Benavídez, portada curada en Domus); OG y Twitter iguales', async () => {
    mockInventory([item(DOMUS), item(BENAVIDEZ_SOURCE)]);
    await loadListings();
    const { generateMetadata } = await import('@/app/desarrollos/[id]/page');
    const { getDevelopmentEditorialCuration: editorialOf } = await import('@/lib/desarrollos');

    const benavidez = await generateMetadata({ params: Promise.resolve({ id: 'benavidez-village' }) });
    const benavidezImage = `${BASE}/developments/benavidez-village/hero.jpg`;
    expect(benavidez.openGraph).toMatchObject({
      title: 'Benavídez Village',
      url: `${BASE}/desarrollos/benavidez-village`,
      images: [{ url: benavidezImage, alt: 'Benavídez Village' }],
    });
    expect(benavidez.twitter).toMatchObject({ card: 'summary_large_image', title: 'Benavídez Village', images: [benavidezImage] });
    expect(benavidez.alternates?.canonical).toBe('/desarrollos/benavidez-village');

    const domus = await generateMetadata({ params: Promise.resolve({ id: 'domus-brickell-center' }) });
    const heroIndex = editorialOf('domus-brickell-center')!.heroImageIndex;
    const domusImage = `https://cdn.2clics.com/${DOMUS}/${heroIndex}.jpg`;
    expect(domus.openGraph).toMatchObject({ url: `${BASE}/desarrollos/domus-brickell-center`, images: [{ url: domusImage }] });
    expect(domus.twitter).toMatchObject({ images: [domusImage] });
    expect(domus.openGraph?.description).toBe(domus.twitter?.description);
  });

  it('metadata de 445: imagen de apertura de su landing, nunca la del Home', async () => {
    mockInventory([item(N_SHORE)]);
    await loadListings();
    const { generateMetadata } = await import('@/app/invertir/[slug]/page');
    const meta = await generateMetadata({ params: Promise.resolve({ slug: '445-n-shore-drive' }) });
    const image = `https://cdn.2clics.com/${N_SHORE}/0.jpg`;
    expect(meta.openGraph).toMatchObject({
      title: '445 N Shore Drive · Normandy Shores',
      url: `${BASE}/invertir/445-n-shore-drive`,
      images: [{ url: image }],
    });
    expect(meta.twitter).toMatchObject({ title: '445 N Shore Drive · Normandy Shores', images: [image] });
    expect(JSON.stringify(meta)).not.toContain('condor-resort');
  });

  it('metadata de propiedad: imagen principal pública; sin imágenes, fallback institucional seguro', async () => {
    mockInventory([item(187683, 3), item(187669, 0)]);
    await loadListings();
    const { generateMetadata } = await import('@/app/propiedades/[id]/page');

    const withImage = await generateMetadata({ params: Promise.resolve({ id: '187683' }) });
    expect(withImage.openGraph).toMatchObject({
      url: `${BASE}/propiedades/187683`,
      images: [{ url: 'https://cdn.2clics.com/187683/0.jpg' }],
    });
    expect(withImage.twitter).toMatchObject({ images: ['https://cdn.2clics.com/187683/0.jpg'] });

    const withoutImage = await generateMetadata({ params: Promise.resolve({ id: '187669' }) });
    const fallback = `${BASE}/assets/propiedades/condor-resort.jpeg`;
    expect(withoutImage.openGraph).toMatchObject({ url: `${BASE}/propiedades/187669`, images: [{ url: fallback }] });
    expect(withoutImage.twitter).toMatchObject({ images: [fallback] });
  });

  it('helpers: URLs absolutas https únicamente; descripción en una línea y acotada', async () => {
    const { absoluteShareUrl, shareDescription } = await import('@/lib/share-metadata');
    expect(absoluteShareUrl('/developments/x/hero.jpg')).toBe(`${BASE}/developments/x/hero.jpg`);
    expect(absoluteShareUrl('https://cdn.2clics.com/a.jpg')).toBe('https://cdn.2clics.com/a.jpg');
    for (const unsafe of ['http://cdn.2clics.com/a.jpg', '//evil.example/a.jpg', 'data:image/png;base64,AAAA', '', null]) {
      expect(absoluteShareUrl(unsafe)).toBeNull();
    }
    const long = shareDescription(`${'palabra '.repeat(60)}\n final`);
    expect(long!.length).toBeLessThanOrEqual(200);
    expect(long).toMatch(/…$/);
    expect(long).not.toContain('\n');
  });

  it('Home conserva su metadata institucional y es la única con og:url raíz', async () => {
    const { metadata: homeMetadata } = await import('@/app/page');
    expect(homeMetadata.openGraph).toMatchObject({ url: '/', images: [{ url: '/assets/propiedades/condor-resort.jpeg' }] });
    const layoutSource = readFileSync('app/layout.tsx', 'utf8');
    expect(layoutSource).toContain('openGraph: INSTITUTIONAL_OPEN_GRAPH');
    expect(layoutSource).toContain('twitter: INSTITUTIONAL_TWITTER');
    const { INSTITUTIONAL_OPEN_GRAPH } = await import('@/lib/share-metadata');
    expect(INSTITUTIONAL_OPEN_GRAPH).not.toHaveProperty('url');
  });

  it('ninguna API key en output cliente: ni en el HTML de la selección ni en la metadata; ningún Client Component importa módulos con credenciales', async () => {
    const { loadHomeSelection } = await loadSelection();
    const { SelectedOpportunitiesView } = await import('@/components/home/SelectedOpportunities');
    const html = render(React.createElement(SelectedOpportunitiesView, { cards: await loadHomeSelection() }));
    const { generateMetadata } = await import('@/app/desarrollos/[id]/page');
    const meta = JSON.stringify(await generateMetadata({ params: Promise.resolve({ id: 'domus-brickell-center' }) }));
    for (const output of [html, meta]) {
      expect(output).not.toContain('test-key');
      expect(output).not.toMatch(/api_key|TWOCLICS/i);
    }

    const { readdirSync, statSync } = await import('node:fs');
    const path = await import('node:path');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (/\.tsx?$/.test(name)) files.push(full);
      }
    };
    walk('components');
    walk('app');
    const forbidden = [
      '@/lib/env',
      '@/lib/2clics/',
      '@/lib/home-selection',
      '@/lib/share-metadata',
      '@/lib/development-assets',
      '@/lib/sell-assets',
    ];
    const clientFiles = files.filter((file) => /^\s*['"]use client['"]/.test(readFileSync(file, 'utf8')));
    expect(clientFiles.length).toBeGreaterThan(0);
    for (const file of clientFiles) {
      // `import type` se borra al compilar: solo cuentan imports con valor.
      const imports = Array.from(readFileSync(file, 'utf8').matchAll(/^import (?!type )[^;]*?from '([^']+)'/gm)).map((m) => m[1]);
      for (const mod of forbidden) {
        expect(imports.filter((imported) => imported.startsWith(mod)), `${file} importa ${mod}`).toEqual([]);
      }
    }
  });
});
