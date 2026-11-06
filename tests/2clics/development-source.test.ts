import React from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CuratedDevelopmentCard from '@/components/properties/CuratedDevelopmentCard';
import CuratedDevelopmentDetailView from '@/components/properties/CuratedDevelopmentDetailView';
import { adaptPublicProperty } from '@/lib/2clics/adapters';
import type { PublicProperty } from '@/lib/2clics/types';
import type { SinglePropertyResult } from '@/lib/2clics/listings';
import {
  getDevelopmentFallbackLocation,
  pickDevelopmentSource,
  resolveDevelopmentUnitRows,
} from '@/lib/desarrollos';
import { loadCuratedEntry, loadDevelopment } from '@/lib/development-source';
import { resolveDevelopmentAssets } from '@/lib/development-assets';
import { DEVELOPMENTS, PUBLIC_DEVELOPMENTS, getDevelopmentBySlug } from '@/lib/site-curation';
import type { DevelopmentCuration } from '@/lib/site-curation';

// El índice/ficha/Home consultan 2Clics solo a través de `getPublicPropertyById`: se controla acá.
const lookups = vi.hoisted(() => ({ results: new Map<number, SinglePropertyResult>() }));
vi.mock('@/lib/2clics/listings', () => ({
  getPublicPropertyById: async (id: number) => lookups.results.get(id) || { status: 'not-found', property: null },
  getPublicDevelopmentById: async () => ({ status: 'not-found', development: null }),
}));

const render = (node: React.ReactElement) => renderToStaticMarkup(node);

function liveProperty(propertyId: number, region: 'AR' | 'US' = 'AR', extra: Record<string, unknown> = {}): PublicProperty {
  return adaptPublicProperty(
    {
      propertyId,
      address: `Dirección ${propertyId}`,
      price: 150000,
      currency: 'U$D',
      operationType: 'VENTA',
      propertyType: { typeId: 2, name: 'Casa', appId: '5791' },
      state: { stateId: 3, name: 'Bs.As. G.B.A. Norte' },
      city: { cityId: 41, name: 'Tigre' },
      neighborhood: { neighborhoodId: 601, name: 'Benavídez' },
      webListing: 'SIMPLE',
      images: Array.from({ length: 20 }, (_, i) => ({ imageId: `p${propertyId}-${i}`, url: `https://cdn.2clics.com/${propertyId}/${i}.jpg` })),
      meta_data: [
        { metaKey: 'description', metaValue: 'Descripción real de 2Clics.' },
        { metaKey: 'orientation', metaValue: 'NORTE' },
      ],
      ...extra,
    } as never,
    region,
  );
}

function setActive(ids: number[], region: 'AR' | 'US' = 'AR') {
  lookups.results.clear();
  for (const id of ids) lookups.results.set(id, { status: 'ready', property: liveProperty(id, region) });
}

const fetcher = (id: number) =>
  Promise.resolve(lookups.results.get(id) || ({ status: 'not-found', property: null } as SinglePropertyResult)) as Promise<SinglePropertyResult>;

function toSource(p: PublicProperty, curation: DevelopmentCuration) {
  return {
    propertyId: p.propertyId,
    region: p.region,
    title: curation.publicName || p.title,
    location: p.location,
    description: p.description,
    images: p.images,
    amenities: p.amenities,
    price: p.price,
    currency: p.currency,
    hidePrice: p.hidePrice,
  };
}

function renderDetail(curation: DevelopmentCuration, loaded: Awaited<ReturnType<typeof loadDevelopment>>) {
  return render(
    React.createElement(CuratedDevelopmentDetailView, {
      curation,
      source: loaded.sourceProperty ? toSource(loaded.sourceProperty, curation) : null,
      units: loaded.units,
      availabilityKnown: loaded.availabilityKnown,
      assets: resolveDevelopmentAssets(curation.slug),
    }),
  );
}

const benavidez = getDevelopmentBySlug('benavidez-village')!;
const BENAVIDEZ_IDS = benavidez.propertyIds; // [233708, 237474, 237472, 233702, 233707]

beforeEach(() => lookups.results.clear());

describe('pickDevelopmentSource — una única regla de fuente', () => {
  it('1) sourcePropertyId activa → es la fuente (comportamiento normal)', async () => {
    setActive(BENAVIDEZ_IDS);
    const loaded = await loadDevelopment(benavidez, fetcher);
    expect(loaded.sourceProperty?.propertyId).toBe(benavidez.sourcePropertyId);
    expect(loaded.units.map((u) => u.propertyId)).toEqual(BENAVIDEZ_IDS);
    expect(loaded.availabilityKnown).toBe(true);
  });

  it('2) sourcePropertyId en 404 + otra unidad activa → la primera activa de propertyIds, y el desarrollo sigue', async () => {
    setActive(BENAVIDEZ_IDS.filter((id) => id !== benavidez.sourcePropertyId));
    const loaded = await loadDevelopment(benavidez, fetcher);
    expect(loaded.sourceProperty?.propertyId).toBe(233708); // primera de propertyIds
    expect(loaded.units).toHaveLength(4);
    expect(loaded.availabilityKnown).toBe(true);
    const entry = await loadCuratedEntry(benavidez, fetcher);
    expect(entry.curation.slug).toBe('benavidez-village');
    expect(render(React.createElement(CuratedDevelopmentCard, { curation: benavidez, source: entry.source, variant: 'compact' }))).toContain(
      'Benavídez Village',
    );
  });

  it('3) sourcePropertyId en 404 + ninguna unidad activa → fuente null y el desarrollo sigue existiendo', async () => {
    setActive([]);
    const loaded = await loadDevelopment(benavidez, fetcher);
    expect(loaded.sourceProperty).toBeNull();
    expect(loaded.units).toEqual([]);
    expect(loaded.availabilityKnown).toBe(true);
    const entry = await loadCuratedEntry(benavidez, fetcher);
    expect(entry.source.title).toBe('Benavídez Village');
  });

  it('pickDevelopmentSource es pura: fuente → primera activa en orden de curaduría → null', () => {
    const [a, b, c] = [233708, 237474, 233707].map((id) => liveProperty(id));
    expect(pickDevelopmentSource(benavidez, [a, b, c])).toBe(a);
    expect(pickDevelopmentSource(benavidez, [c, liveProperty(233702)])?.propertyId).toBe(233702);
    expect(pickDevelopmentSource(benavidez, [])).toBeNull();
  });
});

describe('Benavídez Village — unidades vendidas (404) no afectan al desarrollo', () => {
  it('4) una unidad cualquiera en 404 entre varias: las demás siguen normales', async () => {
    for (const sold of BENAVIDEZ_IDS) {
      setActive(BENAVIDEZ_IDS.filter((id) => id !== sold));
      const loaded = await loadDevelopment(benavidez, fetcher);
      expect(loaded.units.map((u) => u.propertyId)).toEqual(BENAVIDEZ_IDS.filter((id) => id !== sold));
      const html = renderDetail(benavidez, loaded);
      expect(html).toContain('<h1>Benavídez Village</h1>');
      expect(html).toContain('4 unidades publicadas');
      expect(html).not.toContain(`href="/propiedades/${sold}"`);
    }
  });

  it('5) todas las unidades en 404: el desarrollo sigue publicado, sin stock inventado', async () => {
    setActive([]);
    const loaded = await loadDevelopment(benavidez, fetcher);
    const html = renderDetail(benavidez, loaded);
    expect(html).toContain('<h1>Benavídez Village</h1>');
    expect(html).toContain('Sin unidades disponibles actualmente');
    expect(html).toContain('Benavídez, Tigre'); // ubicación curada, no de 2Clics
    expect(html).not.toMatch(/U\$D \d/);
    expect(html).not.toContain('project-units-table"');
    expect(html).toContain('href="/contacto"'); // sin propiedad viva no hay consulta atada a una unidad
    expect(html).not.toContain('data-property-app-id');
  });

  it('13/14) UF 15 (237472) desaparece de activas: no figura, las demás unidades siguen normales y sin "Reservada"', async () => {
    setActive(BENAVIDEZ_IDS.filter((id) => id !== 237472));
    const loaded = await loadDevelopment(benavidez, fetcher);
    const html = renderDetail(benavidez, loaded);
    expect(html).toContain('4 unidades publicadas');
    expect(html).not.toContain('>UF 15<');
    expect(html).not.toContain('Reservada');
    for (const label of ['UF 11', 'UF 12', 'UF 16', 'UF 20']) expect(html).toContain(`>${label}<`);
    const rows = resolveDevelopmentUnitRows(benavidez, loaded.units);
    expect(rows.map((r) => r.label)).toEqual(['UF 11', 'UF 12', 'UF 16', 'UF 20']);
    expect(rows.every((r) => !r.reserved)).toBe(true);
  });

  it('11) reservedUnitIds sigue funcionando para otras reservas reales', async () => {
    setActive(BENAVIDEZ_IDS);
    const loaded = await loadDevelopment(benavidez, fetcher);
    const withReservation = { ...benavidez, reservedUnitIds: [233707] };
    const html = renderDetail(withReservation, loaded);
    expect(html).toContain('4 unidades disponibles · 1 reservada');
    expect(html).toContain('>UF 20<span class="project-unit-badge-reserved">Reservada</span>');
  });

  it('12) UF 15 ya NO está configurada como reservada (está vendida en 2Clics)', () => {
    expect(benavidez.reservedUnitIds ?? []).not.toContain(237472);
    expect(benavidez.reservedUnitIds ?? []).toEqual([]);
  });
});

describe('Pacheco / Domus / Faena / Remeros — su única propiedad en 404 no baja el desarrollo', () => {
  const cases: Array<[string, string, number, string]> = [
    ['6) Pacheco Central', 'pacheco-central', 233719, 'General Pacheco'],
    ['7) Domus Brickell Center', 'domus-brickell-center', 236682, 'Domus Brickell Center'],
    ['8) Faena', 'faena', 236986, 'Faena'],
    ['Remeros Beach (hidden)', 'remeros-beach', 237447, 'Remeros Beach'],
  ];

  for (const [label, slug, sourceId, text] of cases) {
    it(`${label}: con ${sourceId} en 404 el desarrollo sigue existiendo (índice y ficha)`, async () => {
      const curation = getDevelopmentBySlug(slug)!;
      expect(curation.sourcePropertyId).toBe(sourceId);
      setActive([]);

      const loaded = await loadDevelopment(curation, fetcher);
      expect(loaded.sourceProperty).toBeNull();

      const entry = await loadCuratedEntry(curation, fetcher);
      expect(entry.curation.slug).toBe(slug);
      const card = render(React.createElement(CuratedDevelopmentCard, { curation, source: entry.source, variant: 'compact' }));
      expect(card).toContain(`href="/desarrollos/${slug}"`);
      // Nombre PÚBLICO (nunca el interno `name`): publicName o, si es null (Faena), fallbackPublicName.
      const publicTitle = curation.publicName || curation.fallbackPublicName;
      expect(publicTitle).toBeTruthy();
      expect(card).toContain(`<h3>${publicTitle}</h3>`);
      expect(card).not.toContain(curation.name === publicTitle ? ' ' : curation.name);

      const html = renderDetail(curation, loaded);
      expect(html).toContain('<h1>');
      expect(html).toContain(text);
      // Nada de precio/medidas inventado cuando la unidad de referencia no existe.
      expect(html).not.toMatch(/U\$D \d/);
      expect(html).not.toContain('project-commercial-summary');
    });
  }

  it('el listado público sigue siendo PUBLIC_DEVELOPMENTS: cada uno se resuelve sin importar el estado de 2Clics', async () => {
    setActive([]);
    for (const curation of PUBLIC_DEVELOPMENTS) {
      const entry = await loadCuratedEntry(curation, fetcher);
      expect(entry.curation.slug).toBe(curation.slug);
    }
    expect(PUBLIC_DEVELOPMENTS.map((d) => d.slug)).toEqual(['faena', 'benavidez-village', 'pacheco-central', 'domus-brickell-center']);
    expect(DEVELOPMENTS.length).toBeGreaterThan(PUBLIC_DEVELOPMENTS.length); // Remeros sigue hidden
  });

  it('ubicación de fallback: solo curada (publicLocation o snapshot), nunca inventada', () => {
    expect(getDevelopmentFallbackLocation('faena')).toBe('Miami River · Miami · Florida · Estados Unidos');
    expect(getDevelopmentFallbackLocation('benavidez-village')).toBe('Benavídez, Tigre');
    expect(getDevelopmentFallbackLocation('pacheco-central')).toBe('General Pacheco, Tigre');
    expect(getDevelopmentFallbackLocation('slug-que-no-existe')).toBe('');
  });
});

describe('9) índice y ficha usan exactamente la misma resolución de fuente', () => {
  it('ninguna página/Home toma `getPublicPropertyById(curation.sourcePropertyId)` como condición de existencia', () => {
    const index = readFileSync('app/desarrollos/page.tsx', 'utf8');
    const detail = readFileSync('app/desarrollos/[id]/page.tsx', 'utf8');
    const home = readFileSync('lib/home-selection.ts', 'utf8');
    expect(index).toContain('loadCuratedEntry');
    expect(detail).toContain('loadDevelopment');
    expect(home).toContain('loadDevelopment');
    for (const source of [index, detail]) expect(source).not.toMatch(/getPublicPropertyById\(curation\.sourcePropertyId\)/);
    expect(home).not.toMatch(/getPublicPropertyById\(curation\.sourcePropertyId\)/);
    expect(index).not.toMatch(/if \(!result\.property\) return null/);
  });

  it('con la misma disponibilidad, la card del índice y la ficha usan la misma propiedad fuente', async () => {
    setActive(BENAVIDEZ_IDS.filter((id) => id !== benavidez.sourcePropertyId));
    const loaded = await loadDevelopment(benavidez, fetcher);
    const entry = await loadCuratedEntry(benavidez, fetcher);
    // La imagen de la card sale de la misma fuente que la ficha (con hero local, de ese hero).
    const cardImage = entry.source.image?.displayUrl || '';
    const fromSource = loaded.sourceProperty!.images.map((i) => i.displayUrl);
    expect(cardImage.startsWith('/developments/') || fromSource.includes(cardImage)).toBe(true);
    expect(loaded.sourceProperty?.propertyId).toBe(233708);
  });
});

describe('10) errores temporales del proveedor', () => {
  const erroring = (failing: number[]) => (id: number) =>
    Promise.resolve(
      failing.includes(id) ? ({ status: 'error', property: null } as SinglePropertyResult) : lookups.results.get(id) || ({ status: 'not-found', property: null } as SinglePropertyResult),
    );

  it('error/timeout en todas las consultas: el desarrollo no desaparece y no afirma "sin unidades"', async () => {
    setActive(BENAVIDEZ_IDS);
    const loaded = await loadDevelopment(benavidez, erroring(BENAVIDEZ_IDS));
    expect(loaded.sourceProperty).toBeNull();
    expect(loaded.availabilityKnown).toBe(false);
    const entry = await loadCuratedEntry(benavidez, erroring(BENAVIDEZ_IDS));
    expect(entry.source.title).toBe('Benavídez Village');
    const html = renderDetail(benavidez, loaded);
    expect(html).toContain('<h1>Benavídez Village</h1>');
    expect(html).not.toContain('Sin unidades disponibles');
    expect(html).not.toContain('unidades publicadas');
    expect(html).not.toContain('id="disponibilidad"');
  });

  it('un throw inesperado del fetch se trata como falla del proveedor, no como baja ni como crash', async () => {
    setActive(BENAVIDEZ_IDS);
    const throwing = (id: number): Promise<SinglePropertyResult> =>
      id === 233708 ? Promise.reject(new Error('boom')) : fetcher(id);
    const loaded = await loadDevelopment(benavidez, throwing);
    expect(loaded.availabilityKnown).toBe(false);
    expect(loaded.units.map((u) => u.propertyId)).not.toContain(233708);
    expect(loaded.sourceProperty).not.toBeNull();
  });

  it('error parcial: se muestran las unidades resueltas pero sin conteo que podría ser parcial', async () => {
    setActive(BENAVIDEZ_IDS);
    const loaded = await loadDevelopment(benavidez, erroring([237474]));
    const html = renderDetail(benavidez, loaded);
    expect(html).toContain('<h1>Benavídez Village</h1>');
    expect(html).toContain('>UF 11<');
    expect(html).not.toContain('unidades publicadas');
  });
});
