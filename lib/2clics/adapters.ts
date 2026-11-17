import { sanitizeImageUrl } from '@/lib/security/ssrf';
import { parsePublicMetadata } from '@/lib/2clics/metadata';
import { classifyTwoclicsMarketFromLocation } from '@/lib/2clics/regions';
import { formatLocationMarketLabel, formatOperation } from '@/lib/2clics/format';
import type {
  PublicDevelopment,
  PublicDevelopmentUnit,
  PublicImage,
  PublicMetadata,
  PublicProperty,
  TwoclicsDevelopmentDetail,
  TwoclicsDevelopmentListItem,
  TwoclicsDevelopmentPropertyRef,
  TwoclicsImage,
  TwoclicsPropertyDetail,
  TwoclicsPropertyListItem,
  TwoclicsPropertyType,
  TwoclicsRegion,
  TwoclicsAmenity,
  TwoclicsCity,
  TwoclicsNeighborhood,
  TwoclicsState,
} from '@/lib/2clics/types';

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Lista blanca para objetos de 2Clics que se copiaban enteros: se conservan solo las claves
// conocidas y solo valores simples. Si la API agrega campos internos mañana, no llegan al público.
// (Auditoría 2026-11-17; cubierto por tests/qa/twoclics.qa.test.ts.)
function copyKnown<T>(value: unknown, keys: readonly string[]): T | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    const v = (value as Record<string, unknown>)[key];
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[key] = v;
  }
  return out as T;
}

const PROPERTY_TYPE_KEYS = ['typeId', 'name', 'appId', 'group'] as const;
const AMENITY_KEYS = ['amenitieId', 'name', 'appId', 'type'] as const;
const DEV_CATALOG_KEYS = ['typeId', 'statusId', 'name', 'appId', 'mlId', 'zpId', 'apId'] as const;

function adaptAmenities(value: unknown): TwoclicsAmenity[] {
  return (Array.isArray(value) ? value : [])
    .map((item) => copyKnown<TwoclicsAmenity>(item, AMENITY_KEYS))
    .filter((item): item is TwoclicsAmenity => item !== null);
}

function adaptLocationPart<T>(value: unknown, idKey: string): T | undefined {
  return copyKnown<T>(value, [idKey, 'name']) ?? undefined;
}

function boolOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const parsed = num(value);
    if (parsed !== null) return parsed;
  }
  return null;
}

function propertyTitle(property: TwoclicsPropertyListItem | TwoclicsPropertyDetail): string {
  const urlTitle = titleFromPublicUrl(property.url);
  return (
    str(property.alternativeAddress) ||
    urlTitle ||
    str(property.address) ||
    (property.propertyId ? `Propiedad ${property.propertyId}` : 'Propiedad')
  );
}

function publicTitle(
  fallbackTitle: string,
  metadata: PublicMetadata,
): string {
  return metadata.title || fallbackTitle;
}

function titleFromPublicUrl(url: unknown): string {
  const rawUrl = str(url);
  if (!rawUrl) return '';

  try {
    const pathname = new URL(rawUrl).pathname;
    const segment = decodeURIComponent(pathname.split('/').filter(Boolean).pop() || '');
    const slug = segment.replace(/^\d+_/, '').trim();
    if (!slug || slug === segment) return '';
    return slug
      .split('-')
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/^./, (char) => char.toUpperCase());
  } catch {
    return '';
  }
}

export function adaptImage(image: TwoclicsImage | undefined, index = 0): PublicImage | null {
  if (!image) return null;

  const url = sanitizeImageUrl(image.url || '');
  const thumbnailUrl = sanitizeImageUrl(image.thumbnailUrl || '');
  const virtualizedUrl = sanitizeImageUrl(image.virtualizedUrl || '');
  const thumbnailVirtualizedUrl = sanitizeImageUrl(image.thumbnailVirtualizedUrl || '');
  const useVirtualized = Boolean(image.useVirtualized && virtualizedUrl);
  const displayUrl = useVirtualized ? virtualizedUrl : url;
  const displayThumbnailUrl = useVirtualized
    ? thumbnailVirtualizedUrl || virtualizedUrl
    : thumbnailUrl || url;

  if (!displayUrl) return null;

  return {
    id: str(image.imageId) || `image-${index}`,
    name: str(image.name),
    url,
    thumbnailUrl,
    displayUrl,
    displayThumbnailUrl,
    useVirtualized,
  };
}

export function adaptImages(images: TwoclicsImage[] | undefined): PublicImage[] {
  return (Array.isArray(images) ? images : [])
    .map((image, index) => adaptImage(image, index))
    .filter((image): image is PublicImage => Boolean(image));
}

function adaptDevelopmentParent(property: TwoclicsPropertyDetail): PublicProperty['developmentParent'] {
  if (!property.developmentParent) return null;
  const status = property.developmentParent.status || {};
  const statusName = typeof status.name === 'string' ? status.name : '';
  return {
    developmentId: num(property.developmentParent.developmentId),
    title: str(property.developmentParent.title),
    statusName,
  };
}

export function adaptPublicProperty(
  property: TwoclicsPropertyListItem | TwoclicsPropertyDetail,
  region: TwoclicsRegion,
): PublicProperty {
  const market = classifyTwoclicsMarketFromLocation(property, region);
  const detail = property as TwoclicsPropertyDetail;
  const metadata = parsePublicMetadata(property.meta_data);
  const location = {
    state: adaptLocationPart<TwoclicsState>(property.state, 'stateId'),
    city: adaptLocationPart<TwoclicsCity>(property.city, 'cityId'),
    neighborhood: adaptLocationPart<TwoclicsNeighborhood>(property.neighborhood, 'neighborhoodId'),
  };

  return {
    source: '2clics-api',
    region: market.region,
    marketLabel: formatLocationMarketLabel(location) || market.label,
    propertyId: num(property.propertyId),
    title: publicTitle(propertyTitle(property), metadata),
    address: str(property.address),
    alternativeAddress: str(property.alternativeAddress),
    number: str(property.number),
    publishDate: str(property.publishDate),
    modifiedDate: str(property.modifiedDate),
    lat: num(property.lat),
    long: num(property.long),
    url: str(property.url),
    description: metadata.description || '',
    price: num(property.price),
    currency: str(property.currency),
    hidePrice: Boolean(property.hidePrice),
    operationType: formatOperation(str(property.operationType)),
    amountRoom: firstNumber(property.amountRoom, metadata.rooms),
    amountBedroom: firstNumber(property.amountBedroom, metadata.bedrooms),
    aptCredit: boolOrNull(property.aptCredit),
    coveredArea: firstNumber(property.coveredArea, metadata.coveredArea),
    uncoveredArea: num(property.uncoveredArea),
    semiCoveredArea: firstNumber(property.semiCoveredArea, metadata.semiCoveredArea),
    totalArea: firstNumber(property.totalArea, metadata.totalArea),
    status: str(property.status),
    statusDiffusion: str(property.statusDiffusion),
    webListing: str(property.webListing),
    propertyType: copyKnown<TwoclicsPropertyType>(property.propertyType, PROPERTY_TYPE_KEYS),
    location,
    images: adaptImages(property.images),
    amenities: adaptAmenities(detail.amenities),
    metadata,
    developmentParent: adaptDevelopmentParent(detail),
  };
}

function adaptPropertyType(value: TwoclicsDevelopmentPropertyRef['propertyType']): TwoclicsPropertyType | null {
  return copyKnown<TwoclicsPropertyType>(value, PROPERTY_TYPE_KEYS);
}

export function adaptDevelopmentUnit(unit: TwoclicsDevelopmentPropertyRef): PublicDevelopmentUnit {
  return {
    propertyId: str(unit.propertyId),
    address: str(unit.address),
    price: num(unit.price),
    currency: str(unit.currency),
    amountRoom: num(unit.amountRoom),
    amountBedroom: num(unit.amountBedroom),
    coveredArea: num(unit.coveredArea),
    uncoveredArea: num(unit.uncoveredArea),
    totalArea: num(unit.totalArea),
    propertyType: adaptPropertyType(unit.propertyType),
    images: adaptImages(unit.images),
  };
}

export function adaptPublicDevelopment(
  development: TwoclicsDevelopmentListItem | TwoclicsDevelopmentDetail,
  region: TwoclicsRegion,
): PublicDevelopment {
  const market = classifyTwoclicsMarketFromLocation(development, region);
  const detail = development as TwoclicsDevelopmentDetail;
  const metadata = parsePublicMetadata(development.meta_data);
  const location = {
    state: adaptLocationPart<TwoclicsState>(development.state, 'stateId'),
    city: adaptLocationPart<TwoclicsCity>(development.city, 'cityId'),
    neighborhood: adaptLocationPart<TwoclicsNeighborhood>(development.neighborhood, 'neighborhoodId'),
  };
  const title = str(development.title) ||
    metadata.title ||
    (development.developmentId ? `Desarrollo ${development.developmentId}` : 'Desarrollo');

  return {
    source: '2clics-api',
    region: market.region,
    marketLabel: formatLocationMarketLabel(location) || market.label,
    developmentId: num(development.developmentId),
    title,
    address: str(development.address),
    number: str(development.number),
    publishDate: str(development.publishDate),
    modifiedDate: str(development.modifiedDate),
    lat: num(development.lat),
    long: num(development.long),
    url: str(development.url),
    description: metadata.description || '',
    location,
    type: copyKnown<NonNullable<PublicDevelopment['type']>>(development.type, DEV_CATALOG_KEYS),
    status: copyKnown<NonNullable<PublicDevelopment['status']>>(development.status, DEV_CATALOG_KEYS),
    images: adaptImages(development.images),
    plans: adaptImages(detail.plans),
    amenities: adaptAmenities(detail.amenities),
    metadata,
    properties: (Array.isArray(development.properties) ? development.properties : []).map(
      adaptDevelopmentUnit,
    ),
  };
}
