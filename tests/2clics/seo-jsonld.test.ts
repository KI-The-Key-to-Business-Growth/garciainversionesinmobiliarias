import { describe, expect, it } from 'vitest';
import { buildPropertyJsonLd, serializeJsonLd } from '@/lib/seo-jsonld';
import type { PublicProperty } from '@/lib/2clics/types';

function property(overrides: Partial<PublicProperty> = {}): PublicProperty {
  return {
    source: '2clics-api',
    region: 'AR',
    marketLabel: 'Argentina',
    propertyId: 240593,
    title: 'Benavídez Village · Dúplex 3 ambientes con jardín',
    address: 'Calle exacta 123',
    alternativeAddress: '',
    number: '',
    publishDate: '',
    modifiedDate: '',
    lat: null,
    long: null,
    url: '',
    description: 'Conjunto residencial de 25 viviendas de dos plantas con jardín privado.',
    price: 138000,
    currency: 'U$D',
    hidePrice: false,
    operationType: 'VENTA',
    amountRoom: 3,
    amountBedroom: 2,
    aptCredit: null,
    coveredArea: 78.8,
    uncoveredArea: 30,
    semiCoveredArea: 3,
    totalArea: 124,
    status: 'ACTIVE',
    statusDiffusion: '',
    webListing: 'SIMPLE',
    propertyType: { typeId: 1, name: 'Casa' },
    location: {
      state: { name: 'Bs.As. G.B.A. Norte' },
      city: { name: 'Tigre' },
      neighborhood: { name: 'Benavídez' },
    },
    images: [{ id: '1', name: '', url: 'https://cdn.example.com/a.jpg', thumbnailUrl: '', displayUrl: 'https://cdn.example.com/a.jpg', displayThumbnailUrl: '', useVirtualized: false }],
    amenities: [],
    metadata: {} as PublicProperty['metadata'],
    developmentParent: null,
    ...overrides,
  };
}

describe('buildPropertyJsonLd', () => {
  it('arma el listado con precio, superficie y ubicación pública', () => {
    const data = buildPropertyJsonLd(property())!;
    expect(data['@type']).toBe('RealEstateListing');
    expect(data.url).toMatch(/\/propiedades\/240593$/);
    expect(data.offers).toMatchObject({ price: 138000, priceCurrency: 'USD' });
    expect(data.about).toMatchObject({
      '@type': 'House',
      numberOfRooms: 3,
      numberOfBedrooms: 2,
      floorSize: { value: 124, unitCode: 'MTK' },
    });
  });

  it('no publica la dirección exacta ni la provincia cruda de 2Clics', () => {
    const json = JSON.stringify(buildPropertyJsonLd(property()));
    expect(json).not.toContain('Calle exacta');
    expect(json).not.toContain('G.B.A.');
    expect(json).toContain('Benavídez');
  });

  it('omite el precio cuando está oculto o la moneda es desconocida', () => {
    expect(buildPropertyJsonLd(property({ hidePrice: true }))!.offers).toBeUndefined();
    expect(buildPropertyJsonLd(property({ currency: 'XYZ' }))!.offers).toBeUndefined();
    expect(buildPropertyJsonLd(property({ price: null }))!.offers).toBeUndefined();
  });

  it('en Estados Unidos incluye el estado y el país', () => {
    const data = buildPropertyJsonLd(
      property({ region: 'US', location: { state: { name: 'Florida' }, city: { name: 'Miami' } } }),
    )!;
    expect(data.about).toMatchObject({ address: { addressRegion: 'Florida', addressCountry: 'US', addressLocality: 'Miami' } });
  });

  it('devuelve null sin id o sin título', () => {
    expect(buildPropertyJsonLd(property({ propertyId: null }))).toBeNull();
    expect(buildPropertyJsonLd(property({ title: '' }))).toBeNull();
  });

  it('serializa escapando "<" para no cerrar la etiqueta script', () => {
    const out = serializeJsonLd({ name: '</script><b>' });
    expect(out).not.toContain('</script>');
    expect(JSON.parse(out).name).toBe('</script><b>');
  });
});
