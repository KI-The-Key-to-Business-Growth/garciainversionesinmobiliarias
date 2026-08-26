import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import DevelopmentCard from '@/components/properties/DevelopmentCard';
import { featuredGridClassName } from '@/components/properties/FeaturedProperties';
import ListingState, { listingStateMessage } from '@/components/properties/ListingState';
import PropertyCard from '@/components/properties/PropertyCard';
import PropertyDetailView from '@/components/properties/PropertyDetailView';
import { DescriptionToggleButton } from '@/components/properties/PropertyDescription';
import PropertyFilters from '@/components/properties/PropertyFilters';
import PropertyGallery from '@/components/properties/PropertyGallery';
import PropertyMap, { googleMapsEmbedUrl, resolvePropertyMapTarget } from '@/components/properties/PropertyMap';
import PropertyShareButton from '@/components/properties/PropertyShareButton';
import { adaptPublicDevelopment, adaptPublicProperty } from '@/lib/2clics/adapters';
import { formatExpenses, formatOperation, formatPublicLocation, isZeroExpensesValue } from '@/lib/2clics/format';
import {
  buildAvailablePropertyTypes,
  buildLocationOptions,
  catalogPropertyRequest,
  dedupePublicProperties,
  locationFacetRequest,
  nextPageHref,
  parsePropertyListingFilters,
  propertyListingPrioritySegments,
  propertyResponseCount,
  rankRelatedProperties,
  resolvePriceFilter,
  resolvePropertyTypeAppId,
  withResolvedPropertyType,
} from '@/lib/2clics/listings';
import type {
  ListingOperationFilter,
  PriceFacet,
  PropertyListingFilters,
  ResolvedPriceFilter,
} from '@/lib/2clics/listings';
import type { PublicImage, PublicLocation, PublicProperty, TwoclicsPropertyType } from '@/lib/2clics/types';

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element);
}

function property(overrides: Partial<PublicProperty> = {}) {
  return {
    ...adaptPublicProperty(
      {
        propertyId: 1001,
        address: 'Av. Santa Fe 1200',
        price: 250000,
        currency: 'U$D',
        hidePrice: false,
        operationType: 'ALQUILER_PERMANENTE',
        amountRoom: 3,
        amountBedroom: 2,
        totalArea: 92,
        coveredArea: 78,
        propertyType: { typeId: 1, name: 'Departamento' },
        state: { name: 'Buenos Aires' },
        city: { name: 'CABA' },
        neighborhood: { name: 'Recoleta' },
        webListing: 'DESTACADO',
        images: [{ imageId: 'front', url: 'https://cdn.2clics.com/front.jpg' }],
        meta_data: [
          { metaKey: 'description', metaValue: 'Unidad luminosa.' },
          { metaKey: 'bathrooms', metaValue: '2' },
          { metaKey: 'amount_garage', metaValue: '1' },
          { metaKey: 'expenses', metaValue: '120000' },
          { metaKey: 'expenses_currency', metaValue: 'AR$' },
          { metaKey: 'private_note', metaValue: 'No publicar' },
        ],
        developmentParent: { developmentId: 50, title: 'Proyecto Norte' },
      },
      'AR',
    ),
    ...overrides,
  };
}

function image(id: string): PublicImage {
  return {
    id,
    name: id,
    url: `https://cdn.2clics.com/${id}.jpg`,
    thumbnailUrl: `https://cdn.2clics.com/${id}-thumb.jpg`,
    displayUrl: `https://cdn.2clics.com/${id}.jpg`,
    displayThumbnailUrl: `https://cdn.2clics.com/${id}-thumb.jpg`,
    useVirtualized: false,
  };
}

const recoletaLocation: PublicLocation = {
  state: { stateId: 1, name: 'Buenos Aires' },
  city: { cityId: 2, name: 'CABA' },
  neighborhood: { neighborhoodId: 3, name: 'Recoleta' },
};

describe('2Clics property UI', () => {
  it('renders a complete property card without private metadata', () => {
    const html = render(React.createElement(PropertyCard, { property: property() }));

    expect(html).toContain('Departamento');
    expect(html).toContain('Alquiler');
    expect(html).toContain('U$D 250.000');
    expect(html).toContain('3 amb.');
    expect(html).toContain('2 dorm.');
    // Baños/Cocheras (pasada cards 2026-08-26) — mismo criterio que la ficha, misma fuente
    // (property.metadata.bathrooms/garages), mismo pluralizado.
    expect(html).toContain('2 baños');
    expect(html).toContain('1 cochera');
    expect(html).toContain('92 m2');
    expect(html).toContain('Destacada');
    expect(html).toContain('Ver propiedad');
    expect(html).toContain('/desarrollos/50');
    expect(html).not.toContain('No publicar');
    expect(html).not.toContain('undefined');
  });

  it('omits Baños/Cocheras from the card when the value is zero (never "0 baños"/"0 cocheras")', () => {
    const html = render(
      React.createElement(PropertyCard, {
        property: property({
          metadata: { ...property().metadata, bathrooms: '0', garages: '0' },
        }),
      }),
    );

    expect(html).not.toContain('0 baño');
    expect(html).not.toContain('0 cochera');
    // El resto de los facts (ambientes/dormitorios/superficie) sigue presente — el cero solo
    // afecta a los campos que efectivamente son cero, no borra el resto de la card.
    expect(html).toContain('3 amb.');
    expect(html).toContain('2 dorm.');
    expect(html).toContain('92 m2');
  });

  it('Terreno / Lote solo muestra Superficie total — nunca ambientes/dormitorios/baños/cocheras aunque el dato exista', () => {
    const html = render(
      React.createElement(PropertyCard, {
        property: property({
          propertyType: { typeId: 5, name: 'Terreno / Lote' },
          amountRoom: 0,
          amountBedroom: 0,
          totalArea: 800,
          metadata: { ...property().metadata, bathrooms: '2', garages: '1' },
        }),
      }),
    );

    const factsMatch = html.match(/<p class="twoclics-card-facts">([\s\S]*?)<\/p>/);
    const facts = factsMatch ? factsMatch[1] : null;
    expect(facts).toBe('800 m2');
    expect(html).not.toContain('amb.');
    expect(html).not.toContain('dorm.');
    expect(html).not.toContain('baño');
    expect(html).not.toContain('cochera');
  });

  it('Oficina nunca muestra Dormitorios, aunque el CRM traiga un valor no-cero (dato residual, no residencial real)', () => {
    const html = render(
      React.createElement(PropertyCard, {
        property: property({
          propertyType: { typeId: 8, name: 'Oficina' },
          amountRoom: 2,
          amountBedroom: 1, // dato real del inventario auditado — no debe mostrarse igual
          totalArea: 71,
          metadata: { ...property().metadata, bathrooms: '1', garages: '1' },
        }),
      }),
    );

    const factsMatch = html.match(/<p class="twoclics-card-facts">([\s\S]*?)<\/p>/);
    const facts = factsMatch ? factsMatch[1] : '';
    expect(facts).not.toContain('dorm.');
    expect(facts).toContain('amb.');
    expect(facts).toContain('baño');
    expect(facts).toContain('cochera');
    expect(facts).toContain('71 m2');
  });

  it('mantiene Superficie total en la card cuando el dato existe, para los 4 tipos reales auditados', () => {
    for (const propertyType of [
      { typeId: 2, name: 'Casa' },
      { typeId: 1, name: 'Departamento' },
      { typeId: 8, name: 'Oficina' },
      { typeId: 5, name: 'Terreno / Lote' },
    ]) {
      const html = render(
        React.createElement(PropertyCard, { property: property({ propertyType, totalArea: 123 }) }),
      );
      expect(html).toContain('123 m2');
    }
  });

  it('shows only property type in the card meta line and a public Argentina location below', () => {
    const html = render(React.createElement(PropertyCard, { property: property() }));
    const meta = html.match(/<div class="twoclics-card-meta">([\s\S]*?)<\/div>/)?.[1] || '';

    expect(meta).toContain('Departamento');
    expect(meta).not.toContain('Buenos Aires');
    expect(html).toContain('Recoleta');
    expect(html).toContain('CABA');
    expect(html).toContain('Argentina');
  });

  it('keeps the public Miami location hierarchy in property cards', () => {
    const html = render(
      React.createElement(PropertyCard, {
        property: property({
          region: 'US',
          propertyType: { typeId: 2, name: 'Casa' },
          location: {
            state: { stateId: 1, name: 'Estados Unidos' },
            city: { cityId: 2, name: 'Florida' },
            neighborhood: { neighborhoodId: 3, name: 'Miami' },
          },
          marketLabel: 'Miami',
        }),
      }),
    );
    const meta = html.match(/<div class="twoclics-card-meta">([\s\S]*?)<\/div>/)?.[1] || '';

    expect(meta).toContain('Casa');
    expect(meta).not.toContain('Miami');
    expect(html).toContain('Miami');
    expect(html).toContain('Florida');
    expect(html).toContain('Estados Unidos');
  });

  it('formats public Argentina locations without exposing the CRM state label', () => {
    const label = formatPublicLocation(
      {
        state: { stateId: 1, name: 'Bs.As. G.B.A. Norte' },
        city: { cityId: 2, name: 'Tigre' },
        neighborhood: { neighborhoodId: 3, name: 'Benavídez' },
      },
      'AR',
    );

    expect(label).toContain('Benavídez');
    expect(label).toContain('Tigre');
    expect(label).toContain('Argentina');
    expect(label).not.toContain('Bs.As. G.B.A. Norte');
    expect([0x00c2, 0x00c3, 0x00e2].some((code) => label.includes(String.fromCharCode(code)))).toBe(false);
  });

  it('respects hidePrice and missing optional data', () => {
    const html = render(
      React.createElement(PropertyCard, {
        property: property({
          price: null,
          hidePrice: true,
          amountRoom: null,
          amountBedroom: null,
          totalArea: null,
          images: [],
          developmentParent: null,
        }),
      }),
    );

    expect(html).toContain('Consultar precio');
    expect(html).toContain('Sin imagen');
    expect(html).not.toContain('0 amb.');
    expect(html).not.toContain('undefined');
  });

  describe('PropertyCard — variantes overlay (aprobadas, docs/ai/PROPERTY_UX_DECISIONS.md)', () => {
    it('links the whole card to the correct ficha and keeps the full title accessible even though it is visually clamped', () => {
      const longTitle = 'Terreno Lote En Venta En Delta, Tigre, G.b.a. Zona Norte';
      const html = render(
        React.createElement(PropertyCard, {
          variant: 'overlay-catalog',
          property: property({ propertyId: 187691, title: longTitle }),
        }),
      );

      expect(html).toContain('href="/propiedades/187691"');
      // El clamp (-webkit-line-clamp) es solo visual (CSS) — el texto completo del título sigue
      // en el DOM sin cortar, nunca se reescribe/trunca el string real.
      expect(html).toContain(longTitle);
      expect(html).not.toContain('…');
    });

    it('keeps price, location and type-specific facts visible in the overlay variant, without exposing private metadata', () => {
      const html = render(
        React.createElement(PropertyCard, { variant: 'overlay-catalog', property: property() }),
      );

      expect(html).toContain('U$D 250.000');
      expect(html).toContain('Recoleta');
      expect(html).toContain('CABA');
      expect(html).toContain('Argentina');
      expect(html).toContain('3 amb.');
      expect(html).toContain('2 dorm.');
      expect(html).toContain('2 baños');
      expect(html).toContain('1 cochera');
      expect(html).toContain('92 m2');
      expect(html).toContain('Ver propiedad');
      expect(html).not.toContain('No publicar');
      expect(html).not.toContain('undefined');
    });

    it('respects the same facts-per-type logic as the default card (Terreno/Lote: solo Superficie; Oficina: nunca Dormitorios)', () => {
      const landHtml = render(
        React.createElement(PropertyCard, {
          variant: 'overlay-catalog',
          property: property({
            propertyType: { typeId: 5, name: 'Terreno / Lote' },
            amountRoom: 0,
            amountBedroom: 0,
            totalArea: 800,
            metadata: { ...property().metadata, bathrooms: '2', garages: '1' },
          }),
        }),
      );
      const landFacts = landHtml.match(/<p class="twoclics-card-facts">([\s\S]*?)<\/p>/)?.[1] || '';
      expect(landFacts).toBe('800 m2');

      const officeHtml = render(
        React.createElement(PropertyCard, {
          variant: 'overlay-catalog',
          property: property({
            propertyType: { typeId: 8, name: 'Oficina' },
            amountRoom: 2,
            amountBedroom: 1,
            totalArea: 71,
            metadata: { ...property().metadata, bathrooms: '1', garages: '1' },
          }),
        }),
      );
      const officeFacts = officeHtml.match(/<p class="twoclics-card-facts">([\s\S]*?)<\/p>/)?.[1] || '';
      expect(officeFacts).not.toContain('dorm.');
      expect(officeFacts).toContain('amb.');
      expect(officeFacts).toContain('71 m2');
    });

    it('does not affect the default/compact card still used by the ficha (related properties)', () => {
      const defaultHtml = render(React.createElement(PropertyCard, { property: property() }));
      const compactHtml = render(React.createElement(PropertyCard, { property: property(), compact: true }));

      expect(defaultHtml).toContain('twoclics-card-body');
      expect(defaultHtml).not.toContain('twoclics-card--overlay');
      expect(compactHtml).toContain('twoclics-card--compact');
      expect(compactHtml).not.toContain('twoclics-card--overlay');
    });

    it('renders overlay-home and overlay-catalog with byte-identical markup — unified 2026-09-03, both share the same "title visible, 1 line rest / 2 lines hover" behavior', () => {
      const homeHtml = render(
        React.createElement(PropertyCard, { variant: 'overlay-home', property: property() }),
      );
      const catalogHtml = render(
        React.createElement(PropertyCard, { variant: 'overlay-catalog', property: property() }),
      );

      // No quedó ningún modifier class residual de cuando el título se comportaba distinto por
      // variante — si algún día vuelven a divergir, este test debe fallar y avisar.
      expect(homeHtml).not.toContain('twoclics-card--overlay-catalog');
      expect(catalogHtml).not.toContain('twoclics-card--overlay-catalog');
      expect(homeHtml).toBe(catalogHtml);
      expect(homeHtml).toContain('twoclics-card--overlay');
      expect(homeHtml).toContain(property().title);
    });
  });

  it('renders property detail with public metadata only', () => {
    const html = render(React.createElement(PropertyDetailView, { property: property() }));

    expect(html).toContain('Datos principales');
    expect(html).toContain('U$D 250.000');
    expect(html).toContain('Información básica');
    expect(html).toContain('Superficies');
    expect(html).toContain('Descripción');
    expect(html).toContain('Unidad luminosa.');
    expect(html).toContain('Baños');
    expect(html).toContain('AR$ 120.000');
    expect(html).toContain('twoclics-detail-hero-action');
    expect(html).toContain('twoclics-mobile-actions');
    expect(html).toContain('Asesoramiento');
    expect(html).toContain('García Inversiones Inmobiliarias');
    expect(html).toContain('Llamar');
    expect(html).toContain('Compartir');
    expect(html).toContain('Solicitar asesoramiento');
    expect(html).toContain('Consultar esta propiedad');
    expect(html).toContain('data-property-app-id="1001"');
    expect(html).not.toContain('twoclics-detail-price-block');
    expect(html).not.toContain('WhatsApp');
    expect(html).not.toContain('/#contacto');
    expect(html).not.toContain('private_note');
    expect(html).not.toContain('No publicar');
  });

  it('does not repeat the total surface area inside the Superficies breakdown', () => {
    const html = render(React.createElement(PropertyDetailView, { property: property() }));
    const detailsSection =
      html.match(/<section class="twoclics-ficha-section"><h2>Detalles de la propiedad<\/h2>[\s\S]*?<\/section>/)?.[0] ||
      '';

    expect(html).toContain('twoclics-essential-item"><span>Superficie total</span>');
    expect(detailsSection).toContain('Cubierta');
    expect(detailsSection).not.toContain('<dt>Total</dt>');
  });

  it('treats zero (in any common representation) as a non-value for expenses', () => {
    expect(isZeroExpensesValue('0')).toBe(true);
    expect(isZeroExpensesValue('0.0')).toBe(true);
    expect(isZeroExpensesValue('0.00')).toBe(true);
    expect(isZeroExpensesValue('0,00')).toBe(true);
    expect(isZeroExpensesValue('  0  ')).toBe(true);
    expect(isZeroExpensesValue('')).toBe(false);
    expect(isZeroExpensesValue(undefined)).toBe(false);
    expect(isZeroExpensesValue('120000')).toBe(false);
  });

  it('formats expenses normally for real amounts but omits zero-equivalent values', () => {
    expect(formatExpenses('180000', 'AR$')).toBe('AR$ 180.000');
    expect(formatExpenses('450', 'U$D')).toBe('U$D 450');
    expect(formatExpenses('0', 'AR$')).toBe('');
    expect(formatExpenses('0.00', 'U$D')).toBe('');
    expect(formatExpenses('', 'AR$')).toBe('');
    expect(formatExpenses(undefined, 'AR$')).toBe('');
  });

  it('omits the Expensas field entirely for zero-equivalent values without claiming there are none', () => {
    const base = property();
    const zeroVariants = ['0', '0.0', '0.00'];

    for (const zeroValue of zeroVariants) {
      const html = render(
        React.createElement(PropertyDetailView, {
          property: {
            ...base,
            metadata: { ...base.metadata, expenses: zeroValue, expensesCurrency: 'AR$' },
          },
        }),
      );

      expect(html).not.toContain('Expensas');
      expect(html).not.toContain('Sin expensas');
      expect(html).not.toContain('AR$ 0');
      expect(html).not.toContain('>AR$<');
    }
  });

  it('omits Expensas for missing/empty values without inventing placeholder text', () => {
    const base = property();
    const html = render(
      React.createElement(PropertyDetailView, {
        property: {
          ...base,
          metadata: { ...base.metadata, expenses: undefined, expensesCurrency: undefined },
        },
      }),
    );

    expect(html).not.toContain('Expensas');
    expect(html).not.toContain('Sin expensas');
  });

  it('keeps a real positive Expensas amount as currency + value in one unit, inside Información básica', () => {
    const base = property();
    const html = render(
      React.createElement(PropertyDetailView, {
        property: {
          ...base,
          metadata: { ...base.metadata, expenses: '180000', expensesCurrency: 'AR$' },
        },
      }),
    );
    const basicColumn =
      html.match(/<h3>Información básica<\/h3><dl class="twoclics-spec-list">[\s\S]*?<\/dl>/)?.[0] || '';

    expect(basicColumn).toContain('<dt>Expensas</dt>');
    expect(basicColumn).toContain('<dd>AR$ 180.000</dd>');
  });

  it('does not repeat Tipo de propiedad or Operación inside Información básica (already shown in the hero eyebrow)', () => {
    const html = render(React.createElement(PropertyDetailView, { property: property() }));

    expect(html).toContain('Alquiler · Departamento');
    expect(html).not.toContain('<dt>Tipo de propiedad</dt>');
    expect(html).not.toContain('<dt>Operación</dt>');
  });

  it('omits Información adicional entirely when it has no real content left (Expensas moved out, no other data)', () => {
    const html = render(React.createElement(PropertyDetailView, { property: property() }));

    expect(html).not.toContain('Información adicional');
    expect(html).not.toContain('twoclics-ficha-section--minor');
  });

  it('keeps Información adicional, in a compact layout, when another property genuinely has extra data', () => {
    const base = property();
    const html = render(
      React.createElement(PropertyDetailView, {
        property: {
          ...base,
          metadata: { ...base.metadata, toilettes: '1', garageType: 'Cubierta' },
        },
      }),
    );

    expect(html).toContain('Información adicional');
    expect(html).toContain('twoclics-spec-list twoclics-spec-list--compact');
    expect(html).toContain('1 toilette');
    expect(html).toContain('Cubierta');
  });

  it('renders the description collapsed by default with no expand control before measuring overflow (SSR-safe)', () => {
    const html = render(React.createElement(PropertyDetailView, { property: property() }));

    expect(html).toContain('twoclics-description-clamp');
    expect(html).not.toContain('twoclics-description-toggle');
    expect(html).not.toContain('Ver descripción completa');
  });

  it('flips the description toggle accessible contract (label + aria-expanded) between collapsed and expanded', () => {
    const collapsed = render(
      React.createElement(DescriptionToggleButton, { expanded: false, contentId: 'desc-test' }),
    );
    const expanded = render(
      React.createElement(DescriptionToggleButton, { expanded: true, contentId: 'desc-test' }),
    );

    expect(collapsed).toContain('aria-expanded="false"');
    expect(collapsed).toContain('aria-controls="desc-test"');
    expect(collapsed).toContain('Ver descripción completa ↓');

    expect(expanded).toContain('aria-expanded="true"');
    expect(expanded).toContain('Ver menos ↑');
    expect(expanded).not.toContain('Ver descripción completa');
  });

  it('does not mount the institutional Header on property detail routes', () => {
    const source = readFileSync('app/propiedades/[id]/page.tsx', 'utf8');

    expect(source).not.toContain('<Header />');
    expect(source).toContain('<Footer />');
    expect(source).toContain('<WhatsAppFloat />');
  });

  it('uses the public location formatter in the property detail hero without changing map precision', () => {
    const html = render(React.createElement(PropertyDetailView, { property: property() }));
    const detailLocation =
      html.match(/<p class="twoclics-detail-location">([\s\S]*?)<\/p>/)?.[1] || '';

    expect(detailLocation).toContain('Recoleta');
    expect(detailLocation).toContain('CABA');
    expect(detailLocation).toContain('Argentina');
    expect(detailLocation).not.toContain('Buenos Aires');
    expect(html).toContain('Av.%20Santa%20Fe%201200');
    expect(html).toContain('Buenos%20Aires');
  });

  it('formats uppercase public enum values without changing technical values', () => {
    const base = property();
    const html = render(
      React.createElement(PropertyDetailView, {
        property: {
          ...base,
          metadata: {
            ...base.metadata,
            disposition: 'FRENTE',
            orientation: 'SUROESTE',
          },
        },
      }),
    );

    expect(html).toContain('Frente');
    expect(html).toContain('Suroeste');
    expect(html).not.toContain('FRENTE');
    expect(html).not.toContain('SUROESTE');
  });

  it('renders related properties as a horizontal scroller with the approved title', () => {
    const html = render(
      React.createElement(PropertyDetailView, {
        property: property(),
        relatedProperties: [
          property({ propertyId: 2001, title: 'Casa cercana 1' }),
          property({ propertyId: 2002, title: 'Casa cercana 2' }),
        ],
      }),
    );

    expect(html).toContain('Otras propiedades que pueden interesarte');
    expect(html).toContain('twoclics-related-scroller');
    expect(html).toContain('Casa cercana 1');
    expect(html).not.toContain('Otras propiedades en la zona');
  });

  it('does not render technical placeholder values in property details', () => {
    const base = property();
    const html = render(
      React.createElement(PropertyDetailView, {
        property: {
          ...base,
          metadata: {
            ...base.metadata,
            antiquity: 'OTHER',
            disposition: '-',
            orientation: 'N/A',
          },
        },
      }),
    );

    expect(html).not.toContain('OTHER');
    expect(html).not.toContain('Antig');
    expect(html).not.toContain('Disposici');
    expect(html).not.toContain('N/A');
  });

  it('renders construction state separately from numeric antiquity', () => {
    const base = property();
    const html = render(
      React.createElement(PropertyDetailView, {
        property: {
          ...base,
          metadata: {
            ...base.metadata,
            condition: 'A estrenar',
            antiquity: undefined,
          },
        },
      }),
    );

    expect(html).toContain('Estado');
    expect(html).toContain('A estrenar');
    expect(html).not.toContain('ESTRENAR');
    expect(html).not.toContain('Antig');
  });

  it('does not repeat Año / construcción when Antigüedad already answers the same question', () => {
    const base = property();
    const html = render(
      React.createElement(PropertyDetailView, {
        property: {
          ...base,
          metadata: { ...base.metadata, antiquity: '12 años', constructionDate: '2013' },
        },
      }),
    );

    expect(html).toContain('<dt>Antigüedad</dt><dd>12 años</dd>');
    expect(html).not.toContain('Año / construcción');
  });

  it('keeps Año / construcción when it is the only construction-date signal available', () => {
    const base = property();
    const html = render(
      React.createElement(PropertyDetailView, {
        property: {
          ...base,
          metadata: { ...base.metadata, antiquity: undefined, constructionDate: '2013' },
        },
      }),
    );

    expect(html).toContain('<dt>Año / construcción</dt><dd>2013</dd>');
  });

  it('omits the whole Detalles section when there is no technical data left to show (Tipo/Operación no longer count)', () => {
    const html = render(
      React.createElement(PropertyDetailView, {
        property: property({
          amountRoom: null,
          amountBedroom: null,
          coveredArea: null,
          uncoveredArea: null,
          semiCoveredArea: null,
          totalArea: null,
          aptCredit: null,
          number: '',
          description: '',
          metadata: {},
          developmentParent: null,
        }),
      }),
    );

    expect(html).not.toContain('Detalles de la propiedad');
    expect(html).not.toContain('Información básica');
    expect(html).not.toContain('Superficies');
    expect(html).not.toContain('0 dorm.');
    expect(html).not.toContain('0 baños');
    expect(html).not.toContain('0 cocheras');
    expect(html).not.toContain('<dd></dd>');
    expect(html).not.toContain('undefined');
  });

  it('does not render residential facts for a land property even when CRM has zero-or-nonapplicable values', () => {
    const base = property();
    const html = render(
      React.createElement(PropertyDetailView, {
        property: {
          ...base,
          propertyType: { typeId: 8, name: 'Terreno / Lote' },
          amountRoom: null,
          amountBedroom: 3,
          totalArea: 800,
          metadata: {
            ...base.metadata,
            bathrooms: '2',
            garages: '1',
          },
        },
      }),
    );
    const essentials = html.match(/<section class="twoclics-essential-strip"[\s\S]*?<\/section>/)?.[0] || '';

    expect(essentials).toContain('Precio');
    expect(essentials).toContain('Superficie total');
    expect(essentials).not.toContain('Dormitorios');
    expect(essentials).not.toContain('Baños');
    expect(essentials).not.toContain('Cocheras');
  });

  it('renders the native share control without requiring browser APIs during server render', () => {
    const html = render(React.createElement(PropertyShareButton, { title: 'Casa en Miami' }));

    expect(html).toContain('Compartir');
    expect(html).not.toContain('Enlace copiado');
  });

  it('renders video only when a sanitized public URL exists and never renders tour placeholders', () => {
    const base = property();
    const withVideo = render(
      React.createElement(PropertyDetailView, {
        property: {
          ...base,
          metadata: {
            ...base.metadata,
            videoUrl: 'https://youtu.be/example',
            tourUrl: 'https://tour.example.com/unused',
          },
        },
      }),
    );
    const withoutVideo = render(
      React.createElement(PropertyDetailView, {
        property: {
          ...base,
          metadata: {
            ...base.metadata,
            videoUrl: '',
            tourUrl: 'https://tour.example.com/unused',
          },
        },
      }),
    );

    expect(withVideo).toContain('Video');
    expect(withVideo).toContain('Ver video');
    expect(withVideo).not.toContain('Ver tour virtual');
    expect(withoutVideo).not.toContain('Ver video');
    expect(withoutVideo).not.toContain('Ver tour virtual');
  });

  it('renders a compact gallery state with one image', () => {
    const html = render(
      React.createElement(PropertyGallery, {
        images: [image('front')],
        title: 'Departamento en Recoleta',
      }),
    );

    expect(html).toContain('1 / 1');
    expect(html).toContain('Ampliar imagen');
    expect(html).toContain('https://cdn.2clics.com/front.jpg');
    expect(html).not.toContain('/_next/image');
    expect(html).not.toContain('twoclics-gallery-thumb');
  });

  it('renders selectable thumbnails for multiple images', () => {
    const html = render(
      React.createElement(PropertyGallery, {
        images: [image('front'), image('living'), image('kitchen')],
        title: 'Departamento en Recoleta',
      }),
    );

    expect(html).toContain('1 / 3');
    expect(html).toContain('Galer');
    expect(html).toContain('Ver las 3 fotos');
    expect(html).toContain('Imagen anterior');
    expect(html).toContain('Imagen siguiente');
    expect(html).toContain('aria-current="true"');
    expect(html).toContain('Ver imagen 2 de 3');
  });

  it('keeps fullscreen lightbox images uncropped in CSS', () => {
    const css = readFileSync('app/globals.css', 'utf8');

    expect(css).toContain('.twoclics-lightbox-stage img');
    expect(css).toContain('object-fit: contain');
  });
});

describe('2Clics property map', () => {
  it('uses coordinates as an exact map target when available', () => {
    const target = resolvePropertyMapTarget({
      title: 'Departamento en Recoleta',
      lat: -34.5889,
      long: -58.3974,
      address: 'Av. Santa Fe',
      number: '1200',
      location: recoletaLocation,
    });

    expect(target).toMatchObject({
      query: '-34.5889,-58.3974',
      precision: 'exact',
      source: 'coordinates',
    });
  });

  it('falls back to an approximate neighborhood map target', () => {
    const target = resolvePropertyMapTarget({
      title: 'Departamento en Recoleta',
      lat: null,
      long: null,
      address: '',
      number: '',
      location: recoletaLocation,
    });

    expect(target).toMatchObject({
      query: 'Recoleta, CABA, Buenos Aires',
      precision: 'approximate',
      source: 'neighborhood',
    });
  });

  it('renders a public embedded Google map without an API key', () => {
    const html = render(
      React.createElement(PropertyMap, {
        title: 'Departamento en Recoleta',
        lat: null,
        long: null,
        address: '',
        number: '',
        location: recoletaLocation,
        embedApiKey: '',
      }),
    );

    expect(html).toContain('Ubicaci');
    expect(html).toContain('Ubicaci');
    expect(html).toContain('<iframe');
    expect(html).toContain('https://www.google.com/maps?q=Recoleta%2C%20CABA%2C%20Buenos%20Aires&amp;output=embed');
    expect(html).toContain('Abrir en Google Maps');
    expect(html).toContain('https://www.google.com/maps/search/');
    expect(html).not.toContain('GOOGLE_MAPS_EMBED_API_KEY');
  });

  it('keeps the button fallback available when embedding is disabled', () => {
    const html = render(
      React.createElement(PropertyMap, {
        title: 'Departamento en Recoleta',
        lat: null,
        long: null,
        address: '',
        number: '',
        location: recoletaLocation,
        useEmbed: false,
      }),
    );

    expect(html).toContain('Ver ubicaci');
    expect(html).toContain('https://www.google.com/maps/search/');
    expect(html).not.toContain('<iframe');
  });

  it('keeps support for the Google Maps Embed API key as an optional override', () => {
    const html = render(
      React.createElement(PropertyMap, {
        title: 'Departamento en Recoleta',
        lat: -34.5889,
        long: -58.3974,
        address: '',
        number: '',
        location: recoletaLocation,
        embedApiKey: 'test-key',
      }),
    );

    expect(html).toContain('<iframe');
    expect(html).toContain('maps/embed/v1/place');
    expect(html).toContain('Abrir en Google Maps');
    expect(html).not.toContain('Ver ubicaci');
  });

  it('builds public embed URLs when no key is supplied', () => {
    expect(googleMapsEmbedUrl('Miami, Florida')).toBe('https://www.google.com/maps?q=Miami%2C%20Florida&output=embed');
  });
});

describe('2Clics featured and related properties', () => {
  it('uses dynamic featured grid classes for one to four cards', () => {
    expect(featuredGridClassName(1)).toContain('twoclics-grid--featured-1');
    expect(featuredGridClassName(2)).toContain('twoclics-grid--featured-2');
    expect(featuredGridClassName(3)).toContain('twoclics-grid--featured-3');
    expect(featuredGridClassName(4)).toContain('twoclics-grid--featured-4');
    expect(featuredGridClassName(9)).toContain('twoclics-grid--featured-4');
  });

  // `FeaturedProperties` es un Server Component async (`getFeaturedPublicProperties`) — igual que
  // el contador de resultados de `app/propiedades/page.tsx` más abajo, se confirma la variante de
  // card en el código fuente en vez de renderizar el árbol completo, que requeriría datos reales
  // de 2Clics para tener sentido como test unitario.
  it('wires Home ("Oportunidades seleccionadas") to overlay-home and the catalog to overlay-catalog, reusing the same PropertyCard component — no duplicated card', () => {
    const homeSource = readFileSync('components/properties/FeaturedProperties.tsx', 'utf8');
    const catalogSource = readFileSync('app/propiedades/page.tsx', 'utf8');

    expect(homeSource).toContain("import PropertyCard from '@/components/properties/PropertyCard'");
    expect(homeSource).toContain('variant="overlay-home"');
    expect(catalogSource).toContain("import PropertyCard from '@/components/properties/PropertyCard'");
    expect(catalogSource).toContain('variant="overlay-catalog"');

    // No se creó una segunda card overlay específica para Home — no hay otro componente de card
    // en el árbol de components/properties además de PropertyCard/DevelopmentCard.
    expect(homeSource).not.toMatch(/FeaturedPropertyCard|HomeOverlayCard/);
  });

  it('keeps the ficha (related properties) on the default/compact card, untouched by this task', () => {
    const detailSource = readFileSync('components/properties/PropertyDetailView.tsx', 'utf8');
    expect(detailSource).toContain('compact');
    expect(detailSource).not.toContain('variant="overlay-home"');
    expect(detailSource).not.toContain('variant="overlay-catalog"');
  });

  it('ranks related properties by geography before commercial similarity', () => {
    const current = property({
      propertyId: 10,
      operationType: 'Venta',
      price: 250000,
      currency: 'USD',
      propertyType: { typeId: 1, name: 'Departamento' },
      location: recoletaLocation,
    });
    const sameEverything = property({
      propertyId: 11,
      operationType: 'Venta',
      price: 260000,
      currency: 'USD',
      propertyType: { typeId: 1, name: 'Departamento' },
      location: recoletaLocation,
    });
    const sameOperationOnly = property({
      propertyId: 12,
      operationType: 'Venta',
      price: 900000,
      currency: 'USD',
      propertyType: { typeId: 2, name: 'Casa' },
      location: { state: { stateId: 9, name: 'Florida' } },
    });
    const weakMatch = property({
      propertyId: 13,
      operationType: 'Alquiler',
      price: 250000,
      currency: 'USD',
      propertyType: { typeId: 9, name: 'Local' },
      location: { state: { stateId: 99, name: 'Otro' } },
    });

    const related = rankRelatedProperties(
      current,
      [current, weakMatch, sameOperationOnly, sameEverything],
      3,
    );

    expect(related.map((entry) => entry.propertyId)).toEqual([11]);
    expect(JSON.stringify(related)).not.toContain('"propertyId":10');
    expect(JSON.stringify(related)).not.toContain('Florida');
  });

  it('uses coordinates to sort nearby properties and excludes distant markets', () => {
    const current = property({
      propertyId: 20,
      lat: -34.4005,
      long: -58.6636,
      location: {
        state: { stateId: 1, name: 'Buenos Aires' },
        city: { cityId: 10, name: 'Tigre' },
        neighborhood: { neighborhoodId: 20, name: 'Benavidez' },
      },
    });
    const nearby = property({
      propertyId: 21,
      lat: -34.405,
      long: -58.66,
      operationType: 'Venta',
      location: {
        state: { stateId: 1, name: 'Buenos Aires' },
        city: { cityId: 10, name: 'Tigre' },
        neighborhood: { neighborhoodId: 21, name: 'Nordelta' },
      },
    });
    const sameStateNoCoords = property({
      propertyId: 22,
      lat: null,
      long: null,
      operationType: 'Venta',
      location: {
        state: { stateId: 1, name: 'Buenos Aires' },
        city: { cityId: 99, name: 'San Isidro' },
      },
    });
    const miami = property({
      propertyId: 23,
      lat: 25.7617,
      long: -80.1918,
      operationType: 'Venta',
      location: {
        state: { stateId: 9, name: 'Estados Unidos' },
        city: { cityId: 90, name: 'Miami' },
      },
    });

    const related = rankRelatedProperties(current, [miami, sameStateNoCoords, nearby], 3);

    expect(related.map((entry) => entry.propertyId)).toEqual([21, 22]);
  });
});

describe('2Clics catalog listing priority', () => {
  it('segments catalog pages with DESTACADO before SIMPLE globally', () => {
    const segments = propertyListingPrioritySegments(
      [
        { key: 'featured', webListing: 'DESTACADO', count: 3 },
        { key: 'simple', webListing: 'SIMPLE', count: 18 },
      ],
      0,
      5,
    );

    expect(segments).toEqual([
      { key: 'featured', webListing: 'DESTACADO', count: 3, offset: 0, limit: 3 },
      { key: 'simple', webListing: 'SIMPLE', count: 18, offset: 0, limit: 2 },
    ]);
  });

  it('keeps filters while requesting prioritized webListing buckets', () => {
    const filters = parsePropertyListingFilters({
      ubicacion: 'neighborhood:5029',
      operacion: 'venta',
      tipo: '7',
      limit: '30',
    });
    const noPrice: ResolvedPriceFilter = { status: 'no-operation', currencies: [], rawCurrency: '', rawMin: null, rawMax: null };

    expect(catalogPropertyRequest(filters, noPrice, 'DESTACADO', 0, 30)).toMatchObject({
      offset: 0,
      limit: 30,
      filters: {
        webListing: 'DESTACADO',
        neighborhood: 5029,
        operation_type: 'VENTA',
        property_type: 7,
      },
    });
    expect(catalogPropertyRequest(filters, noPrice, 'SIMPLE', 0, 30).filters?.webListing).toBe('SIMPLE');
  });

  it('paginates across the DESTACADO to SIMPLE boundary', () => {
    const segments = propertyListingPrioritySegments(
      [
        { key: 'featured', webListing: 'DESTACADO', count: 3 },
        { key: 'simple', webListing: 'SIMPLE', count: 18 },
      ],
      2,
      4,
    );

    expect(segments).toEqual([
      { key: 'featured', webListing: 'DESTACADO', count: 3, offset: 2, limit: 1 },
      { key: 'simple', webListing: 'SIMPLE', count: 18, offset: 0, limit: 3 },
    ]);
  });

  it('does not duplicate properties when buckets overlap unexpectedly', () => {
    const featured = property({ propertyId: 1, webListing: 'DESTACADO' });
    const duplicate = property({ propertyId: 1, webListing: 'SIMPLE' });
    const simple = property({ propertyId: 2, webListing: 'SIMPLE' });

    expect(dedupePublicProperties([featured, duplicate, simple]).map((entry) => entry.propertyId)).toEqual([1, 2]);
  });

  it('handles zero featured properties by starting with SIMPLE', () => {
    const segments = propertyListingPrioritySegments(
      [
        { key: 'featured', webListing: 'DESTACADO', count: 0 },
        { key: 'simple', webListing: 'SIMPLE', count: 6 },
      ],
      0,
      3,
    );

    expect(segments).toEqual([
      { key: 'simple', webListing: 'SIMPLE', count: 6, offset: 0, limit: 3 },
    ]);
  });

  it('handles catalogs with only featured properties', () => {
    const segments = propertyListingPrioritySegments(
      [
        { key: 'featured', webListing: 'DESTACADO', count: 5 },
        { key: 'simple', webListing: 'SIMPLE', count: 0 },
      ],
      0,
      3,
    );

    expect(segments).toEqual([
      { key: 'featured', webListing: 'DESTACADO', count: 5, offset: 0, limit: 3 },
    ]);
  });

  it('handles catalogs with only simple properties after offset', () => {
    const segments = propertyListingPrioritySegments(
      [
        { key: 'featured', webListing: 'DESTACADO', count: 0 },
        { key: 'simple', webListing: 'SIMPLE', count: 5 },
      ],
      3,
      3,
    );

    expect(segments).toEqual([
      { key: 'simple', webListing: 'SIMPLE', count: 5, offset: 3, limit: 2 },
    ]);
  });
});

describe('2Clics development UI', () => {
  it('renders developments as their own entity', () => {
    const development = adaptPublicDevelopment(
      {
        developmentId: 50,
        title: 'Torres del Sol',
        state: { name: 'Estados Unidos' },
        city: { name: 'Florida' },
        neighborhood: { name: 'Miami' },
        status: { name: 'En construcción' },
        type: { name: 'Edificio' },
        properties: [{ propertyId: '1001', address: 'Unidad 3A', price: '150000', currency: 'USD' }],
      },
      'AR',
    );
    const html = render(React.createElement(DevelopmentCard, { development }));

    expect(html).toContain('Desarrollo');
    expect(html).toContain('Torres del Sol');
    expect(html).toContain('Miami');
    expect(html).toContain('1 unidad asociada');
    expect(html).toContain('/desarrollos/50');
  });
});

describe('2Clics filters and states', () => {
  it('does not show temporary rental unless it is available or selected', () => {
    const html = render(
      React.createElement(PropertyFilters, {
        filters: {
          location: 'all',
          operation: 'all',
          propertyTypeId: null,
          bedrooms: null,
          rooms: null,
          aptoCredito: false,
          price: { currency: '', min: null, max: null },
          offset: 0,
          limit: 12,
        },
        propertyTypes: [{ typeId: 1, name: 'Casa' }],
        availableLocations: [
          { value: 'state:3', label: 'Bs.As. G.B.A. Norte', kind: 'state', count: 11 },
          { value: 'neighborhood:20', label: 'Miami', kind: 'neighborhood', count: 10 },
        ],
        availableOperations: ['venta', 'alquiler'],
        priceFacet: { currencies: [], rangeByCurrency: {} },
        resolvedPrice: { status: 'no-operation', currencies: [], rawCurrency: '', rawMin: null, rawMax: null },
      }),
    );

    expect(html).toContain('Casa');
    expect(html).toContain('Bs.As. G.B.A. Norte');
    expect(html).toContain('Miami');
    expect(html).not.toContain('Alquiler temporario');
  });

  it('selects the active "Tipo de propiedad" normally when it is among the public types', () => {
    const html = render(
      React.createElement(PropertyFilters, {
        filters: {
          location: 'all',
          operation: 'all',
          propertyTypeId: 2,
          bedrooms: null,
          rooms: null,
          aptoCredito: false,
          price: { currency: '', min: null, max: null },
          offset: 0,
          limit: 12,
        },
        propertyTypes: [
          { typeId: 1, name: 'Casa' },
          { typeId: 2, name: 'Departamento' },
        ],
        availableLocations: [],
        availableOperations: ['venta', 'alquiler'],
        priceFacet: { currencies: [], rangeByCurrency: {} },
        resolvedPrice: { status: 'no-operation', currencies: [], rawCurrency: '', rawMin: null, rawMax: null },
      }),
    );

    expect(html).toContain('value="2" selected');
    expect(html).not.toContain('Tipo seleccionado');
  });

  it('never lets the "Tipo de propiedad" <select> silently fall back to "Todos" when the active type no longer has public inventory', () => {
    const html = render(
      React.createElement(PropertyFilters, {
        filters: {
          location: 'all',
          operation: 'all',
          propertyTypeId: 7,
          bedrooms: null,
          rooms: null,
          aptoCredito: false,
          price: { currency: '', min: null, max: null },
          offset: 0,
          limit: 12,
        },
        propertyTypes: [
          { typeId: 1, name: 'Casa' },
          { typeId: 2, name: 'Departamento' },
        ],
        availableLocations: [],
        availableOperations: ['venta', 'alquiler'],
        priceFacet: { currencies: [], rangeByCurrency: {} },
        resolvedPrice: { status: 'no-operation', currencies: [], rawCurrency: '', rawMin: null, rawMax: null },
      }),
    );

    expect(html).toContain('Tipo seleccionado');
    expect(html).toContain('value="7" selected');
  });

  it('shows public location labels in filter options while keeping technical ids untouched', () => {
    const arProperty = property({
      region: 'AR',
      location: {
        state: { stateId: 3, name: 'Bs.As. G.B.A. Norte' },
        city: { cityId: 10, name: 'Tigre' },
        neighborhood: { neighborhoodId: 20, name: 'Benavídez' },
      },
    });
    const usProperty = property({
      region: 'US',
      location: {
        state: { stateId: 9, name: 'Estados Unidos' },
        city: { cityId: 90, name: 'Florida' },
        neighborhood: { neighborhoodId: 91, name: 'Miami' },
      },
    });

    const options = buildLocationOptions([arProperty, usProperty]);
    const byValue = Object.fromEntries(options.map((option) => [option.value, option.label]));

    expect(byValue['state:3']).toBe('Argentina');
    expect(byValue['city:10']).toBe('Tigre · Argentina');
    expect(byValue['neighborhood:20']).toBe('Benavídez · Tigre · Argentina');
    expect(byValue['state:9']).toBe('Estados Unidos');
    expect(byValue['city:90']).toBe('Florida · Estados Unidos');
    expect(byValue['neighborhood:91']).toBe('Miami · Florida · Estados Unidos');

    expect(Object.values(byValue).join(' | ')).not.toContain('Bs.As. G.B.A. Norte');
    expect(options.map((option) => option.value).sort()).toEqual(
      ['city:10', 'city:90', 'neighborhood:20', 'neighborhood:91', 'state:3', 'state:9'].sort(),
    );
  });

  it('derives "Tipo de propiedad" options only from types with at least one public property, never from the general account catalog', () => {
    const casa = property({ propertyType: { typeId: 1, name: 'Casa', appId: 'casa' } });
    const departamento = property({ propertyType: { typeId: 2, name: 'Departamento', appId: 'departamento' } });
    const anotherDepartamento = property({ propertyType: { typeId: 2, name: 'Departamento', appId: 'departamento' } });

    const types = buildAvailablePropertyTypes([casa, departamento, anotherDepartamento]);

    expect(types.map((type) => type.typeId).sort()).toEqual([1, 2]);
    expect(types.map((type) => type.name)).toEqual(['Casa', 'Departamento']);
  });

  it('does not include a property type with zero public properties', () => {
    const casa = property({ propertyType: { typeId: 1, name: 'Casa', appId: 'casa' } });

    const types = buildAvailablePropertyTypes([casa]);

    expect(types.some((type) => type.name === 'Oficina')).toBe(false);
    expect(types.map((type) => type.typeId)).toEqual([1]);
  });

  it('automatically includes a newly-published property type with no code changes needed', () => {
    const casa = property({ propertyType: { typeId: 1, name: 'Casa', appId: 'casa' } });
    const withoutPh = buildAvailablePropertyTypes([casa]);
    expect(withoutPh.some((type) => type.name === 'PH')).toBe(false);

    const ph = property({ propertyType: { typeId: 9, name: 'PH', appId: 'ph' } });
    const withPh = buildAvailablePropertyTypes([casa, ph]);
    expect(withPh.map((type) => type.name).sort()).toEqual(['Casa', 'PH']);
  });

  // Regresión de producción (2026-08-26): "Oficina" aparecía como opción del selector (viene de
  // `buildAvailablePropertyTypes`) pero al filtrar por ella no devolvía resultados — este test
  // recorre exactamente la misma canalización real (propiedad pública → tipos dinámicos → appId
  // resuelto) para CUALQUIER tipo dinámico, no solo Oficina, así protege también a un tipo nuevo
  // que 2Clics publique el día de mañana (ej. "PH" del test de arriba).
  it('carries the appId all the way from a real property through buildAvailablePropertyTypes to resolvePropertyTypeAppId — for Oficina and for any future dynamic type', () => {
    const oficina = property({ propertyType: { typeId: 8, name: 'Oficina', appId: '5793' } });
    const ph = property({ propertyType: { typeId: 9, name: 'PH', appId: '6001' } });

    const types = buildAvailablePropertyTypes([oficina, ph]);

    expect(resolvePropertyTypeAppId(8, types)).toBe('5793');
    expect(resolvePropertyTypeAppId(9, types)).toBe('6001');
  });

  it('hides "Limpiar filtros" when no filter is active', () => {
    const html = render(
      React.createElement(PropertyFilters, {
        filters: {
          location: 'all',
          operation: 'all',
          propertyTypeId: null,
          bedrooms: null,
          rooms: null,
          aptoCredito: false,
          price: { currency: '', min: null, max: null },
          offset: 0,
          limit: 30,
        },
        propertyTypes: [],
        availableLocations: [],
        availableOperations: ['venta', 'alquiler'],
        priceFacet: { currencies: [], rangeByCurrency: {} },
        resolvedPrice: { status: 'no-operation', currencies: [], rawCurrency: '', rawMin: null, rawMax: null },
      }),
    );

    expect(html).not.toContain('Limpiar filtros');
  });

  it('shows "Limpiar filtros" as a link to /propiedades when at least one filter is active', () => {
    const cases: Array<{
      location: 'all' | 'city:10';
      operation: 'all' | 'venta';
      propertyTypeId: number | null;
      bedrooms: number | null;
      rooms: number | null;
      aptoCredito: boolean;
    }> = [
      { location: 'city:10', operation: 'all', propertyTypeId: null, bedrooms: null, rooms: null, aptoCredito: false },
      { location: 'all', operation: 'venta', propertyTypeId: null, bedrooms: null, rooms: null, aptoCredito: false },
      { location: 'all', operation: 'all', propertyTypeId: 7, bedrooms: null, rooms: null, aptoCredito: false },
      { location: 'all', operation: 'all', propertyTypeId: null, bedrooms: 2, rooms: null, aptoCredito: false },
      { location: 'all', operation: 'all', propertyTypeId: null, bedrooms: null, rooms: 3, aptoCredito: false },
      { location: 'all', operation: 'all', propertyTypeId: null, bedrooms: null, rooms: null, aptoCredito: true },
    ];

    for (const filters of cases) {
      const html = render(
        React.createElement(PropertyFilters, {
          filters: { ...filters, price: { currency: '', min: null, max: null }, offset: 0, limit: 30 },
          propertyTypes: [],
          availableLocations: [],
          availableOperations: ['venta', 'alquiler'],
          priceFacet: { currencies: [], rangeByCurrency: {} },
          resolvedPrice: { status: 'no-operation', currencies: [], rawCurrency: '', rawMin: null, rawMax: null },
        }),
      );

      expect(html).toContain('Limpiar filtros');
      expect(html).toContain('href="/propiedades"');
    }
  });

  it('shows "Limpiar filtros" when only a price range is active (no other filter set)', () => {
    const html = render(
      React.createElement(PropertyFilters, {
        filters: {
          location: 'all',
          operation: 'venta',
          propertyTypeId: null,
          bedrooms: null,
          rooms: null,
          aptoCredito: false,
          price: { currency: 'U$D', min: 200000, max: null },
          offset: 0,
          limit: 30,
        },
        propertyTypes: [],
        availableLocations: [],
        availableOperations: ['venta', 'alquiler'],
        priceFacet: { currencies: ['U$D'], rangeByCurrency: { 'U$D': { min: 18000, max: 1300000 } } },
        resolvedPrice: {
          status: 'ready',
          currency: 'U$D',
          facetRange: { min: 18000, max: 1300000 },
          rawMin: 200000,
          rawMax: null,
          appliedMin: 200000,
          appliedMax: 1300000,
        },
      }),
    );

    expect(html).toContain('Limpiar filtros');
  });

  it('keeps pagination filters inside the documented 2Clics page size', () => {
    expect(parsePropertyListingFilters({}).limit).toBe(30);
    expect(parsePropertyListingFilters({ limit: '100' }).limit).toBe(30);

    const html = render(
      React.createElement(PropertyFilters, {
        filters: {
          location: 'all',
          operation: 'all',
          propertyTypeId: null,
          bedrooms: null,
          rooms: null,
          aptoCredito: false,
          price: { currency: '', min: null, max: null },
          offset: 0,
          limit: 30,
        },
        propertyTypes: [],
        availableLocations: [],
        availableOperations: ['venta', 'alquiler'],
        priceFacet: { currencies: [], rangeByCurrency: {} },
        resolvedPrice: { status: 'no-operation', currencies: [], rawCurrency: '', rawMin: null, rawMax: null },
      }),
    );

    expect(html).toContain('value="30"');
  });

  it('keeps new operation enums renderable without leaking raw enum style', () => {
    expect(formatOperation('ALQUILER_TEMPORARIO')).toBe('Alquiler temporario');
    expect(formatOperation('NUEVA_OPERACION')).toBe('Nueva Operacion');
  });

  it('uses the approved empty filter message', () => {
    expect(
      listingStateMessage({ status: 'ready', kind: 'catalog', filtered: true }),
    ).toBe('No encontramos propiedades con estos criterios. Probá modificando los filtros.');
  });

  it('keeps service errors neutral for public UI', () => {
    const html = render(React.createElement(ListingState, { status: 'unconfigured' }));

    expect(html).toContain('No pudimos cargar esta información');
    expect(html).not.toContain('TWOCLICS_API_KEY');
  });

  it('distinguishes valid empty results from service errors', () => {
    expect(listingStateMessage({ status: 'ready', kind: 'catalog' })).toBe(
      'Por ahora no hay propiedades publicadas para mostrar.',
    );
    expect(listingStateMessage({ status: 'error', kind: 'catalog' })).toContain(
      'No pudimos cargar esta información',
    );
  });
});

describe('2Clics price filter (Fase 1)', () => {
  const ventaFacet: PriceFacet = {
    currencies: ['U$D'],
    rangeByCurrency: { 'U$D': { min: 18000, max: 1300000 } },
  };
  const alquilerFacet: PriceFacet = {
    currencies: ['AR$', 'U$D'],
    rangeByCurrency: {
      'AR$': { min: 2017238, max: 2772000 },
      'U$D': { min: 620, max: 1600 },
    },
  };
  const noPrice = { currency: '', min: null, max: null } as const;

  it('is "no-operation" with no operation selected, carrying the global facet currencies for the Moneda select', () => {
    const resolved = resolvePriceFilter(noPrice, 'all', ventaFacet);
    expect(resolved).toEqual({
      status: 'no-operation',
      currencies: ['U$D'],
      rawCurrency: '',
      rawMin: null,
      rawMax: null,
    });
  });

  it('is "empty-facet" when the active combination has no priced inventory at all', () => {
    const resolved = resolvePriceFilter(noPrice, 'venta', { currencies: [], rangeByCurrency: {} });
    expect(resolved).toEqual({ status: 'empty-facet', rawCurrency: '', rawMin: null, rawMax: null });
  });

  it('infers currency automatically when the operation has exactly one (Venta → U$D)', () => {
    const resolved = resolvePriceFilter(noPrice, 'venta', ventaFacet);
    expect(resolved.status).toBe('ready');
    if (resolved.status === 'ready') {
      expect(resolved.currency).toBe('U$D');
      expect(resolved.appliedMin).toBeNull();
      expect(resolved.appliedMax).toBeNull();
    }
  });

  it('requires an explicit currency when the operation has more than one (Alquiler → U$D/AR$)', () => {
    const resolved = resolvePriceFilter(noPrice, 'alquiler', alquilerFacet);
    expect(resolved).toEqual({
      status: 'needs-currency',
      currencies: ['AR$', 'U$D'],
      rawMin: null,
      rawMax: null,
    });
  });

  it('recovers a stale incompatible currency when the new operation has exactly one real currency', () => {
    // El usuario tenía moneda=AR$ (Alquiler) y cambió a Venta, que solo tiene U$D: no hay
    // ambigüedad posible, así que se resuelve directo a U$D en vez de pedir moneda de nuevo.
    const resolved = resolvePriceFilter({ currency: 'AR$', min: null, max: null }, 'venta', ventaFacet);
    expect(resolved.status).toBe('ready');
    if (resolved.status === 'ready') expect(resolved.currency).toBe('U$D');
  });

  it('falls back to needs-currency when a stale currency does not match any option in the new facet', () => {
    // Moneda de otra cuenta/mercado (ej. "EUR") que ni siquiera existe en Alquiler (U$D/AR$).
    const resolved = resolvePriceFilter({ currency: 'EUR', min: null, max: null }, 'alquiler', alquilerFacet);
    expect(resolved).toEqual({
      status: 'needs-currency',
      currencies: ['AR$', 'U$D'],
      rawMin: null,
      rawMax: null,
    });
  });

  it('sends min+max exactly as typed when both are provided', () => {
    const resolved = resolvePriceFilter({ currency: 'U$D', min: 200000, max: 500000 }, 'venta', ventaFacet);
    expect(resolved).toMatchObject({ status: 'ready', appliedMin: 200000, appliedMax: 500000 });

    const filters = parsePropertyListingFilters({ operacion: 'venta', moneda: 'U$D' });
    const request = catalogPropertyRequest(filters, resolved, 'SIMPLE', 0, 30);
    expect(request.filters).toMatchObject({ currency: 'U$D', min_price: 200000, max_price: 500000 });
  });

  it('completes max_price with the real facet max when only "Desde" is filled', () => {
    const resolved = resolvePriceFilter({ currency: 'U$D', min: 200000, max: null }, 'venta', ventaFacet);
    expect(resolved).toMatchObject({ status: 'ready', rawMin: 200000, rawMax: null, appliedMin: 200000, appliedMax: 1300000 });
  });

  it('completes min_price with the real facet min when only "Hasta" is filled', () => {
    const resolved = resolvePriceFilter({ currency: 'U$D', min: null, max: 500000 }, 'venta', ventaFacet);
    expect(resolved).toMatchObject({ status: 'ready', rawMin: null, rawMax: 500000, appliedMin: 18000, appliedMax: 500000 });
  });

  it('sends no min_price/max_price/currency at all when neither input was filled', () => {
    const resolved = resolvePriceFilter({ currency: 'U$D', min: null, max: null }, 'venta', ventaFacet);
    expect(resolved).toMatchObject({ status: 'ready', appliedMin: null, appliedMax: null });

    const filters = parsePropertyListingFilters({ operacion: 'venta' });
    const request = catalogPropertyRequest(filters, resolved, 'SIMPLE', 0, 30);
    expect(request.filters).not.toHaveProperty('min_price');
    expect(request.filters).not.toHaveProperty('max_price');
    expect(request.filters).not.toHaveProperty('currency');
  });

  it('flags min > max as invalid, keeps the raw values, and never builds a request with them', () => {
    const resolved = resolvePriceFilter({ currency: 'U$D', min: 900000, max: 100000 }, 'venta', ventaFacet);
    expect(resolved).toMatchObject({ status: 'invalid-range', rawMin: 900000, rawMax: 100000 });

    const filters = parsePropertyListingFilters({ operacion: 'venta', moneda: 'U$D', precioMin: '900000', precioMax: '100000' });
    const request = catalogPropertyRequest(filters, resolved, 'SIMPLE', 0, 30);
    expect(request.filters).not.toHaveProperty('min_price');
    expect(request.filters).not.toHaveProperty('max_price');
  });

  it('renders the validation message and preserves what the user typed', () => {
    const resolved = resolvePriceFilter({ currency: 'U$D', min: 900000, max: 100000 }, 'venta', ventaFacet);
    const html = render(
      React.createElement(PropertyFilters, {
        filters: {
          location: 'all',
          operation: 'venta',
          propertyTypeId: null,
          bedrooms: null,
          rooms: null,
          aptoCredito: false,
          price: { currency: 'U$D', min: 900000, max: 100000 },
          offset: 0,
          limit: 30,
        },
        propertyTypes: [],
        availableLocations: [],
        availableOperations: ['venta', 'alquiler'],
        priceFacet: ventaFacet,
        resolvedPrice: resolved,
      }),
    );

    expect(html).toContain('El precio mínimo no puede ser mayor que el máximo');
    expect(html).toContain('value="900000"');
    expect(html).toContain('value="100000"');
  });

  it('keeps the DESTACADO → SIMPLE bucket priority when a price filter is active', () => {
    const filters = parsePropertyListingFilters({ operacion: 'venta', moneda: 'U$D', precioMin: '200000' });
    const resolved = resolvePriceFilter(filters.price, 'venta', ventaFacet);
    const destacado = catalogPropertyRequest(filters, resolved, 'DESTACADO', 0, 10);
    const simple = catalogPropertyRequest(filters, resolved, 'SIMPLE', 0, 10);

    expect(destacado.filters?.webListing).toBe('DESTACADO');
    expect(simple.filters?.webListing).toBe('SIMPLE');
    expect(destacado.filters).toMatchObject({ currency: 'U$D', min_price: 200000 });
    expect(simple.filters).toMatchObject({ currency: 'U$D', min_price: 200000 });
  });

  it('carries moneda/precioMin/precioMax forward across pagination ("Ver más")', () => {
    const filters = parsePropertyListingFilters({
      operacion: 'alquiler',
      moneda: 'AR$',
      precioMin: '2000000',
      precioMax: '3000000',
      limit: '30',
    });
    const href = nextPageHref(filters);

    expect(href).toContain('operacion=alquiler');
    expect(href).toContain('moneda=AR%24');
    expect(href).toContain('precioMin=2000000');
    expect(href).toContain('precioMax=3000000');
    expect(href).toContain('offset=30');
  });

  it('never renders "/mes", "mensual" or "por mes" — periodicity is not a confirmed 2Clics field', () => {
    const resolved = resolvePriceFilter({ currency: 'U$D', min: null, max: null }, 'alquiler', alquilerFacet);
    const html = render(
      React.createElement(PropertyFilters, {
        filters: {
          location: 'all',
          operation: 'alquiler',
          propertyTypeId: null,
          bedrooms: null,
          rooms: null,
          aptoCredito: false,
          price: { currency: 'U$D', min: null, max: null },
          offset: 0,
          limit: 30,
        },
        propertyTypes: [],
        availableLocations: [],
        availableOperations: ['venta', 'alquiler'],
        priceFacet: alquilerFacet,
        resolvedPrice: resolved,
      }),
    );

    expect(html).not.toContain('/mes');
    expect(html).not.toContain('mensual');
    expect(html).not.toContain('por mes');
  });
});

describe('2Clics Precio — un solo submit (pasada UX 2026-08-24)', () => {
  // Antes de esta pasada, Precio quedaba oculto detrás de un texto ("Elegí una operación") hasta
  // un primer submit que solo fijaba Operación — recién en un SEGUNDO submit el usuario podía
  // completar el rango. Ahora Moneda/Desde/Hasta están siempre visibles, así que Operación+Precio
  // se pueden completar juntos y aplicar en un único submit. La arquitectura de fondo (facet real,
  // min/max como par, currency obligatoria cuando corresponde) no cambió — estos tests verifican
  // la cadena completa parsePropertyListingFilters → resolvePriceFilter → catalogPropertyRequest a
  // partir de UN solo objeto de searchParams, sin ningún paso intermedio.
  const ventaFacet: PriceFacet = {
    currencies: ['U$D'],
    rangeByCurrency: { 'U$D': { min: 18000, max: 1300000 } },
  };
  const alquilerFacet: PriceFacet = {
    currencies: ['AR$', 'U$D'],
    rangeByCurrency: {
      'AR$': { min: 2017238, max: 2772000 },
      'U$D': { min: 620, max: 1600 },
    },
  };
  const globalFacet: PriceFacet = alquilerFacet; // unión realista de monedas cuando Operación='Todas'

  const baseFiltersProps = {
    propertyTypes: [],
    availableLocations: [],
    availableOperations: ['venta', 'alquiler'] as ListingOperationFilter[],
  };

  it('Venta + rango llegan en un único GET: moneda U$D inferida y rango aplicado sin round-trip intermedio', () => {
    const filters = parsePropertyListingFilters({
      operacion: 'venta',
      precioMin: '200000',
      precioMax: '500000',
    });
    expect(filters.price).toEqual({ currency: '', min: 200000, max: 500000 });

    const resolved = resolvePriceFilter(filters.price, filters.operation, ventaFacet);
    expect(resolved).toMatchObject({
      status: 'ready',
      currency: 'U$D',
      appliedMin: 200000,
      appliedMax: 500000,
    });

    const request = catalogPropertyRequest(filters, resolved, 'SIMPLE');
    expect(request.filters).toMatchObject({
      operation_type: 'VENTA',
      currency: 'U$D',
      min_price: 200000,
      max_price: 500000,
    });
  });

  it('Alquiler + moneda U$D + rango llegan en un único GET', () => {
    const filters = parsePropertyListingFilters({
      operacion: 'alquiler',
      moneda: 'U$D',
      precioMin: '700',
      precioMax: '1600',
    });
    const resolved = resolvePriceFilter(filters.price, filters.operation, alquilerFacet);
    expect(resolved).toMatchObject({ status: 'ready', currency: 'U$D', appliedMin: 700, appliedMax: 1600 });

    const request = catalogPropertyRequest(filters, resolved, 'SIMPLE');
    expect(request.filters).toMatchObject({
      operation_type: 'ALQUILER_PERMANENTE',
      currency: 'U$D',
      min_price: 700,
      max_price: 1600,
    });
  });

  it('Alquiler + moneda AR$ + rango llegan en un único GET', () => {
    const filters = parsePropertyListingFilters({
      operacion: 'alquiler',
      moneda: 'AR$',
      precioMin: '2100000',
      precioMax: '2700000',
    });
    const resolved = resolvePriceFilter(filters.price, filters.operation, alquilerFacet);
    expect(resolved).toMatchObject({
      status: 'ready',
      currency: 'AR$',
      appliedMin: 2100000,
      appliedMax: 2700000,
    });

    const request = catalogPropertyRequest(filters, resolved, 'SIMPLE');
    expect(request.filters).toMatchObject({
      operation_type: 'ALQUILER_PERMANENTE',
      currency: 'AR$',
      min_price: 2100000,
      max_price: 2700000,
    });
  });

  it('Venta con solo "Desde": "Hasta" se completa con la faceta real, en el mismo GET (min/max como par sigue intacto)', () => {
    const filters = parsePropertyListingFilters({ operacion: 'venta', precioMin: '300000' });
    const resolved = resolvePriceFilter(filters.price, filters.operation, ventaFacet);
    expect(resolved).toMatchObject({ status: 'ready', rawMin: 300000, rawMax: null, appliedMin: 300000, appliedMax: 1300000 });

    const request = catalogPropertyRequest(filters, resolved, 'SIMPLE');
    expect(request.filters).toMatchObject({ currency: 'U$D', min_price: 300000, max_price: 1300000 });
  });

  it('Precio sin Operación: muestra validación y NO manda ningún filtro de precio a 2Clics', () => {
    const filters = parsePropertyListingFilters({ precioMin: '200000', precioMax: '500000' });
    expect(filters.operation).toBe('all');

    const resolved = resolvePriceFilter(filters.price, filters.operation, globalFacet);
    expect(resolved).toMatchObject({ status: 'no-operation', rawMin: 200000, rawMax: 500000 });

    const request = catalogPropertyRequest(filters, resolved, 'SIMPLE');
    expect(request.filters).not.toHaveProperty('currency');
    expect(request.filters).not.toHaveProperty('min_price');
    expect(request.filters).not.toHaveProperty('max_price');

    const html = render(
      React.createElement(PropertyFilters, {
        ...baseFiltersProps,
        filters,
        priceFacet: globalFacet,
        resolvedPrice: resolved,
      }),
    );
    expect(html).toContain('Elegí Venta o Alquiler para filtrar por precio.');
    // Los valores tipeados por el usuario se conservan en los inputs, no se pierden.
    expect(html).toContain('value="200000"');
    expect(html).toContain('value="500000"');
  });

  it('Alquiler + Precio sin moneda: muestra validación y NO manda ningún filtro de precio a 2Clics', () => {
    const filters = parsePropertyListingFilters({ operacion: 'alquiler', precioMin: '700' });
    const resolved = resolvePriceFilter(filters.price, filters.operation, alquilerFacet);
    expect(resolved).toMatchObject({ status: 'needs-currency', rawMin: 700, rawMax: null });

    const request = catalogPropertyRequest(filters, resolved, 'SIMPLE');
    expect(request.filters).not.toHaveProperty('currency');
    expect(request.filters).not.toHaveProperty('min_price');
    expect(request.filters).not.toHaveProperty('max_price');

    const html = render(
      React.createElement(PropertyFilters, {
        ...baseFiltersProps,
        filters,
        priceFacet: alquilerFacet,
        resolvedPrice: resolved,
      }),
    );
    expect(html).toContain('Elegí una moneda para filtrar alquileres por precio.');
    expect(html).toContain('value="700"');
  });

  it('Sin Operación y sin Precio: estado normal, sin mensaje de error', () => {
    const filters = parsePropertyListingFilters({});
    const resolved = resolvePriceFilter(filters.price, filters.operation, globalFacet);
    expect(resolved).toMatchObject({ status: 'no-operation', rawMin: null, rawMax: null });

    const html = render(
      React.createElement(PropertyFilters, {
        ...baseFiltersProps,
        filters,
        priceFacet: globalFacet,
        resolvedPrice: resolved,
      }),
    );
    expect(html).not.toContain('Elegí Venta o Alquiler para filtrar por precio.');
    expect(html).not.toContain('role="alert"');
  });

  it('Alquiler sin moneda y sin Precio: estado normal, sin mensaje de error (no hay nada que validar todavía)', () => {
    const filters = parsePropertyListingFilters({ operacion: 'alquiler' });
    const resolved = resolvePriceFilter(filters.price, filters.operation, alquilerFacet);
    expect(resolved).toMatchObject({ status: 'needs-currency', rawMin: null, rawMax: null });

    const html = render(
      React.createElement(PropertyFilters, {
        ...baseFiltersProps,
        filters,
        priceFacet: alquilerFacet,
        resolvedPrice: resolved,
      }),
    );
    expect(html).not.toContain('Elegí una moneda para filtrar alquileres por precio.');
    expect(html).not.toContain('role="alert"');
  });

  it('Precio (Moneda/Desde/Hasta) está siempre visible, incluso con Operación="Todas" y sin faceta resuelta', () => {
    const filters = parsePropertyListingFilters({});
    const resolved = resolvePriceFilter(filters.price, filters.operation, globalFacet);

    const html = render(
      React.createElement(PropertyFilters, {
        ...baseFiltersProps,
        filters,
        priceFacet: globalFacet,
        resolvedPrice: resolved,
      }),
    );

    expect(html).toContain('<select id="moneda"');
    expect(html).toContain('>Automática</option>');
    expect(html).toContain('id="precioMin"');
    expect(html).toContain('id="precioMax"');
    // Sin operación resuelta no hay un único rango real — placeholder neutral, nunca un número
    // inventado mezclando escalas de Venta/Alquiler.
    expect(html).toContain('placeholder="Desde"');
    expect(html).toContain('placeholder="Hasta"');
  });
});

describe('2Clics bug real: Precio/Ubicación no deben perder el estado del usuario (2026-08-26)', () => {
  // Reportado por la usuaria: Ubicación=Estados Unidos + Operación=Alquiler + Moneda=U$D +
  // Hasta=300000 → el catálogo quedó en 0 resultados y el bloque Precio entero se reemplazó por
  // "Sin datos de precio", perdiendo moneda/rango. Verificado contra la API real (read-only, antes
  // de tocar código): Estados Unidos hoy no tiene NINGUNA propiedad en Alquiler (las 10 son
  // VENTA), así que 0 resultados es legítimo — pero eso NO justificaba borrar el filtro de precio
  // del formulario. searchParams/raw filters son la fuente del estado visual; la faceta solo
  // informa monedas válidas/mínimos/máximos reales, nunca debe borrar un filtro activo.
  const baseFiltersProps = {
    propertyTypes: [],
    availableLocations: [],
    availableOperations: ['venta', 'alquiler'] as ListingOperationFilter[],
  };
  const emptyFacet: PriceFacet = { currencies: [], rangeByCurrency: {} };

  it('reproduce el caso reportado a nivel de datos: faceta vacía conserva moneda/rango y no manda filtro ambiguo a 2Clics', () => {
    const filters = parsePropertyListingFilters({
      ubicacion: 'state:31',
      operacion: 'alquiler',
      moneda: 'U$D',
      precioMax: '300000',
    });
    const resolved = resolvePriceFilter(filters.price, filters.operation, emptyFacet);

    expect(resolved).toEqual({ status: 'empty-facet', rawCurrency: 'U$D', rawMin: null, rawMax: 300000 });

    const request = catalogPropertyRequest(filters, resolved, 'SIMPLE');
    expect(request.filters).not.toHaveProperty('currency');
    expect(request.filters).not.toHaveProperty('min_price');
    expect(request.filters).not.toHaveProperty('max_price');
    // La ubicación y la operación SÍ siguen viajando a 2Clics — el 0 resultados es legítimo, no
    // un efecto secundario de haber perdido el resto de los filtros.
    expect(request.filters).toMatchObject({ state: 31, operation_type: 'ALQUILER_PERMANENTE' });
  });

  it('faceta vacía + rango/moneda activos: Precio sigue mostrando Moneda/Desde/Hasta editables, nunca "Sin datos de precio"', () => {
    const filters = parsePropertyListingFilters({
      ubicacion: 'state:31',
      operacion: 'alquiler',
      moneda: 'U$D',
      precioMax: '300000',
    });
    const resolved = resolvePriceFilter(filters.price, filters.operation, emptyFacet);

    const html = render(
      React.createElement(PropertyFilters, {
        ...baseFiltersProps,
        filters,
        priceFacet: emptyFacet,
        resolvedPrice: resolved,
      }),
    );

    expect(html).not.toContain('Sin datos de precio');
    expect(html).toContain('<select id="moneda"');
    expect(html).toContain('id="precioMin"');
    expect(html).toContain('id="precioMax"');
    // Moneda elegida se preserva como opción seleccionada — el <select> nunca cae a "Automática"
    // en silencio aunque la faceta actual no tenga ninguna moneda propia.
    expect(html).toContain('<option value="U$D" selected="">U$D</option>');
    expect(html).toContain('value="300000"');
  });

  it('faceta vacía SIN ningún filtro de precio activo: muestra una nota neutral, no un error de validación', () => {
    const filters = parsePropertyListingFilters({ ubicacion: 'state:31', operacion: 'alquiler' });
    const resolved = resolvePriceFilter(filters.price, filters.operation, emptyFacet);
    expect(resolved).toEqual({ status: 'empty-facet', rawCurrency: '', rawMin: null, rawMax: null });

    const html = render(
      React.createElement(PropertyFilters, {
        ...baseFiltersProps,
        filters,
        priceFacet: emptyFacet,
        resolvedPrice: resolved,
      }),
    );

    expect(html).toContain('No hay datos de precio para esta combinación de filtros.');
    expect(html).not.toContain('role="alert"');
    // Los inputs siguen presentes y editables — la nota es informativa, no reemplaza el control.
    expect(html).toContain('id="precioMin"');
    expect(html).toContain('id="precioMax"');
  });

  it('locationFacetRequest ya no recorta por Operación/Tipo/Dormitorios/Ambientes/Apto crédito — solo así el <select> de Ubicación puede representar fielmente cualquier combinación activa', () => {
    const request = locationFacetRequest();
    expect(request.filters).toEqual({});
  });

  it('el <select> de Ubicación nunca cae silenciosamente a "Todas": si el valor activo no está en availableLocations, se agrega como opción de respaldo', () => {
    const filters = parsePropertyListingFilters({ ubicacion: 'state:9999' });
    const html = render(
      React.createElement(PropertyFilters, {
        filters,
        propertyTypes: [],
        availableLocations: [],
        availableOperations: ['venta', 'alquiler'] as ListingOperationFilter[],
        priceFacet: { currencies: [], rangeByCurrency: {} },
        resolvedPrice: { status: 'no-operation', currencies: [], rawCurrency: '', rawMin: null, rawMax: null },
      }),
    );

    expect(html).toContain('<option value="state:9999"');
    expect(html).toContain('<select id="ubicacion" name="ubicacion"><option value="all">Todas</option><option value="state:9999"');
  });

  it('Operación no cambia sola: el <select> siempre refleja exactamente filters.operation, sin fallback ni recuperación implícita', () => {
    for (const operacion of ['venta', 'alquiler'] as const) {
      const filters = parsePropertyListingFilters({ ubicacion: 'state:31', operacion });
      const html = render(
        React.createElement(PropertyFilters, {
          filters,
          propertyTypes: [],
          availableLocations: [],
          availableOperations: ['venta', 'alquiler'] as ListingOperationFilter[],
          priceFacet: { currencies: [], rangeByCurrency: {} },
          resolvedPrice: { status: 'empty-facet', rawCurrency: '', rawMin: null, rawMax: null },
        }),
      );
      const label = operacion === 'venta' ? 'Venta' : 'Alquiler';
      expect(html).toContain(`<option value="${operacion}" selected="">${label}</option>`);
      // Ninguna otra opción de operación queda marcada como seleccionada a la vez.
      const otherValue = operacion === 'venta' ? 'alquiler' : 'venta';
      expect(html).not.toContain(`<option value="${otherValue}" selected="">`);
      expect(html).not.toContain('<option value="all" selected="">');
    }
  });
});

describe('2Clics bug real: property_type requiere appId, no typeId (2026-08-26)', () => {
  // Encontrado durante la QA integral del buscador (no reportado por la usuaria, pero real y
  // reproducible): probado contra la API real, `property_type: 2` (el typeId numérico de "Casa",
  // el mismo valor que ya se usaba en toda la app — searchParams `?tipo=2`, `<option value={typeId}>`,
  // `PropertyListingFilters.propertyTypeId`) devuelve `status:"fail"` — 2Clics lo trata como "0
  // resultados", indistinguible de un filtro legítimo sin match. `property_type: "5791"` (el appId
  // de Casa, tal como lo devuelve `/api/property-type`) sí funciona y devuelve las 3 Casa reales.
  // Esto significa que el filtro Tipo NUNCA filtró correctamente antes de este fix — cualquier
  // selección de Tipo (Casa/Departamento/Oficina/Terreno) mostraba 0 resultados en vivo, sin
  // ningún error visible. Verificado en browser real después del fix: Tipo=Casa → 3, Tipo=
  // Departamento → 12, Tipo=Oficina → 4, Tipo=Terreno/Lote → 2 (coincide exactamente con el
  // inventario auditado). El contrato público (`PropertyListingFilters.propertyTypeId`,
  // `?tipo=`, `catalogPropertyRequest`) sigue usando typeId sin cambios — la traducción a appId
  // ocurre recién en `getPropertyCatalog`, justo antes de la llamada real a 2Clics.
  const propertyTypes: TwoclicsPropertyType[] = [
    { typeId: 2, name: 'Casa', appId: '5791', group: '1' },
    { typeId: 1, name: 'Departamento', appId: '5785', group: '1' },
    { typeId: 8, name: 'Oficina', appId: '5793', group: '1' },
  ];

  it('resolvePropertyTypeAppId traduce el typeId activo a su appId real', () => {
    expect(resolvePropertyTypeAppId(2, propertyTypes)).toBe('5791');
    expect(resolvePropertyTypeAppId(1, propertyTypes)).toBe('5785');
  });

  // Bug real de producción (2026-08-26): con la lista dinámica de tipos (`buildAvailablePropertyTypes`,
  // ver más abajo), Oficina pasó a resolverse igual que cualquier otro tipo con inventario público
  // real — este test fija ese contrato específicamente para Oficina, el tipo que se reportó roto.
  it('resolvePropertyTypeAppId traduce Oficina (typeId público 8) a su appId real, igual que cualquier otro tipo con inventario', () => {
    expect(resolvePropertyTypeAppId(8, propertyTypes)).toBe('5793');
  });

  it('withResolvedPropertyType arma el request de catálogo correcto para Oficina (mismo contrato público ?tipo=8, appId solo server-side)', () => {
    const officeTypeId = 8;
    const request = { offset: 0, limit: 30, filters: { property_type: officeTypeId, operation_type: 'ALQUILER_PERMANENTE' } };
    const appId = resolvePropertyTypeAppId(officeTypeId, propertyTypes);
    expect(withResolvedPropertyType(request, appId).filters).toMatchObject({
      property_type: '5793',
      operation_type: 'ALQUILER_PERMANENTE',
    });
  });

  it('resolvePropertyTypeAppId devuelve null sin tipo activo o si el typeId no existe en la lista', () => {
    expect(resolvePropertyTypeAppId(null, propertyTypes)).toBeNull();
    expect(resolvePropertyTypeAppId(999, propertyTypes)).toBeNull();
  });

  it('withResolvedPropertyType reemplaza el typeId numérico por el appId antes de la llamada real a 2Clics', () => {
    const request = { offset: 0, limit: 30, filters: { property_type: 2, operation_type: 'VENTA' } };
    expect(withResolvedPropertyType(request, '5791').filters).toMatchObject({
      property_type: '5791',
      operation_type: 'VENTA',
    });
  });

  it('withResolvedPropertyType omite property_type por completo si no se pudo resolver un appId (nunca manda el typeId crudo)', () => {
    const request = { offset: 0, limit: 30, filters: { property_type: 999, operation_type: 'VENTA' } };
    const result = withResolvedPropertyType(request, null);
    expect(result.filters).not.toHaveProperty('property_type');
    expect(result.filters).toMatchObject({ operation_type: 'VENTA' });
  });

  it('withResolvedPropertyType no toca el request si Tipo no estaba activo (sin property_type en los filtros)', () => {
    const request = { offset: 0, limit: 30, filters: { operation_type: 'VENTA' } };
    expect(withResolvedPropertyType(request, '5791')).toBe(request);
  });
});

describe('2Clics "Más filtros" — dormitorios/ambientes/apto crédito (Fase 2)', () => {
  // Semántica confirmada contra la API real (2026-08-21, read-only, previa a implementar):
  // amount_bedroom/amount_room son match EXACTO — amount_bedroom=1 devolvió solo las 15
  // propiedades con amountBedroom===1 (excluyó las 4 con amountBedroom===2), no "1 o más". Los
  // combos (bed+room, bed+operación, bed+aptCredit) filtran en AND. amount_bedroom=0 fue probado
  // aparte y la API lo ignora en silencio (devuelve el universo sin filtrar) — por eso 0 nunca es
  // una opción ni se manda como filtro. aptCredit=true/false filtran exacto por boolean.

  it('parses dormitorios/ambientes only within the fixed 1-4 set, discarding anything else', () => {
    expect(parsePropertyListingFilters({ dormitorios: '1' }).bedrooms).toBe(1);
    expect(parsePropertyListingFilters({ dormitorios: '4' }).bedrooms).toBe(4);
    expect(parsePropertyListingFilters({ dormitorios: '0' }).bedrooms).toBeNull();
    expect(parsePropertyListingFilters({ dormitorios: '5' }).bedrooms).toBeNull();
    expect(parsePropertyListingFilters({ dormitorios: 'abc' }).bedrooms).toBeNull();
    expect(parsePropertyListingFilters({}).bedrooms).toBeNull();

    expect(parsePropertyListingFilters({ ambientes: '3' }).rooms).toBe(3);
    expect(parsePropertyListingFilters({ ambientes: '0' }).rooms).toBeNull();
    expect(parsePropertyListingFilters({ ambientes: '99' }).rooms).toBeNull();
    expect(parsePropertyListingFilters({}).rooms).toBeNull();
  });

  it('parses aptoCredito as a plain on/off flag — only "1" activates it', () => {
    expect(parsePropertyListingFilters({ aptoCredito: '1' }).aptoCredito).toBe(true);
    expect(parsePropertyListingFilters({}).aptoCredito).toBe(false);
    expect(parsePropertyListingFilters({ aptoCredito: '0' }).aptoCredito).toBe(false);
    expect(parsePropertyListingFilters({ aptoCredito: 'true' }).aptoCredito).toBe(false);
  });

  it('sends amount_bedroom/amount_room/aptCredit to 2Clics only when active, never a fabricated 0', () => {
    const noPrice: ResolvedPriceFilter = { status: 'no-operation', currencies: [], rawCurrency: '', rawMin: null, rawMax: null };

    const inactive = parsePropertyListingFilters({});
    expect(catalogPropertyRequest(inactive, noPrice, 'SIMPLE').filters).not.toHaveProperty('amount_bedroom');
    expect(catalogPropertyRequest(inactive, noPrice, 'SIMPLE').filters).not.toHaveProperty('amount_room');
    expect(catalogPropertyRequest(inactive, noPrice, 'SIMPLE').filters).not.toHaveProperty('aptCredit');

    const active = parsePropertyListingFilters({ dormitorios: '2', ambientes: '3', aptoCredito: '1' });
    expect(catalogPropertyRequest(active, noPrice, 'SIMPLE').filters).toMatchObject({
      amount_bedroom: 2,
      amount_room: 3,
      aptCredit: true,
    });
  });

  it('combines dormitorios/ambientes/aptoCredito with operación/tipo/ubicación in AND, never replacing them', () => {
    const noPrice: ResolvedPriceFilter = { status: 'no-operation', currencies: [], rawCurrency: '', rawMin: null, rawMax: null };
    const filters = parsePropertyListingFilters({
      operacion: 'venta',
      tipo: '7',
      ubicacion: 'neighborhood:5029',
      dormitorios: '2',
      ambientes: '3',
      aptoCredito: '1',
    });

    expect(catalogPropertyRequest(filters, noPrice, 'DESTACADO', 0, 30).filters).toMatchObject({
      webListing: 'DESTACADO',
      operation_type: 'VENTA',
      property_type: 7,
      neighborhood: 5029,
      amount_bedroom: 2,
      amount_room: 3,
      aptCredit: true,
    });
    // La prioridad DESTACADO → SIMPLE sigue intacta: los filtros nuevos recortan el universo
    // dentro de cada bucket, nunca cambian el orden comercial.
    expect(catalogPropertyRequest(filters, noPrice, 'SIMPLE', 0, 30).filters?.webListing).toBe('SIMPLE');
  });

  it('carries dormitorios/ambientes/aptoCredito forward across pagination ("Ver más")', () => {
    const filters = parsePropertyListingFilters({
      dormitorios: '2',
      ambientes: '3',
      aptoCredito: '1',
      limit: '30',
    });
    const href = nextPageHref(filters);

    expect(href).toContain('dormitorios=2');
    expect(href).toContain('ambientes=3');
    expect(href).toContain('aptoCredito=1');
    expect(href).toContain('offset=30');
  });

  it('omits dormitorios/ambientes/aptoCredito from "Ver más" when none is active', () => {
    const href = nextPageHref(parsePropertyListingFilters({ limit: '30' }));

    expect(href).not.toContain('dormitorios');
    expect(href).not.toContain('ambientes');
    expect(href).not.toContain('aptoCredito');
  });

  const baseFiltersProps = {
    propertyTypes: [],
    availableLocations: [],
    availableOperations: ['venta', 'alquiler'] as ListingOperationFilter[],
    priceFacet: { currencies: [], rangeByCurrency: {} },
    resolvedPrice: { status: 'no-operation', currencies: [], rawCurrency: '', rawMin: null, rawMax: null } as ResolvedPriceFilter,
  };

  it('renders "Más filtros" closed by default when no secondary filter is active', () => {
    const html = render(
      React.createElement(PropertyFilters, {
        ...baseFiltersProps,
        filters: {
          location: 'all',
          operation: 'all',
          propertyTypeId: null,
          bedrooms: null,
          rooms: null,
          aptoCredito: false,
          price: { currency: '', min: null, max: null },
          offset: 0,
          limit: 30,
        },
      }),
    );

    expect(html).toContain('Más filtros');
    expect(html).toContain('<details class="twoclics-filter-more">');
  });

  it('renders "Más filtros" open when dormitorios/ambientes/aptoCredito arrives active from the URL', () => {
    const cases: Array<Pick<PropertyListingFilters, 'bedrooms' | 'rooms' | 'aptoCredito'>> = [
      { bedrooms: 2, rooms: null, aptoCredito: false },
      { bedrooms: null, rooms: 3, aptoCredito: false },
      { bedrooms: null, rooms: null, aptoCredito: true },
    ];

    for (const secondary of cases) {
      const html = render(
        React.createElement(PropertyFilters, {
          ...baseFiltersProps,
          filters: {
            location: 'all',
            operation: 'all',
            propertyTypeId: null,
            ...secondary,
            price: { currency: '', min: null, max: null },
            offset: 0,
            limit: 30,
          },
        }),
      );

      expect(html).toContain('<details class="twoclics-filter-more" open');
    }
  });

  it('renders Dormitorios/Ambientes as fixed Todos/1/2/3/4 options and marks the active one selected', () => {
    const html = render(
      React.createElement(PropertyFilters, {
        ...baseFiltersProps,
        filters: {
          location: 'all',
          operation: 'all',
          propertyTypeId: null,
          bedrooms: 2,
          rooms: null,
          aptoCredito: false,
          price: { currency: '', min: null, max: null },
          offset: 0,
          limit: 30,
        },
      }),
    );

    expect(html).toContain('Dormitorios');
    expect(html).toContain('Ambientes');
    expect(html).toContain('Apto crédito');
    expect(html).not.toContain('1+');
    expect(html).not.toContain('4+');

    // No es un <select> nativo (dispararía el picker de pantalla completa en mobile) — es un
    // grupo de radios reales presentados como pills, con "Todos" como radio adicional value="".
    expect(html).not.toContain('<select id="dormitorios"');
    expect(html).not.toContain('<select id="ambientes"');
    expect(html).toContain('role="radiogroup"');

    // React SSR coloca `checked` inmediatamente después de `name` (antes de `value`) para
    // inputs no controlados con defaultChecked — de ahí el orden de los literales siguientes.
    expect(html).toContain('id="dormitorios-todos" name="dormitorios" value=""');
    expect(html).not.toContain('id="dormitorios-todos" name="dormitorios" checked');
    expect(html).toContain('id="dormitorios-1" name="dormitorios" value="1"');
    expect(html).not.toContain('id="dormitorios-1" name="dormitorios" checked');
    expect(html).toContain('id="dormitorios-2" name="dormitorios" checked="" value="2"');
    expect(html).toContain('for="dormitorios-2">2</label>');
    expect(html).toContain('for="dormitorios-todos">Todos</label>');
  });

  it('marks the right radio active for dormitorios=1 and ambientes=2 independently, each from its own group', () => {
    const html = render(
      React.createElement(PropertyFilters, {
        ...baseFiltersProps,
        filters: {
          location: 'all',
          operation: 'all',
          propertyTypeId: null,
          bedrooms: 1,
          rooms: 2,
          aptoCredito: false,
          price: { currency: '', min: null, max: null },
          offset: 0,
          limit: 30,
        },
      }),
    );

    expect(html).toContain('id="dormitorios-1" name="dormitorios" checked="" value="1"');
    expect(html).toContain('id="ambientes-2" name="ambientes" checked="" value="2"');
    // Cada grupo es su propio radiogroup — un valor activo en Dormitorios no marca nada en
    // Ambientes por accidente (name distinto: "dormitorios" vs. "ambientes").
    expect(html).not.toContain('id="dormitorios-2" name="dormitorios" checked');
    expect(html).not.toContain('id="ambientes-1" name="ambientes" checked');
    expect(html).not.toContain('id="dormitorios-todos" name="dormitorios" checked');
    expect(html).not.toContain('id="ambientes-todos" name="ambientes" checked');
  });

  it('marks "Todos" as the active radio when no dormitorios/ambientes filter is set', () => {
    const html = render(
      React.createElement(PropertyFilters, {
        ...baseFiltersProps,
        filters: {
          location: 'all',
          operation: 'all',
          propertyTypeId: null,
          bedrooms: null,
          rooms: null,
          aptoCredito: false,
          price: { currency: '', min: null, max: null },
          offset: 0,
          limit: 30,
        },
      }),
    );

    expect(html).toContain('id="dormitorios-todos" name="dormitorios" checked="" value=""');
    expect(html).toContain('id="ambientes-todos" name="ambientes" checked="" value=""');
  });

  it('keeps the checkbox unchecked by default and only checked when aptoCredito is active', () => {
    const unchecked = render(
      React.createElement(PropertyFilters, {
        ...baseFiltersProps,
        filters: {
          location: 'all',
          operation: 'all',
          propertyTypeId: null,
          bedrooms: null,
          rooms: null,
          aptoCredito: false,
          price: { currency: '', min: null, max: null },
          offset: 0,
          limit: 30,
        },
      }),
    );
    expect(unchecked).toContain('name="aptoCredito"');
    // Scoped al propio checkbox — el html completo ahora incluye radios "Todos" marcados por
    // defecto (Dormitorios/Ambientes sin filtro activo), así que un `.not.toContain('checked=""')`
    // sobre el documento entero ya no sirve para aislar el estado del checkbox.
    expect(unchecked.match(/<input type="checkbox" id="aptoCredito"[^>]*\/>/)?.[0]).not.toContain(
      'checked',
    );

    const checked = render(
      React.createElement(PropertyFilters, {
        ...baseFiltersProps,
        filters: {
          location: 'all',
          operation: 'all',
          propertyTypeId: null,
          bedrooms: null,
          rooms: null,
          aptoCredito: true,
          price: { currency: '', min: null, max: null },
          offset: 0,
          limit: 30,
        },
      }),
    );
    expect(checked.match(/<input type="checkbox" id="aptoCredito"[^>]*\/>/)?.[0]).toContain(
      'checked=""',
    );
  });
});

describe('2Clics result counter reliability (Fase 1.1)', () => {
  // Formas reales confirmadas contra la API (2026-08-21):
  // - éxito con datos: { status: 'success', properties: [...], count: N }
  // - 0 coincidencias LEGÍTIMAS (bucket vacío / property_type inexistente / rango de precio sin
  //   match — probado en los tres): { status: 'fail' } — HTTP 200, sin count/properties/description.
  // - error real (validación, api_key inválida): HTTP 4xx/401 con `description` — nunca llega a
  //   propertyResponseCount() porque lib/2clics/client.ts ya tira TwoclicsApiError antes.
  it('treats a real numeric count (including an explicit zero) as reliable', () => {
    expect(propertyResponseCount({ status: 'success', count: 5, properties: [] })).toEqual({
      count: 5,
      reliable: true,
    });
    expect(propertyResponseCount({ status: 'success', count: 0, properties: [] })).toEqual({
      count: 0,
      reliable: true,
    });
  });

  it('normalizes the confirmed empty-result "fail" shape to count:0, reliable:true', () => {
    expect(propertyResponseCount({ status: 'fail' })).toEqual({ count: 0, reliable: true });
  });

  it('does NOT treat an error-shaped "fail" response (has a description) as zero results', () => {
    const result = propertyResponseCount({ status: 'fail', description: 'API Key error' });
    expect(result.reliable).toBe(false);
  });

  it('stays conservative (unreliable) for any other unexpected shape — never fabricates a count', () => {
    expect(propertyResponseCount({}).reliable).toBe(false);
    expect(propertyResponseCount({ status: 'success' }).reliable).toBe(false);
  });

  it('sums DESTACADO=0 + SIMPLE>0 into a reliable, correct total', () => {
    const destacado = propertyResponseCount({ status: 'fail' });
    const simple = propertyResponseCount({ status: 'success', count: 7, properties: [] });

    expect(destacado).toEqual({ count: 0, reliable: true });
    expect(simple).toEqual({ count: 7, reliable: true });
    expect(destacado.count + simple.count).toBe(7);
    expect(destacado.reliable && simple.reliable).toBe(true);
  });

  it('sums DESTACADO>0 + SIMPLE=0 into a reliable, correct total', () => {
    const destacado = propertyResponseCount({ status: 'success', count: 3, properties: [] });
    const simple = propertyResponseCount({ status: 'fail' });

    expect(destacado.count + simple.count).toBe(3);
    expect(destacado.reliable && simple.reliable).toBe(true);
  });

  it('sums both buckets empty into a reliable, confident zero (0 resultados is a valid state)', () => {
    const destacado = propertyResponseCount({ status: 'fail' });
    const simple = propertyResponseCount({ status: 'fail' });

    expect(destacado.reliable && simple.reliable).toBe(true);
    expect(destacado.count + simple.count).toBe(0);
  });

  it('shows a stable fallback label instead of hiding the counter when the total is not reliable', () => {
    // El contador vive en app/propiedades/page.tsx (Server Component async, no una unidad
    // aislada) — se confirma el fallback en el código fuente en vez de renderizar la página
    // completa, que requeriría datos reales de 2Clics para tener sentido como test unitario.
    const pageSource = readFileSync('app/propiedades/page.tsx', 'utf8');
    expect(pageSource).toContain('Resultados filtrados');
    expect(pageSource).toContain('catalog.propertyTotalCount !== null');
  });
});
