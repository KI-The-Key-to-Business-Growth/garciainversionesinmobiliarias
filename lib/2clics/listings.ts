import 'server-only';
import { cache } from 'react';
import { adaptPublicDevelopment, adaptPublicProperty } from '@/lib/2clics/adapters';
import { getTwoclicsReadCacheOptions } from '@/lib/2clics/cache';
import {
  getTwoclicsRegionConfig,
  MissingTwoclicsCredentialsError,
} from '@/lib/2clics/config';
import { formatOperation, formatPublicLocation, operationFilterToApi } from '@/lib/2clics/format';
import {
  twoclicsClient,
  isAmbiguousFailResponse,
  TwoclicsApiError,
  TwoclicsNetworkError,
  TwoclicsTimeoutError,
} from '@/lib/2clics/client';
import type {
  PublicDevelopment,
  PublicLocation,
  PublicProperty,
  TwoclicsGetPropertiesRequest,
  TwoclicsPropertyFilters,
  TwoclicsPropertyType,
  TwoclicsRegion,
} from '@/lib/2clics/types';

type ListingLocationKind = 'state' | 'city' | 'neighborhood';
export type ListingLocationFilter = 'all' | `${ListingLocationKind}:${number}`;
export type ListingOperationFilter = 'all' | 'venta' | 'alquiler' | 'temporario';

// Precio tal como llega crudo de searchParams (moneda/precioMin/precioMax) — sin resolver
// todavía contra la faceta. `currency` vacío = no elegida/no aplica.
export type PriceFilterInput = {
  currency: string;
  min: number | null;
  max: number | null;
};

export type PropertyListingFilters = {
  location: ListingLocationFilter;
  operation: ListingOperationFilter;
  propertyTypeId: number | null;
  bedrooms: number | null;
  rooms: number | null;
  aptoCredito: boolean;
  price: PriceFilterInput;
  offset: number;
  limit: number;
};

// Confirmado contra la API real (2026-08-21): amount_bedroom/amount_room son EXACT match (no
// "N o más") — amount_bedroom=1 excluye propiedades con 2 dormitorios, no las incluye. El
// inventario auditado hoy solo tiene dormitorios 1-2 y ambientes 1-3, pero se ofrecen las 4
// opciones fijas igual (sin inventar un "+"): una consulta por 3/4 que hoy no matchea nada es un
// resultado legítimo (0), no un error. amount_bedroom=0/amount_room=0 fueron probados aparte: la
// API los ignora en silencio (devuelve el universo sin filtrar) — por eso nunca se ofrece "0" como
// opción ni se manda como filtro.
export const BEDROOM_ROOM_FILTER_OPTIONS = [1, 2, 3, 4] as const;

export type PriceFacetRange = { min: number; max: number };

// Universo de precio disponible para operación+ubicación+tipo activos, ignorando el propio
// rango de precio (así el rango no se autolimita al calcular sus propios extremos).
export type PriceFacet = {
  currencies: string[];
  rangeByCurrency: Record<string, PriceFacetRange>;
};

// Resultado de contrastar el precio crudo del usuario contra la faceta real. Precio ahora se
// muestra SIEMPRE (Moneda/Desde/Hasta visibles desde el primer render, incluso sin Operación —
// pasada UX 2026-08-24, ver docs/ai/PROPERTY_UX_DECISIONS.md), así que cada estado conserva
// rawMin/rawMax (y currencies/rawCurrency cuando aplica) para que la UI nunca pierda lo que el
// usuario ya escribió, sin importar en qué estado está Precio:
// - no-operation: Operación = Todas. `currencies` es la faceta GLOBAL (ignora operación, para que
//   el selector de Moneda tenga opciones reales incluso antes de elegir Venta/Alquiler). Si hay
//   rango cargado (rawMin/rawMax), la UI debe mostrar "Elegí Venta o Alquiler para filtrar por
//   precio." — pero NUNCA se manda un rango ambiguo a 2Clics en este estado.
// - empty-facet: hay Operación, pero la combinación actual (+ubicación/tipo/dormitorios/ambientes)
//   no tiene NINGUNA propiedad con precio — no hay currencies ni rango real que ofrecer. Bug real
//   confirmado 2026-08-26: esto NO debe borrar la moneda/rango que el usuario ya tenía cargados
//   (ej. llegó con `?ubicacion=state:31&operacion=alquiler&moneda=U$D&precioMax=300000` a un
//   mercado que no tiene ningún Alquiler) — por eso conserva rawCurrency/rawMin/rawMax igual que
//   los demás estados no resueltos, en vez de descartarlos.
// - needs-currency: 2+ monedas disponibles en la faceta de la operación y ninguna (o una inválida)
//   fue elegida todavía. Si hay rango cargado, la UI debe mostrar "Elegí una moneda para filtrar
//   alquileres por precio."
// - invalid-range: el usuario escribió mínimo > máximo.
// - ready: moneda resuelta (inferida o elegida); appliedMin/appliedMax son los valores que se
//   mandan a 2Clics (completando el que falte con el extremo real de la faceta), NUNCA los que
//   se muestran en el input — eso sigue siendo rawMin/rawMax, tal cual los escribió el usuario.
export type ResolvedPriceFilter =
  | {
      status: 'no-operation';
      currencies: string[];
      rawCurrency: string;
      rawMin: number | null;
      rawMax: number | null;
    }
  | {
      status: 'empty-facet';
      rawCurrency: string;
      rawMin: number | null;
      rawMax: number | null;
    }
  | {
      status: 'needs-currency';
      currencies: string[];
      rawMin: number | null;
      rawMax: number | null;
    }
  | {
      status: 'invalid-range';
      currency: string;
      facetRange: PriceFacetRange;
      rawMin: number | null;
      rawMax: number | null;
    }
  | {
      status: 'ready';
      currency: string;
      facetRange: PriceFacetRange;
      rawMin: number | null;
      rawMax: number | null;
      appliedMin: number | null;
      appliedMax: number | null;
    };

export type ListingLocationOption = {
  value: ListingLocationFilter;
  label: string;
  kind: ListingLocationKind;
  count: number;
};

export type ListingsStatus = 'ready' | 'unconfigured' | 'error';

export type PropertyCatalogResult = {
  status: ListingsStatus;
  filters: PropertyListingFilters;
  properties: PublicProperty[];
  propertyTotalCount: number | null;
  developments: PublicDevelopment[];
  propertyTypes: TwoclicsPropertyType[];
  availableLocations: ListingLocationOption[];
  availableOperations: ListingOperationFilter[];
  priceFacet: PriceFacet;
  resolvedPrice: ResolvedPriceFilter;
  hasMore: boolean;
};

export type SinglePropertyResult = {
  status: ListingsStatus | 'not-found';
  property: PublicProperty | null;
};

export type SingleDevelopmentResult = {
  status: ListingsStatus | 'not-found';
  development: PublicDevelopment | null;
};

const MAX_LIMIT = 30;
const DEFAULT_LIMIT = MAX_LIMIT;
export const PUBLIC_CATALOG_WEB_LISTINGS = ['DESTACADO', 'SIMPLE'] as const;

export type PublicCatalogWebListing = (typeof PUBLIC_CATALOG_WEB_LISTINGS)[number];

export type PropertyListingPriorityBucket = {
  key: string;
  region?: TwoclicsRegion;
  webListing: PublicCatalogWebListing;
  count: number;
};

export type PropertyListingPrioritySegment = PropertyListingPriorityBucket & {
  offset: number;
  limit: number;
};

function toNumber(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// A diferencia de toNumber, un precio de 0 es un límite válido (ej. "Desde 0") — solo se
// descarta si es negativo, no numérico, o el searchParam está vacío/ausente.
function toPriceNumber(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function toStringValue(value: string | string[] | undefined): string {
  return String(Array.isArray(value) ? value[0] : value || '').trim();
}

// Solo acepta los 4 valores fijos que la UI ofrece (Dormitorios/Ambientes) — un ?dormitorios=99
// manual no se manda tal cual a 2Clics, se ignora como si no estuviera (misma postura que
// toNumber con valores no positivos).
function toBedroomOrRoomFilter(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const n = Number(raw);
  return (BEDROOM_ROOM_FILTER_OPTIONS as readonly number[]).includes(n) ? n : null;
}

export function parsePropertyListingFilters(
  searchParams: Record<string, string | string[] | undefined>,
): PropertyListingFilters {
  const location = toStringValue(searchParams.ubicacion);
  const operation = toStringValue(searchParams.operacion);
  const offset = toNumber(searchParams.offset) || 0;
  const limit = Math.min(toNumber(searchParams.limit) || DEFAULT_LIMIT, MAX_LIMIT);

  return {
    location: parseLocationFilter(location),
    operation:
      operation === 'venta' || operation === 'alquiler' || operation === 'temporario'
        ? operation
        : 'all',
    propertyTypeId: toNumber(searchParams.tipo),
    bedrooms: toBedroomOrRoomFilter(searchParams.dormitorios),
    rooms: toBedroomOrRoomFilter(searchParams.ambientes),
    aptoCredito: toStringValue(searchParams.aptoCredito) === '1',
    price: {
      currency: toStringValue(searchParams.moneda),
      min: toPriceNumber(searchParams.precioMin),
      max: toPriceNumber(searchParams.precioMax),
    },
    offset,
    limit,
  };
}

// Inversa de parsePropertyListingFilters: arma el href de "Ver más" a partir de los searchParams
// CRUDOS (no de los valores resueltos/completados contra la faceta) — misma lógica de siempre
// para Ubicación/Operación/Tipo; Precio sigue el mismo criterio para no ensuciar la URL con
// datos derivados que el usuario no escribió.
// `basePath` por defecto preserva el comportamiento original (/propiedades). /comprar y /alquilar
// pasan su propia ruta para que "Ver más" nunca saque al usuario de la página en la que está.
export function nextPageHref(filters: PropertyListingFilters, basePath = '/propiedades'): string {
  const params = new URLSearchParams();
  if (filters.location !== 'all') params.set('ubicacion', filters.location);
  if (filters.operation !== 'all') params.set('operacion', filters.operation);
  if (filters.propertyTypeId) params.set('tipo', String(filters.propertyTypeId));
  if (filters.bedrooms) params.set('dormitorios', String(filters.bedrooms));
  if (filters.rooms) params.set('ambientes', String(filters.rooms));
  if (filters.aptoCredito) params.set('aptoCredito', '1');
  if (filters.price.currency) params.set('moneda', filters.price.currency);
  if (filters.price.min !== null) params.set('precioMin', String(filters.price.min));
  if (filters.price.max !== null) params.set('precioMax', String(filters.price.max));
  params.set('offset', String(filters.offset + filters.limit));
  params.set('limit', String(filters.limit));
  return `${basePath}?${params.toString()}`;
}

function parseLocationFilter(value: string): ListingLocationFilter {
  if (!value || value === 'all') return 'all';
  const [kind, rawId] = value.split(':');
  const id = Number(rawId);
  if (
    (kind === 'state' || kind === 'city' || kind === 'neighborhood') &&
    Number.isInteger(id) &&
    id > 0
  ) {
    return `${kind}:${id}`;
  }
  return 'all';
}

function hasConfiguredCredentials(): boolean {
  return getTwoclicsRegionConfig('AR').enabled || getTwoclicsRegionConfig('US').enabled;
}

function credentialSignature(region: TwoclicsRegion): string {
  const cfg = getTwoclicsRegionConfig(region);
  return `${cfg.apiKeySource}:${cfg.enabled}`;
}

function regionsForCatalog(): TwoclicsRegion[] {
  const ar = getTwoclicsRegionConfig('AR');
  const us = getTwoclicsRegionConfig('US');

  if (!ar.enabled && us.enabled) return ['US'];
  if (ar.apiKeySource === 'region' && us.apiKeySource === 'region') return ['AR', 'US'];
  return ['AR'];
}

function regionsForDetail(): TwoclicsRegion[] {
  const ar = getTwoclicsRegionConfig('AR');
  const us = getTwoclicsRegionConfig('US');
  if (!ar.enabled && us.enabled) return ['US'];
  if (ar.apiKeySource === 'region' && us.apiKeySource === 'region') return ['AR', 'US'];
  return ['AR'];
}

function locationFilterParts(filter: ListingLocationFilter): {
  kind: ListingLocationKind;
  id: number;
} | null {
  if (filter === 'all') return null;
  const [kind, rawId] = filter.split(':') as [ListingLocationKind, string];
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? { kind, id } : null;
}

function locationMatches(location: PublicLocation, filter: ListingLocationFilter): boolean {
  const parts = locationFilterParts(filter);
  if (!parts) return true;
  if (parts.kind === 'state') return location.state?.stateId === parts.id;
  if (parts.kind === 'city') return location.city?.cityId === parts.id;
  return location.neighborhood?.neighborhoodId === parts.id;
}

function propertyMatchesLocation(property: PublicProperty, location: ListingLocationFilter): boolean {
  return locationMatches(property.location, location);
}

function developmentMatchesLocation(
  development: PublicDevelopment,
  location: ListingLocationFilter,
): boolean {
  return locationMatches(development.location, location);
}

function operationFromPublicProperty(property: PublicProperty): ListingOperationFilter | null {
  const label = formatOperation(property.operationType).toLowerCase();
  if (label === 'venta') return 'venta';
  if (label === 'alquiler') return 'alquiler';
  if (label === 'alquiler temporario') return 'temporario';
  return null;
}

function collectAvailableOperations(properties: PublicProperty[]): ListingOperationFilter[] {
  const operations = new Set<ListingOperationFilter>(['venta', 'alquiler']);
  for (const property of properties) {
    const operation = operationFromPublicProperty(property);
    if (operation) operations.add(operation);
  }
  return Array.from(operations);
}

function publicErrorStatus(error: unknown): ListingsStatus {
  if (error instanceof MissingTwoclicsCredentialsError) return 'unconfigured';
  if (error instanceof TwoclicsApiError) return 'error';
  return 'error';
}

function handledExternalErrorSummary(error: unknown): string | null {
  if (error instanceof MissingTwoclicsCredentialsError) return 'missing_credentials';
  if (error instanceof TwoclicsTimeoutError) return 'timeout';
  if (error instanceof TwoclicsNetworkError) {
    return error.causeCode ? `network:${error.causeCode}` : 'network';
  }
  if (error instanceof TwoclicsApiError) return `http:${error.statusCode}`;
  return null;
}

function logTwoclicsFailure(scope: string, error: unknown): void {
  const summary = handledExternalErrorSummary(error);
  if (summary) {
    console.warn(`[2clics] ${scope} unavailable (${summary}).`);
    return;
  }

  console.error(`[2clics] ${scope} failed unexpectedly:`, error);
}

const EMPTY_PRICE_FACET: PriceFacet = { currencies: [], rangeByCurrency: {} };
const INACTIVE_PRICE_NO_OPERATION: ResolvedPriceFilter = {
  status: 'no-operation',
  currencies: [],
  rawCurrency: '',
  rawMin: null,
  rawMax: null,
};

function emptyCatalog(
  status: ListingsStatus,
  filters: PropertyListingFilters,
): PropertyCatalogResult {
  return {
    status,
    filters,
    properties: [],
    propertyTotalCount: null,
    developments: [],
    propertyTypes: [],
    availableLocations: [],
    availableOperations: ['venta', 'alquiler'],
    priceFacet: EMPTY_PRICE_FACET,
    resolvedPrice: INACTIVE_PRICE_NO_OPERATION,
    hasMore: false,
  };
}

function locationFilterToApi(filter: ListingLocationFilter): Partial<TwoclicsPropertyFilters> {
  const parts = locationFilterParts(filter);
  if (!parts) return {};
  return { [parts.kind]: parts.id };
}

// Filtros compartidos por el catálogo y por la faceta de precio: operación + tipo + ubicación +
// dormitorios/ambientes/apto crédito. Deliberadamente NO incluye precio/moneda — eso es lo que
// distingue a cada consumidor. amount_bedroom/amount_room solo se agregan si hay un valor de la
// lista fija (1-4) — el 0 nunca llega hasta acá porque toBedroomOrRoomFilter ya lo descarta, y de
// cualquier forma la API confirmó que lo ignora. aptCredit solo se manda como `true` cuando el
// checkbox está marcado — desmarcado significa "sin filtro", no "false" (no hay control para
// buscar explícitamente "no apto crédito" en esta fase).
function baseApiFilters(filters: PropertyListingFilters): TwoclicsPropertyFilters {
  return {
    ...(filters.operation !== 'all'
      ? { operation_type: operationFilterToApi(filters.operation) }
      : {}),
    ...(filters.propertyTypeId ? { property_type: filters.propertyTypeId } : {}),
    ...(filters.bedrooms ? { amount_bedroom: filters.bedrooms } : {}),
    ...(filters.rooms ? { amount_room: filters.rooms } : {}),
    ...(filters.aptoCredito ? { aptCredit: true } : {}),
    ...locationFilterToApi(filters.location),
  };
}

// La auditoría real (2026-08-21) confirmó que 2Clics ignora min_price/max_price en silencio si
// se manda uno solo — por eso acá SOLO se agregan si ambos (appliedMin/appliedMax) están
// resueltos. currency viaja siempre junto al rango: sin ella la API compara precios de monedas
// distintas como si fueran números comparables.
// Bug real confirmado 2026-08-26: el filtro `property_type` de 2Clics solo funciona con el `appId`
// (string, ej. "5791") — el `typeId` numérico (ej. 2) que ya se usaba en toda la app
// (`?tipo=`, `<option value={typeId}>`, `PropertyListingFilters.propertyTypeId`) hace que la API
// responda `status:"fail"` en silencio, indistinguible de "0 resultados legítimos" salvo que se
// sepa de antemano que el tipo SÍ tiene inventario real (confirmado probando contra la API real:
// `property_type: 2` con propiedades Casa reales devolvía fail; `property_type: "5791"` — el
// appId de Casa — devolvía las 3 Casa correctas). Se resuelve la traducción typeId→appId acá, con
// los tipos ya cargados, sin cambiar el contrato público de `PropertyListingFilters`/
// `catalogPropertyRequest` (siguen usando typeId — la traducción ocurre recién en
// `withResolvedPropertyType`, justo antes de la llamada real a 2Clics en `getPropertyCatalog`).
export function resolvePropertyTypeAppId(
  typeId: number | null,
  propertyTypes: TwoclicsPropertyType[],
): string | null {
  if (!typeId) return null;
  return propertyTypes.find((type) => type.typeId === typeId)?.appId || null;
}

// Reemplaza `property_type` (typeId numérico, si el request lo trae) por el appId resuelto, justo
// antes de mandar el request real a 2Clics. Si no se pudo resolver un appId (tipo desconocido/
// stale), se omite el filtro por completo en vez de mandar un typeId que la API ignoraría con un
// "fail" silencioso — mismo criterio ya usado para valores de filtro inválidos en otros lados
// (ej. dormitorios/ambientes fuera de la lista fija).
export function withResolvedPropertyType(
  request: TwoclicsGetPropertiesRequest,
  propertyTypeAppId: string | null,
): TwoclicsGetPropertiesRequest {
  if (!request.filters || request.filters.property_type === undefined) return request;
  const filters = { ...request.filters };
  if (propertyTypeAppId) {
    filters.property_type = propertyTypeAppId;
  } else {
    delete filters.property_type;
  }
  return { ...request, filters };
}

function priceApiFilters(resolvedPrice: ResolvedPriceFilter): Partial<TwoclicsPropertyFilters> {
  if (resolvedPrice.status !== 'ready') return {};
  if (resolvedPrice.appliedMin === null || resolvedPrice.appliedMax === null) return {};
  return {
    currency: resolvedPrice.currency,
    min_price: resolvedPrice.appliedMin,
    max_price: resolvedPrice.appliedMax,
  };
}

function propertyRequest(
  filters: PropertyListingFilters,
  resolvedPrice: ResolvedPriceFilter,
): TwoclicsGetPropertiesRequest {
  const apiFilters: TwoclicsPropertyFilters = {
    ...baseApiFilters(filters),
    ...priceApiFilters(resolvedPrice),
  };

  return {
    offset: filters.offset,
    limit: filters.limit,
    filters: apiFilters,
  };
}

// Faceta de precio: mismo universo que el catálogo (operación + ubicación + tipo activos) pero
// ignorando el propio rango de precio — así min/max reflejan el universo disponible ANTES de
// aplicar ese rango, no lo que quedaría después.
function priceFacetRequest(filters: PropertyListingFilters): TwoclicsGetPropertiesRequest {
  return {
    offset: 0,
    limit: MAX_LIMIT,
    filters: baseApiFilters(filters),
  };
}

async function fetchPriceFacet(
  filters: PropertyListingFilters,
  propertyTypeAppId: string | null,
  regions: TwoclicsRegion[],
  cacheOptions: ReturnType<typeof getTwoclicsReadCacheOptions>,
): Promise<PriceFacet> {
  const request = withResolvedPropertyType(priceFacetRequest(filters), propertyTypeAppId);
  const responses = await Promise.all(
    regions.map((region) => twoclicsClient.getProperties(region, request, cacheOptions)),
  );

  const pricesByCurrency = new Map<string, number[]>();
  for (const response of responses) {
    for (const property of response.properties || []) {
      const currency = String(property.currency || '').trim();
      const price = Number(property.price);
      // Precios <=0 no son un límite real publicable — mismo criterio que el resto del catálogo
      // (formatArea/countValue ya descartan valores <=0 en vez de mostrarlos como dato válido).
      if (!currency || !Number.isFinite(price) || price <= 0) continue;
      if (!pricesByCurrency.has(currency)) pricesByCurrency.set(currency, []);
      pricesByCurrency.get(currency)!.push(price);
    }
  }

  const rangeByCurrency: Record<string, PriceFacetRange> = {};
  for (const [currency, prices] of pricesByCurrency) {
    rangeByCurrency[currency] = { min: Math.min(...prices), max: Math.max(...prices) };
  }

  return {
    currencies: [...pricesByCurrency.keys()].sort(),
    rangeByCurrency,
  };
}

// Contrasta el precio crudo (searchParams) contra la faceta real. No infiere ni calcula ningún
// dato nuevo — solo decide qué combinación de moneda/rango, de las YA provistas, es segura para
// mandarle a 2Clics. `facet` es la GLOBAL (ignora operación) cuando operation==='all' — así el
// selector de Moneda tiene opciones reales aunque todavía no se haya elegido Venta/Alquiler — y la
// de la operación activa en cualquier otro caso (mismo `fetchPriceFacet`, distinto `filters` de
// entrada; ver `getPropertyCatalog`).
export function resolvePriceFilter(
  price: PriceFilterInput,
  operation: ListingOperationFilter,
  facet: PriceFacet,
): ResolvedPriceFilter {
  if (operation === 'all') {
    return {
      status: 'no-operation',
      currencies: facet.currencies,
      rawCurrency: price.currency,
      rawMin: price.min,
      rawMax: price.max,
    };
  }
  if (!facet.currencies.length) {
    return { status: 'empty-facet', rawCurrency: price.currency, rawMin: price.min, rawMax: price.max };
  }

  // Una sola moneda disponible → se infiere automáticamente, sin exigir ?moneda= en la URL.
  const currency =
    price.currency && facet.rangeByCurrency[price.currency]
      ? price.currency
      : facet.currencies.length === 1
        ? facet.currencies[0]
        : '';

  if (!currency) {
    return { status: 'needs-currency', currencies: facet.currencies, rawMin: price.min, rawMax: price.max };
  }

  const facetRange = facet.rangeByCurrency[currency];

  if (price.min !== null && price.max !== null && price.min > price.max) {
    return { status: 'invalid-range', currency, facetRange, rawMin: price.min, rawMax: price.max };
  }

  const hasAnyValue = price.min !== null || price.max !== null;
  return {
    status: 'ready',
    currency,
    facetRange,
    rawMin: price.min,
    rawMax: price.max,
    appliedMin: hasAnyValue ? (price.min ?? facetRange.min) : null,
    appliedMax: hasAnyValue ? (price.max ?? facetRange.max) : null,
  };
}

export function catalogPropertyRequest(
  filters: PropertyListingFilters,
  resolvedPrice: ResolvedPriceFilter,
  webListing: PublicCatalogWebListing,
  offset = filters.offset,
  limit = filters.limit,
): TwoclicsGetPropertiesRequest {
  const request = propertyRequest({ ...filters, offset, limit }, resolvedPrice);
  return {
    ...request,
    filters: {
      ...(request.filters || {}),
      webListing,
    },
  };
}

// La faceta de Ubicación ignora TODOS los demás filtros (operación, tipo, dormitorios, ambientes,
// apto crédito, precio) — no solo ubicación/precio como hasta 2026-08-26. Antes respetaba
// Operación/Tipo/Dormitorios/Ambientes, y eso producía un bug real confirmado: si la ubicación
// actualmente seleccionada no tiene NINGUNA propiedad que matchee el resto de los filtros activos
// (ej. Ubicación=Estados Unidos + Operación=Alquiler, y Estados Unidos hoy no tiene ningún
// Alquiler — todo su inventario es Venta), esa ubicación desaparece de `availableLocations`, y el
// `<select>` de Ubicación —que solo puede reflejar como seleccionado un valor que exista entre sus
// `<option>`— cae visualmente a "Todas" aunque el filtro real (URL/searchParams, lo que se manda a
// 2Clics) siga siendo el correcto. Mismo criterio que ya usan Operación/Tipo, cuyas listas de
// opciones tampoco se recortan según el resto de los filtros activos — así el <select> de
// Ubicación siempre puede representar fielmente el valor activo, sin importar la combinación.
export function locationFacetRequest(): TwoclicsGetPropertiesRequest {
  return { offset: 0, limit: MAX_LIMIT, filters: {} };
}

export function propertyListingPrioritySegments(
  buckets: PropertyListingPriorityBucket[],
  offset: number,
  limit: number,
): PropertyListingPrioritySegment[] {
  let offsetLeft = Math.max(0, offset);
  let limitLeft = Math.max(0, limit);
  const segments: PropertyListingPrioritySegment[] = [];

  for (const bucket of buckets) {
    if (limitLeft <= 0) break;
    const count = Math.max(0, bucket.count);
    if (offsetLeft >= count) {
      offsetLeft -= count;
      continue;
    }

    const bucketOffset = offsetLeft;
    const bucketLimit = Math.min(limitLeft, count - bucketOffset);
    if (bucketLimit > 0) {
      segments.push({ ...bucket, offset: bucketOffset, limit: bucketLimit });
      limitLeft -= bucketLimit;
    }
    offsetLeft = 0;
  }

  return segments;
}

function publicPropertyKey(property: PublicProperty): string {
  if (property.propertyId) return `id:${property.propertyId}`;
  if (property.url) return `url:${property.url}`;
  return `title:${property.title}:${property.address}`;
}

export function dedupePublicProperties(properties: PublicProperty[]): PublicProperty[] {
  const seen = new Set<string>();
  return properties.filter((property) => {
    const key = publicPropertyKey(property);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Confirmado contra la API real (2026-08-21, tres escenarios distintos de 0 coincidencias
// legítimas: bucket vacío, property_type inexistente, rango de precio sin match): cuando una
// consulta VÁLIDA no tiene resultados, 2Clics responde HTTP 200 con status:"fail" y SIN los
// campos count/properties/description — misma forma exacta en los tres casos. Un error real
// (validación de filtros, api_key inválida) siempre llega con HTTP 4xx/401 y SÍ trae
// `description` — y ya lo corta lib/2clics/client.ts (throw TwoclicsApiError) antes de que este
// response llegue hasta acá, así que en la práctica nunca convive con esta forma.
//
// Bug real de producción (2026-08-26): esta misma forma también puede salir de un hipo transitorio
// del backend de 2Clics (no solo de un "0 legítimo") — indistinguibles. `lib/2clics/client.ts`
// (`isAmbiguousFailResponse`, reusada acá para no duplicar el criterio) ya reintenta esta forma
// dentro de `getProperties` antes de que llegue hasta acá, así que si TODAVÍA llega con esta forma
// después de agotar los reintentos, es válido tratarla como 0 legítimo — mismo criterio de antes.
export function propertyResponseCount(response: {
  status?: string;
  count?: number;
  properties?: unknown[];
  description?: string;
}): {
  count: number;
  reliable: boolean;
} {
  if (typeof response.count === 'number' && Number.isFinite(response.count)) {
    return { count: Math.max(0, response.count), reliable: true };
  }
  if (isAmbiguousFailResponse(response)) {
    return { count: 0, reliable: true };
  }
  return { count: response.properties?.length || 0, reliable: false };
}

function normalizeLabel(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function addLocationOption(
  options: Map<ListingLocationFilter, ListingLocationOption>,
  kind: ListingLocationKind,
  id: number | undefined,
  label: string,
): void {
  const cleanLabel = label.trim();
  if (!id || !cleanLabel) return;
  const value = `${kind}:${id}` as ListingLocationFilter;
  const current = options.get(value);
  if (current) {
    current.count += 1;
    return;
  }
  options.set(value, { value, label: cleanLabel, kind, count: 1 });
}

// Presentación pública de cada opción del filtro de ubicación — reutiliza formatPublicLocation
// (el mismo formatter que ya usan cards y fichas) en vez de mostrar el label técnico del CRM
// (ej. "Bs.As. G.B.A. Norte"). El id que 2Clics recibe (value del <option>) no cambia acá, solo
// el texto visible. No duplica reglas geográficas: state/city/neighborhood ya vienen del propio
// location de la propiedad, formatPublicLocation ya sabe qué mostrar según la región.
function publicLocationOptionLabel(
  kind: ListingLocationKind,
  location: PublicLocation,
  region: TwoclicsRegion,
): string {
  if (kind === 'neighborhood') return formatPublicLocation(location, region);
  // formatPublicLocation usa location.state?.name como país en mercados no-AR (para AR el país
  // se hardcodea a "Argentina" y el state real se ignora) — hay que pasarlo siempre para que el
  // país no desaparezca en mercados como US.
  if (kind === 'city') return formatPublicLocation({ city: location.city, state: location.state }, region);
  return formatPublicLocation({ state: location.state }, region);
}

export function buildLocationOptions(properties: PublicProperty[]): ListingLocationOption[] {
  const options = new Map<ListingLocationFilter, ListingLocationOption>();

  for (const property of properties) {
    const { location, region } = property;
    addLocationOption(
      options,
      'state',
      location.state?.stateId,
      publicLocationOptionLabel('state', location, region),
    );
    addLocationOption(
      options,
      'city',
      location.city?.cityId,
      publicLocationOptionLabel('city', location, region),
    );
    addLocationOption(
      options,
      'neighborhood',
      location.neighborhood?.neighborhoodId,
      publicLocationOptionLabel('neighborhood', location, region),
    );
  }

  return Array.from(options.values()).sort((a, b) => {
    const kindOrder = { state: 0, city: 1, neighborhood: 2 };
    return kindOrder[a.kind] - kindOrder[b.kind] || normalizeLabel(a.label).localeCompare(normalizeLabel(b.label));
  });
}

// Tipo de propiedad dinámico (2026-08-27) — antes las opciones del <select> salían de `GET
// /api/property-type`, el catálogo GENERAL de tipos que maneja la cuenta de 2Clics, sin importar
// si hay o no una propiedad pública publicada de ese tipo. Eso podía ofrecer tipos sin ningún
// resultado real. Igual que `buildLocationOptions`, esta función deriva las opciones del
// INVENTARIO PÚBLICO REAL (las propiedades que ya se están trayendo para la faceta de ubicación,
// sin scoping por operación/tipo/dormitorios/ambientes/precio — mismo universo "todo publicado"
// que ya arregló el bug de Ubicación) — cero requests adicionales, cero N+1. Cada propiedad real
// ya trae su `propertyType` completo (`{typeId, name, appId, group}`) tal como lo devuelve 2Clics,
// así que esta lista también sirve para resolver `typeId → appId` (`resolvePropertyTypeAppId`)
// sin necesitar el catálogo general aparte.
export function buildAvailablePropertyTypes(properties: PublicProperty[]): TwoclicsPropertyType[] {
  const types = new Map<number, TwoclicsPropertyType>();
  for (const property of properties) {
    const type = property.propertyType;
    if (!type?.typeId || types.has(type.typeId)) continue;
    types.set(type.typeId, type);
  }
  return Array.from(types.values()).sort((a, b) =>
    normalizeLabel(a.name).localeCompare(normalizeLabel(b.name)),
  );
}

function sameNormalizedValue(a: unknown, b: unknown): boolean {
  const left = normalizeLabel(a);
  const right = normalizeLabel(b);
  return Boolean(left && right && left === right);
}

function usableCoordinates(property: PublicProperty): { lat: number; long: number } | null {
  const { lat, long } = property;
  if (
    lat === null ||
    long === null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(long) ||
    lat < -90 ||
    lat > 90 ||
    long < -180 ||
    long > 180
  ) {
    return null;
  }
  return { lat, long };
}

function distanceKm(
  a: { lat: number; long: number },
  b: { lat: number; long: number },
): number {
  const earthRadiusKm = 6371;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLong = toRad(b.long - a.long);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLong / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function sameState(current: PublicProperty, candidate: PublicProperty): boolean {
  const currentState = current.location.state;
  const candidateState = candidate.location.state;
  return Boolean(
    (currentState?.stateId && candidateState?.stateId === currentState.stateId) ||
      sameNormalizedValue(currentState?.name, candidateState?.name),
  );
}

function sameCity(current: PublicProperty, candidate: PublicProperty): boolean {
  const currentCity = current.location.city;
  const candidateCity = candidate.location.city;
  return Boolean(
    (currentCity?.cityId && candidateCity?.cityId === currentCity.cityId) ||
      sameNormalizedValue(currentCity?.name, candidateCity?.name),
  );
}

function sameNeighborhood(current: PublicProperty, candidate: PublicProperty): boolean {
  const currentNeighborhood = current.location.neighborhood;
  const candidateNeighborhood = candidate.location.neighborhood;
  return Boolean(
    (currentNeighborhood?.neighborhoodId &&
      candidateNeighborhood?.neighborhoodId === currentNeighborhood.neighborhoodId) ||
      sameNormalizedValue(currentNeighborhood?.name, candidateNeighborhood?.name),
  );
}

function coordinateDistanceRank(distance: number): number {
  if (distance <= 5) return 5;
  if (distance <= 15) return 4;
  if (distance <= 40) return 3;
  if (distance <= 100) return 2;
  return 0;
}

function geographyRank(
  current: PublicProperty,
  candidate: PublicProperty,
): { rank: number; distance: number | null } {
  const currentCoords = usableCoordinates(current);
  const candidateCoords = usableCoordinates(candidate);

  if (currentCoords && candidateCoords) {
    const distance = distanceKm(currentCoords, candidateCoords);
    return { rank: coordinateDistanceRank(distance), distance };
  }

  if (sameNeighborhood(current, candidate)) return { rank: 5, distance: null };
  if (sameCity(current, candidate)) return { rank: 4, distance: null };
  if (sameState(current, candidate)) return { rank: 3, distance: null };

  return { rank: 0, distance: null };
}

function secondaryRelatedScore(current: PublicProperty, candidate: PublicProperty): number {
  let score = 0;
  if (sameNormalizedValue(current.operationType, candidate.operationType)) score += 3;
  if (
    current.propertyType?.typeId &&
    candidate.propertyType?.typeId === current.propertyType.typeId
  ) {
    score += 2;
  } else if (sameNormalizedValue(current.propertyType?.name, candidate.propertyType?.name)) {
    score += 1;
  }

  if (
    current.price !== null &&
    candidate.price !== null &&
    current.price > 0 &&
    candidate.price > 0 &&
    sameNormalizedValue(current.currency, candidate.currency)
  ) {
    const ratio = Math.abs(candidate.price - current.price) / current.price;
    if (ratio <= 0.25) score += 2;
    else if (ratio <= 0.5) score += 1;
    else if (ratio <= 1) score += 1;
  }

  return score;
}

export function rankRelatedProperties(
  current: PublicProperty,
  candidates: PublicProperty[],
  limit = 3,
): PublicProperty[] {
  return candidates
    .filter((candidate) => !(current.propertyId && candidate.propertyId === current.propertyId))
    .map((candidate, index) => {
      const geography = geographyRank(current, candidate);
      return {
        candidate,
        index,
        geographyRank: geography.rank,
        distance: geography.distance,
        secondaryScore: secondaryRelatedScore(current, candidate),
      };
    })
    .filter((entry) => entry.geographyRank > 0)
    .sort((a, b) => {
      if (b.geographyRank !== a.geographyRank) return b.geographyRank - a.geographyRank;
      if (a.distance !== null && b.distance !== null && a.distance !== b.distance) {
        return a.distance - b.distance;
      }
      return b.secondaryScore - a.secondaryScore || a.index - b.index;
    })
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export type PropertyCatalogOptions = {
  // WEB GARCÍA V2 (/comprar, /alquilar) — ids que García clasificó con
  // `excludeFromStandardCatalog: true` (`lib/site-curation.ts`). Vacío/omitido = comportamiento
  // sin cambios (usado por `/propiedades`, el catálogo maestro, que nunca excluye nada). No es un
  // filtro de 2Clics: se resuelve acá, sobre el resultado ya adaptado, para no tocar el contrato
  // de `TwoclicsPropertyFilters` ni la semántica de ningún filtro existente.
  excludePropertyIds?: number[];
};

// Replica la semántica exacta de los filtros activos (mismo criterio que `baseApiFilters`/
// `resolvePriceFilter` ya documentan) para decidir si una propiedad EXCLUIDA del catálogo
// estándar habría matcheado la consulta actual — necesario para que `propertyTotalCount` en
// /comprar y /alquilar seguya siendo un número real y nunca inventado, en vez de ignorar la
// exclusión o mostrar "Resultados filtrados" todo el tiempo.
function propertyMatchesActiveFilters(
  property: PublicProperty,
  filters: PropertyListingFilters,
  resolvedPrice: ResolvedPriceFilter,
): boolean {
  if (filters.operation !== 'all' && operationFromPublicProperty(property) !== filters.operation) return false;
  if (filters.propertyTypeId && property.propertyType?.typeId !== filters.propertyTypeId) return false;
  if (filters.bedrooms && property.amountBedroom !== filters.bedrooms) return false;
  if (filters.rooms && property.amountRoom !== filters.rooms) return false;
  if (filters.aptoCredito && !property.aptCredit) return false;
  if (!propertyMatchesLocation(property, filters.location)) return false;
  if (resolvedPrice.status === 'ready') {
    if (resolvedPrice.currency && property.currency !== resolvedPrice.currency) return false;
    if (resolvedPrice.appliedMin !== null && (property.price === null || property.price < resolvedPrice.appliedMin)) {
      return false;
    }
    if (resolvedPrice.appliedMax !== null && (property.price === null || property.price > resolvedPrice.appliedMax)) {
      return false;
    }
  }
  return true;
}

export async function getPropertyCatalog(
  searchParams: Record<string, string | string[] | undefined>,
  options: PropertyCatalogOptions = {},
): Promise<PropertyCatalogResult> {
  const filters = parsePropertyListingFilters(searchParams);
  if (!hasConfiguredCredentials()) {
    console.info('[2clics] API key is not configured; property catalog rendered as unavailable.');
    return emptyCatalog('unconfigured', filters);
  }

  const excludeIds = new Set(
    (options.excludePropertyIds || []).filter((id) => Number.isInteger(id) && id > 0),
  );

  try {
    const cacheOptions = getTwoclicsReadCacheOptions();
    const regions = regionsForCatalog();

    // La faceta de "todo el inventario publicado" (sin scoping por operación/tipo/dormitorios/
    // ambientes/precio) se pide ANTES que cualquier otra consulta — antes solo alimentaba
    // Ubicación, ahora también resuelve Tipo de propiedad (2026-08-27): las opciones del <select>
    // de Tipo y el mapeo typeId→appId (`resolvePropertyTypeAppId`, bug real 2026-08-26) salen del
    // MISMO array de propiedades reales, sin ningún request adicional a `GET /api/property-type`
    // (el catálogo GENERAL de tipos de la cuenta, que podía ofrecer tipos sin inventario público
    // real — ver `buildAvailablePropertyTypes`). Se necesita temprano porque tanto la faceta de
    // precio como los buckets del catálogo dependen de `propertyTypeAppId` para armar el filtro
    // `property_type` correcto.
    const locationFacetResponses = await Promise.all(
      regions.map((region) => twoclicsClient.getProperties(region, locationFacetRequest(), cacheOptions)),
    );
    const locationFacetProperties = locationFacetResponses
      .flatMap((response, index) =>
        (response.properties || []).map((property) => adaptPublicProperty(property, regions[index])),
      )
      .filter((property) => !(property.propertyId && excludeIds.has(property.propertyId)));
    const propertyTypes = buildAvailablePropertyTypes(locationFacetProperties);
    const propertyTypeAppId = resolvePropertyTypeAppId(filters.propertyTypeId, propertyTypes);

    // La faceta de precio (y su resolución) tiene que estar lista ANTES de armar las consultas
    // del catálogo — son ellas las que necesitan saber qué currency/min_price/max_price mandar.
    // Se pide SIEMPRE, incluso sin Operación activa (pasada UX 2026-08-24): con operation==='all',
    // `baseApiFilters` omite `operation_type` y la consulta devuelve la faceta GLOBAL (unión de
    // monedas de todas las operaciones, respetando ubicación/tipo/dormitorios/ambientes activos si
    // los hay) — así el selector de Moneda tiene opciones reales desde el primer render, sin
    // esperar a que el usuario elija Venta/Alquiler primero. Su rango numérico global (que mezcla
    // escalas de Venta y Alquiler) deliberadamente NO se usa como placeholder en ese estado — ver
    // `resolvePriceFilter`/`PriceFilterGroup`.
    const priceFacet = await fetchPriceFacet(filters, propertyTypeAppId, regions, cacheOptions);
    const resolvedPrice = resolvePriceFilter(filters.price, filters.operation, priceFacet);

    const propertyBuckets = PUBLIC_CATALOG_WEB_LISTINGS.flatMap((webListing) =>
      regions.map((region) => ({
        key: `${webListing}:${region}:${credentialSignature(region)}`,
        region,
        webListing,
      })),
    );
    const [propertyCountResponses, developmentResponses] = await Promise.all([
      Promise.all(
        propertyBuckets.map((bucket) =>
          twoclicsClient.getProperties(
            bucket.region,
            withResolvedPropertyType(
              catalogPropertyRequest(filters, resolvedPrice, bucket.webListing, 0, 1),
              propertyTypeAppId,
            ),
            cacheOptions,
          ),
        ),
      ),
      Promise.all(regions.map((region) => twoclicsClient.getDevelopments(region, cacheOptions))),
    ]);

    const countedBuckets = propertyBuckets.map((bucket, index) => {
      const count = propertyResponseCount(propertyCountResponses[index] || {});
      return { ...bucket, ...count };
    });
    const pageSegments = propertyListingPrioritySegments(
      countedBuckets,
      filters.offset,
      filters.limit,
    );
    const propertyResponses = await Promise.all(
      pageSegments.map((segment) => {
        const region = segment.region || regions[0] || 'AR';
        return twoclicsClient.getProperties(
          region,
          withResolvedPropertyType(
            catalogPropertyRequest(filters, resolvedPrice, segment.webListing, segment.offset, segment.limit),
            propertyTypeAppId,
          ),
          cacheOptions,
        );
      }),
    );
    const properties = dedupePublicProperties(
      propertyResponses
      .flatMap((response, index) =>
        (response.properties || []).map((property) =>
          adaptPublicProperty(property, pageSegments[index]?.region || regions[0] || 'AR'),
        ),
      )
      .filter((property) => propertyMatchesLocation(property, filters.location)),
    ).filter((property) => !(property.propertyId && excludeIds.has(property.propertyId)));
    const developments = developmentResponses
      .flatMap((response, index) =>
        (response.developments || []).map((development) =>
          adaptPublicDevelopment(development, regions[index]),
        ),
      )
      .filter((development) => developmentMatchesLocation(development, filters.location));
    let totalPropertyCount = countedBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
    const hasReliablePropertyTotal = countedBuckets.every((bucket) => bucket.reliable);

    // Los buckets DESTACADO/SIMPLE cuentan TODA propiedad que matchee la consulta, sin saber de
    // exclusión curatorial — si alguno de los ids excluidos hubiera matcheado esta consulta
    // (misma operación/tipo/ubicación/precio/dormitorios/ambientes activos), se resta acá para
    // que el contador nunca quede inflado. `getPublicPropertyById` está cacheado (React `cache()`
    // + fetch cache de Next), así que esto no agrega llamadas nuevas por request en la práctica.
    if (excludeIds.size && hasReliablePropertyTotal) {
      const excludedResults = await Promise.all(
        Array.from(excludeIds).map((id) => getPublicPropertyById(id)),
      );
      for (const result of excludedResults) {
        if (result.property && propertyMatchesActiveFilters(result.property, filters, resolvedPrice)) {
          totalPropertyCount -= 1;
        }
      }
      totalPropertyCount = Math.max(0, totalPropertyCount);
    }

    return {
      status: 'ready',
      filters,
      properties,
      propertyTotalCount: hasReliablePropertyTotal ? totalPropertyCount : null,
      developments,
      propertyTypes,
      availableLocations: buildLocationOptions(locationFacetProperties),
      availableOperations: collectAvailableOperations(properties),
      priceFacet,
      resolvedPrice,
      hasMore: hasReliablePropertyTotal
        ? totalPropertyCount > filters.offset + filters.limit
        : properties.length >= filters.limit,
    };
  } catch (error) {
    logTwoclicsFailure('Property catalog', error);
    return emptyCatalog(publicErrorStatus(error), filters);
  }
}

export async function getRelatedPublicProperties(
  current: PublicProperty,
  limit = 3,
): Promise<PublicProperty[]> {
  if (!hasConfiguredCredentials()) return [];

  try {
    const cacheOptions = getTwoclicsReadCacheOptions();
    const regions = regionsForDetail();
    const responses = await Promise.all(
      regions.map((region) =>
        twoclicsClient.getProperties(region, { offset: 0, limit: MAX_LIMIT }, cacheOptions),
      ),
    );
    const candidates = responses.flatMap((response, index) =>
      (response.properties || []).map((property) => adaptPublicProperty(property, regions[index])),
    );
    return rankRelatedProperties(current, candidates, limit);
  } catch (error) {
    logTwoclicsFailure('Related properties', error);
    return [];
  }
}

export async function getFeaturedPublicProperties(limit = 4): Promise<PropertyCatalogResult> {
  const filters: PropertyListingFilters = {
    location: 'all',
    operation: 'all',
    propertyTypeId: null,
    bedrooms: null,
    rooms: null,
    aptoCredito: false,
    price: { currency: '', min: null, max: null },
    offset: 0,
    limit,
  };

  if (!hasConfiguredCredentials()) return emptyCatalog('unconfigured', filters);

  try {
    const cacheOptions = getTwoclicsReadCacheOptions();
    const regions = regionsForCatalog();
    const responses = await Promise.all(
      regions.map((region) => twoclicsClient.getFeaturedProperties(region, limit, cacheOptions)),
    );
    const properties = responses
      .flatMap((response, index) =>
        (response.properties || []).map((property) => adaptPublicProperty(property, regions[index])),
      )
      .slice(0, limit);

    return {
      status: 'ready',
      filters,
      properties,
      propertyTotalCount: properties.length,
      developments: [],
      propertyTypes: [],
      availableLocations: [],
      availableOperations: collectAvailableOperations(properties),
      priceFacet: EMPTY_PRICE_FACET,
      resolvedPrice: INACTIVE_PRICE_NO_OPERATION,
      hasMore: false,
    };
  } catch (error) {
    logTwoclicsFailure('Featured properties', error);
    return emptyCatalog(publicErrorStatus(error), filters);
  }
}

async function getPublicPropertyByIdImpl(propertyId: number): Promise<SinglePropertyResult> {
  if (!hasConfiguredCredentials()) return { status: 'unconfigured', property: null };

  try {
    const cacheOptions = getTwoclicsReadCacheOptions();
    for (const region of regionsForDetail()) {
      const response = await twoclicsClient.getPropertyById(region, propertyId, cacheOptions);
      if (response.property) {
        return { status: 'ready', property: adaptPublicProperty(response.property, region) };
      }
    }
    return { status: 'not-found', property: null };
  } catch (error) {
    logTwoclicsFailure('Property detail', error);
    return { status: publicErrorStatus(error), property: null };
  }
}

async function getPublicDevelopmentByIdImpl(
  developmentId: number,
): Promise<SingleDevelopmentResult> {
  if (!hasConfiguredCredentials()) return { status: 'unconfigured', development: null };

  try {
    const cacheOptions = getTwoclicsReadCacheOptions();
    for (const region of regionsForDetail()) {
      const response = await twoclicsClient.getDevelopmentById(region, developmentId, cacheOptions);
      if (response.development) {
        return { status: 'ready', development: adaptPublicDevelopment(response.development, region) };
      }
    }
    return { status: 'not-found', development: null };
  } catch (error) {
    logTwoclicsFailure('Development detail', error);
    return { status: publicErrorStatus(error), development: null };
  }
}

export const getPublicPropertyById = cache(getPublicPropertyByIdImpl);
export const getPublicDevelopmentById = cache(getPublicDevelopmentByIdImpl);
