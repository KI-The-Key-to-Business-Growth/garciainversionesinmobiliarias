import 'server-only';
// Herramienta de diagnóstico manual — NO está conectada a ninguna página ni ruta de la app (0
// importadores fuera de este módulo/`lib/2clics/index.ts`). Pensada para invocarse a mano (ej.
// un script puntual o la consola de Node) cuando haga falta verificar en vivo que
// `TWOCLICS_API_KEY`/región responden bien contra la API real, sin exponer nada al público — ya
// pasa toda muestra por los adapters (whitelist) y redacta cualquier key de los mensajes de error.
// No conectar a una ruta pública sin agregar autenticación.
import {
  adaptPublicDevelopment,
  adaptPublicProperty,
} from '@/lib/2clics/adapters';
import { getTwoclicsRegionConfig } from '@/lib/2clics/config';
import { twoclicsClient } from '@/lib/2clics/client';
import { inspectPublicMetadata } from '@/lib/2clics/metadata';
import type {
  PublicMetadataDiagnostics,
  PublicDevelopment,
  PublicProperty,
  TwoclicsApiResponseStatus,
  TwoclicsRegion,
} from '@/lib/2clics/types';

export type TwoclicsEndpointSmoke = {
  ok: boolean;
  status?: TwoclicsApiResponseStatus;
  count?: number;
  ids?: Array<number | string>;
  description?: string;
  error?: string;
};

export type TwoclicsPublicPropertySmoke = {
  marketRegion: TwoclicsRegion;
  marketLabel: string;
  propertyId: number | null;
  title: string;
  address: string;
  price: number | null;
  currency: string;
  operationType: string;
  propertyType: string;
  state: string;
  city: string;
  neighborhood: string;
  lat: number | null;
  long: number | null;
  webListing: string;
  imagesCount: number;
  galleryOrder: string[];
  featuredImageUrl: string;
  amenities: string[];
  knownMetadata: Record<string, string>;
  internalMetadataKeysPresent: string[];
  unknownMetadataKeys: string[];
};

export type TwoclicsPublicDevelopmentSmoke = {
  marketRegion: TwoclicsRegion;
  marketLabel: string;
  developmentId: number | null;
  title: string;
  address: string;
  status: string;
  type: string;
  state: string;
  city: string;
  neighborhood: string;
  imagesCount: number;
  plansCount: number;
  unitCount: number;
  unitIds: string[];
  amenities: string[];
  knownMetadata: Record<string, string>;
  internalMetadataKeysPresent: string[];
  unknownMetadataKeys: string[];
};

export type TwoclicsReadSmokeResult = {
  region: TwoclicsRegion;
  marketLabel: string;
  configured: boolean;
  ok: boolean;
  checkedAt: string;
  endpoints: Record<string, TwoclicsEndpointSmoke>;
  samples: {
    property?: TwoclicsPublicPropertySmoke;
    featuredProperty?: TwoclicsPublicPropertySmoke;
    development?: TwoclicsPublicDevelopmentSmoke;
  };
  warnings: string[];
  errors: string[];
};

type SmokeOptions = {
  propertyLimit?: number;
  featuredLimit?: number;
};

function redactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/\b(?:AR|US)-[A-Za-z0-9_-]+\b/g, '[redacted-api-key]')
    .replace(/\beak_[A-Za-z0-9_-]+\b/g, '[redacted-api-key]');
}

function emptyMetadataDiagnostics(): PublicMetadataDiagnostics {
  return { known: {}, internalKeysPresent: [], unknownPublicKeys: [] };
}

function publicPropertySample(
  property: PublicProperty,
  diagnostics: PublicMetadataDiagnostics = emptyMetadataDiagnostics(),
): TwoclicsPublicPropertySmoke {
  return {
    marketRegion: property.region,
    marketLabel: property.marketLabel,
    propertyId: property.propertyId,
    title: property.title,
    address: property.address,
    price: property.price,
    currency: property.currency,
    operationType: property.operationType,
    propertyType: property.propertyType?.name || '',
    state: property.location.state?.name || '',
    city: property.location.city?.name || '',
    neighborhood: property.location.neighborhood?.name || '',
    lat: property.lat,
    long: property.long,
    webListing: property.webListing,
    imagesCount: property.images.length,
    galleryOrder: property.images.map((image) => image.id),
    featuredImageUrl: property.images[0]?.displayUrl || '',
    amenities: property.amenities.map((amenity) => amenity.name || '').filter(Boolean),
    knownMetadata: diagnostics.known,
    internalMetadataKeysPresent: diagnostics.internalKeysPresent,
    unknownMetadataKeys: diagnostics.unknownPublicKeys,
  };
}

function publicDevelopmentSample(
  development: PublicDevelopment,
  diagnostics: PublicMetadataDiagnostics = emptyMetadataDiagnostics(),
): TwoclicsPublicDevelopmentSmoke {
  return {
    marketRegion: development.region,
    marketLabel: development.marketLabel,
    developmentId: development.developmentId,
    title: development.title,
    address: development.address,
    status: development.status?.name || '',
    type: development.type?.name || '',
    state: development.location.state?.name || '',
    city: development.location.city?.name || '',
    neighborhood: development.location.neighborhood?.name || '',
    imagesCount: development.images.length,
    plansCount: development.plans.length,
    unitCount: development.properties.length,
    unitIds: development.properties.map((unit) => unit.propertyId).filter(Boolean),
    amenities: development.amenities.map((amenity) => amenity.name || '').filter(Boolean),
    knownMetadata: diagnostics.known,
    internalMetadataKeysPresent: diagnostics.internalKeysPresent,
    unknownMetadataKeys: diagnostics.unknownPublicKeys,
  };
}

async function captureEndpoint(
  result: TwoclicsReadSmokeResult,
  name: string,
  run: () => Promise<TwoclicsEndpointSmoke>,
): Promise<TwoclicsEndpointSmoke | null> {
  try {
    const endpoint = await run();
    result.endpoints[name] = endpoint;
    return endpoint;
  } catch (error) {
    const message = redactError(error);
    result.endpoints[name] = { ok: false, error: message };
    result.errors.push(`${name}: ${message}`);
    return null;
  }
}

export async function runTwoclicsReadSmoke(
  region: TwoclicsRegion,
  options: SmokeOptions = {},
): Promise<TwoclicsReadSmokeResult> {
  const cfg = getTwoclicsRegionConfig(region);
  const result: TwoclicsReadSmokeResult = {
    region,
    marketLabel: cfg.label,
    configured: cfg.enabled,
    ok: false,
    checkedAt: new Date().toISOString(),
    endpoints: {},
    samples: {},
    warnings: [],
    errors: [],
  };

  if (!cfg.enabled) {
    result.errors.push(
      `2Clics API key is not configured. Set TWOCLICS_API_KEY or TWOCLICS_${region}_API_KEY`,
    );
    return result;
  }

  await captureEndpoint(result, 'health', async () => {
    const health = await twoclicsClient.health(region);
    return {
      ok: health.status !== 'fail',
      status: health.status,
      description: health.description || health.service,
    };
  });

  const propertyLimit = options.propertyLimit ?? 5;
  let firstPropertyId: number | undefined;
  let firstNetworkId: number | string | undefined;
  await captureEndpoint(result, 'properties', async () => {
    const response = await twoclicsClient.getProperties(region, {
      offset: 0,
      limit: propertyLimit,
    });
    const properties = response.properties || [];
    firstPropertyId = properties.find((property) => property.propertyId)?.propertyId;
    firstNetworkId = properties
      .flatMap((property) => property.networkAds || [])
      .map((ad) => ad.networkId)
      .find((id) => id !== undefined && id !== '');
    return {
      ok: response.status !== 'fail',
      status: response.status,
      count: response.count ?? properties.length,
      ids: properties.map((property) => property.propertyId).filter((id): id is number => Boolean(id)),
    };
  });

  if (firstPropertyId) {
    const propertyId = firstPropertyId;
    await captureEndpoint(result, 'propertyDetail', async () => {
      const response = await twoclicsClient.getPropertyById(region, propertyId);
      if (response.property) {
        result.samples.property = publicPropertySample(
          adaptPublicProperty(response.property, region),
          inspectPublicMetadata(response.property.meta_data),
        );
      }
      return {
        ok: response.status !== 'fail',
        status: response.status,
        ids: response.property?.propertyId ? [response.property.propertyId] : [],
      };
    });
  } else {
    result.warnings.push('No property ID was available for property detail smoke test');
  }

  if (firstNetworkId) {
    const networkId = firstNetworkId;
    await captureEndpoint(result, 'network', async () => {
      const response = await twoclicsClient.getNetworkById(region, networkId);
      return {
        ok: response.status !== 'fail',
        status: response.status,
        ids: [networkId],
        description: response.url || response.network?.url || response.data?.url,
      };
    });
  } else {
    result.warnings.push('No network ID was available for network smoke test');
  }

  await captureEndpoint(result, 'featuredProperties', async () => {
    const response = await twoclicsClient.getFeaturedProperties(region, options.featuredLimit ?? 3);
    const properties = response.properties || [];
    if (properties[0]) {
      result.samples.featuredProperty = publicPropertySample(
        adaptPublicProperty(properties[0], region),
        inspectPublicMetadata(properties[0].meta_data),
      );
    }
    return {
      ok: response.status !== 'fail',
      status: response.status,
      count: response.count ?? properties.length,
      ids: properties.map((property) => property.propertyId).filter((id): id is number => Boolean(id)),
    };
  });

  await captureEndpoint(result, 'propertyTypes', async () => {
    const response = await twoclicsClient.getPropertyTypes(region);
    return {
      ok: response.status !== 'fail',
      status: response.status,
      count: response.data.length,
      ids: response.data.map((type) => type.typeId).filter((id): id is number => Boolean(id)),
    };
  });

  await captureEndpoint(result, 'amenities', async () => {
    const response = await twoclicsClient.getAmenities(region);
    return {
      ok: response.status !== 'fail',
      status: response.status,
      count: response.data.length,
      ids: response.data
        .map((amenity) => amenity.amenitieId)
        .filter((id): id is number | string => id !== undefined && id !== ''),
    };
  });

  let firstStateId: number | undefined;
  await captureEndpoint(result, 'states', async () => {
    const response = await twoclicsClient.getStates(region);
    firstStateId = response.states.find((state) => state.stateId)?.stateId;
    return {
      ok: response.status !== 'fail',
      status: response.status,
      count: response.states.length,
      ids: response.states.map((state) => state.stateId).filter((id): id is number => Boolean(id)),
    };
  });

  let firstCityId: number | undefined;
  await captureEndpoint(result, 'cities', async () => {
    const response = await twoclicsClient.getCities(region, firstStateId);
    firstCityId = response.cities.find((city) => city.cityId)?.cityId;
    return {
      ok: response.status !== 'fail',
      status: response.status,
      count: response.cities.length,
      ids: response.cities.map((city) => city.cityId).filter((id): id is number => Boolean(id)),
    };
  });

  await captureEndpoint(result, 'neighborhoods', async () => {
    const response = await twoclicsClient.getNeighborhoods(region, firstCityId);
    return {
      ok: response.status !== 'fail',
      status: response.status,
      count: response.neighborhoods.length,
      ids: response.neighborhoods
        .map((neighborhood) => neighborhood.neighborhoodId)
        .filter((id): id is number => Boolean(id)),
    };
  });

  let firstDevelopmentId: number | undefined;
  await captureEndpoint(result, 'developments', async () => {
    const response = await twoclicsClient.getDevelopments(region);
    const developments = response.developments || [];
    firstDevelopmentId = developments.find((development) => development.developmentId)?.developmentId;
    return {
      ok: response.status !== 'fail',
      status: response.status,
      count: developments.length,
      ids: developments
        .map((development) => development.developmentId)
        .filter((id): id is number => Boolean(id)),
    };
  });

  if (firstDevelopmentId) {
    const developmentId = firstDevelopmentId;
    await captureEndpoint(result, 'developmentDetail', async () => {
      const response = await twoclicsClient.getDevelopmentById(region, developmentId);
      if (response.development) {
        result.samples.development = publicDevelopmentSample(
          adaptPublicDevelopment(response.development, region),
          inspectPublicMetadata(response.development.meta_data),
        );
      }
      return {
        ok: response.status !== 'fail',
        status: response.status,
        ids: response.development?.developmentId ? [response.development.developmentId] : [],
      };
    });
  } else {
    result.warnings.push('No development ID was available for development detail smoke test');
  }

  result.ok = Object.values(result.endpoints).every((endpoint) => endpoint.ok);
  return result;
}
