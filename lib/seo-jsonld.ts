import 'server-only';
import { CANONICAL_BASE_URL } from '@/lib/env';
import { absoluteShareUrl, shareDescription } from '@/lib/share-metadata';
import type { PublicProperty } from '@/lib/2clics/types';

// Datos estructurados (schema.org) de una ficha de propiedad — el bloque que lee Google, invisible
// para el visitante. Se arma SOLO con lo que la ficha ya muestra públicamente (adapter whitelist de
// `lib/2clics`): nunca `meta_data`, notas internas ni la dirección exacta (la ubicación pública es
// barrio · ciudad · país). Si falta un dato, el campo se omite: nunca se inventa ni se rellena.

const CURRENCY_CODES: Record<string, string> = {
  'U$D': 'USD',
  USD: 'USD',
  'US$': 'USD',
  'AR$': 'ARS',
  ARS: 'ARS',
};

const ABOUT_TYPES: Record<string, string> = {
  casa: 'House',
  departamento: 'Apartment',
};

type JsonLd = Record<string, unknown>;

function positive(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function buildPropertyJsonLd(property: PublicProperty): JsonLd | null {
  const propertyId = property.propertyId;
  if (!propertyId || !property.title) return null;

  const url = `${CANONICAL_BASE_URL}/propiedades/${propertyId}`;
  const typeName = String(property.propertyType?.name || '').trim().toLowerCase();

  const locality = property.location.neighborhood?.name || property.location.city?.name;
  const address: JsonLd = {
    '@type': 'PostalAddress',
    ...(locality ? { addressLocality: locality } : {}),
    // La provincia cruda de 2Clics no se publica (regla del sitio); solo el estado de Estados Unidos.
    ...(property.region === 'US' && property.location.state?.name ? { addressRegion: property.location.state.name } : {}),
    addressCountry: property.region === 'US' ? 'US' : 'AR',
  };

  const totalArea = positive(property.totalArea) ?? positive(property.coveredArea);
  const about: JsonLd = {
    '@type': ABOUT_TYPES[typeName] || 'Accommodation',
    ...(positive(property.amountRoom) ? { numberOfRooms: positive(property.amountRoom) } : {}),
    ...(positive(property.amountBedroom) ? { numberOfBedrooms: positive(property.amountBedroom) } : {}),
    ...(totalArea ? { floorSize: { '@type': 'QuantitativeValue', value: totalArea, unitCode: 'MTK' } } : {}),
    address,
  };

  const currency = CURRENCY_CODES[String(property.currency || '').trim()];
  const price = positive(property.price);
  const offers: JsonLd | undefined =
    !property.hidePrice && price && currency
      ? {
          '@type': 'Offer',
          price,
          priceCurrency: currency,
          seller: { '@id': `${CANONICAL_BASE_URL}/#organization` },
        }
      : undefined;

  const images = property.images
    .map((image) => absoluteShareUrl(image.displayUrl))
    .filter((value): value is string => Boolean(value))
    .slice(0, 5);
  const description = shareDescription(property.description, 300);

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': `${url}#listing`,
    url,
    name: property.title,
    ...(description ? { description } : {}),
    ...(images.length ? { image: images } : {}),
    about,
    ...(offers ? { offers } : {}),
  };
}

// Serialización segura para insertar en un <script type="application/ld+json">: escapa `<` para que
// ningún texto de 2Clics pueda cerrar la etiqueta.
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
