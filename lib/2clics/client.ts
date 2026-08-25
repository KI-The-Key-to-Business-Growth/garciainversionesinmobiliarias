import 'server-only';
import { getTwoclicsBaseUrl, requireTwoclicsRegionConfig } from '@/lib/2clics/config';
import type {
  TwoclicsAmenity,
  TwoclicsAmountPerCity,
  TwoclicsAmountPerNeighborhood,
  TwoclicsAmountPerPropertyType,
  TwoclicsApiResponseStatus,
  TwoclicsCity,
  TwoclicsCollectionResponse,
  TwoclicsErrorResponse,
  TwoclicsGetDevelopmentByIdResponse,
  TwoclicsGetDevelopmentsResponse,
  TwoclicsGetNetworkByIdResponse,
  TwoclicsGetPropertiesRequest,
  TwoclicsGetPropertiesResponse,
  TwoclicsGetPropertyByIdResponse,
  TwoclicsHealthResponse,
  TwoclicsLeadMessageInput,
  TwoclicsLeadMessageResponse,
  TwoclicsLocationSuggestion,
  TwoclicsNeighborhood,
  TwoclicsPropertyType,
  TwoclicsRegion,
  TwoclicsState,
} from '@/lib/2clics/types';

type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: object;
  headers?: Record<string, string>;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  timeoutMs?: number;
  retries?: number;
};

export type TwoclicsRequestCacheOptions = Pick<RequestOptions, 'cache' | 'next'>;

export class TwoclicsApiError extends Error {
  readonly statusCode: number;
  readonly apiStatus: TwoclicsApiResponseStatus | undefined;
  readonly errors: string[];

  constructor(message: string, statusCode: number, payload?: TwoclicsErrorResponse) {
    super(message);
    this.name = 'TwoclicsApiError';
    this.statusCode = statusCode;
    this.apiStatus = payload?.status;
    this.errors = payload?.errors || [];
  }
}

export class TwoclicsNetworkError extends Error {
  readonly retryable = true;
  readonly causeCode: string;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'TwoclicsNetworkError';
    this.cause = cause;
    this.causeCode = extractErrorCode(cause);
  }
}

export class TwoclicsTimeoutError extends Error {
  readonly retryable = true;

  constructor() {
    super('2Clics request timed out');
    this.name = 'TwoclicsTimeoutError';
  }
}

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 2;
const RETRY_DELAY_MS = 260;

function extractErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  if ('code' in error && typeof error.code === 'string') return error.code;
  if ('cause' in error) return extractErrorCode(error.cause);
  return '';
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof TwoclicsTimeoutError || error instanceof TwoclicsNetworkError) return true;
  return error instanceof TwoclicsApiError && error.statusCode >= 500;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { status: 'fail', description: '2Clics returned invalid JSON' };
  }
}

function errorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'description' in payload) {
    const description = (payload as TwoclicsErrorResponse).description;
    if (description) return description;
  }
  return fallback;
}

function assertLeadTarget(body: TwoclicsLeadMessageInput): void {
  const targetCount = [
    body.property_app_id,
    body.development_app_id,
    body.agent,
    body.realEstate,
  ].filter((value) => value !== undefined && value !== null && String(value).trim() !== '').length;

  if (targetCount > 1) {
    throw new Error('2Clics lead message accepts only one target key');
  }
}

function cleanBody(body: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

export class TwoclicsClient {
  async request<T>(
    region: TwoclicsRegion,
    path: string,
    {
      method = 'GET',
      body,
      headers = {},
      cache = 'no-store',
      next,
      timeoutMs = DEFAULT_TIMEOUT_MS,
      retries = DEFAULT_RETRIES,
    }: RequestOptions = {},
  ): Promise<T> {
    const cfg = requireTwoclicsRegionConfig(region);
    const attempts = Math.max(1, Math.min(retries + 1, 3));

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(`${getTwoclicsBaseUrl()}${path}`, {
          method,
          headers: {
            api_key: cfg.requestApiKey,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
            ...headers,
          },
          body: body ? JSON.stringify(cleanBody(body)) : undefined,
          cache,
          next,
          signal: controller.signal,
        });

        const payload = await parseJson(response);
        if (!response.ok) {
          const apiError = new TwoclicsApiError(
            errorMessage(payload, `2Clics request failed with HTTP ${response.status}`),
            response.status,
            payload as TwoclicsErrorResponse,
          );
          if (attempt < attempts - 1 && isRetryableError(apiError)) {
            await delay(RETRY_DELAY_MS * (attempt + 1));
            continue;
          }
          throw apiError;
        }

        return payload as T;
      } catch (error) {
        const requestError = isAbortError(error)
          ? new TwoclicsTimeoutError()
          : error instanceof TwoclicsApiError
            ? error
            : new TwoclicsNetworkError('2Clics network request failed', error);

        if (attempt < attempts - 1 && isRetryableError(requestError)) {
          await delay(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }

        throw requestError;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new TwoclicsNetworkError('2Clics network request failed');
  }

  health(region: TwoclicsRegion): Promise<TwoclicsHealthResponse> {
    return this.request(region, '/api/health');
  }

  getProperties(
    region: TwoclicsRegion,
    request: TwoclicsGetPropertiesRequest = {},
    requestOptions: TwoclicsRequestCacheOptions = {},
  ): Promise<TwoclicsGetPropertiesResponse> {
    return this.request(region, '/api/property', {
      method: 'POST',
      body: request,
      ...requestOptions,
    });
  }

  getFeaturedProperties(
    region: TwoclicsRegion,
    limit = 6,
    requestOptions: TwoclicsRequestCacheOptions = {},
  ): Promise<TwoclicsGetPropertiesResponse> {
    return this.getProperties(
      region,
      {
        filters: { webListing: 'DESTACADO' },
        offset: 0,
        limit,
      },
      requestOptions,
    );
  }

  getPropertyById(
    region: TwoclicsRegion,
    propertyId: number,
    requestOptions: TwoclicsRequestCacheOptions = {},
  ): Promise<TwoclicsGetPropertyByIdResponse> {
    return this.request(region, `/api/property/${encodeURIComponent(propertyId)}`, requestOptions);
  }

  getNetworkById(
    region: TwoclicsRegion,
    networkId: number | string,
  ): Promise<TwoclicsGetNetworkByIdResponse> {
    return this.request(region, `/api/network/${encodeURIComponent(networkId)}`);
  }

  getPropertyTypes(
    region: TwoclicsRegion,
    requestOptions: TwoclicsRequestCacheOptions = {},
  ): Promise<TwoclicsCollectionResponse<TwoclicsPropertyType, 'data'>> {
    return this.request(region, '/api/property-type', requestOptions);
  }

  getAmountPerPropertyType(
    region: TwoclicsRegion,
    options: { order?: 'ASC' | 'DESC'; limit?: number } = {},
  ): Promise<TwoclicsCollectionResponse<TwoclicsAmountPerPropertyType, 'data'>> {
    return this.request(region, '/api/property-type/amount-per-property-type', {
      headers: {
        ...(options.order ? { order: options.order } : {}),
        ...(options.limit ? { limit: String(options.limit) } : {}),
      },
    });
  }

  getAmountPerCity(
    region: TwoclicsRegion,
    options: { order?: 'ASC' | 'DESC'; limit?: number } = {},
  ): Promise<TwoclicsCollectionResponse<TwoclicsAmountPerCity, 'data'>> {
    return this.request(region, '/api/property/amount-per-city', {
      headers: {
        ...(options.order ? { order: options.order } : {}),
        ...(options.limit ? { limit: String(options.limit) } : {}),
      },
    });
  }

  getAmountPerNeighborhood(
    region: TwoclicsRegion,
    options: { order?: 'ASC' | 'DESC'; limit?: number } = {},
  ): Promise<TwoclicsCollectionResponse<TwoclicsAmountPerNeighborhood, 'data'>> {
    return this.request(region, '/api/property/amount-per-neighborhood', {
      headers: {
        ...(options.order ? { order: options.order } : {}),
        ...(options.limit ? { limit: String(options.limit) } : {}),
      },
    });
  }

  getDevelopments(
    region: TwoclicsRegion,
    requestOptions: TwoclicsRequestCacheOptions = {},
  ): Promise<TwoclicsGetDevelopmentsResponse> {
    return this.request(region, '/api/development', { method: 'POST', ...requestOptions });
  }

  getDevelopmentById(
    region: TwoclicsRegion,
    developmentId: number,
    requestOptions: TwoclicsRequestCacheOptions = {},
  ): Promise<TwoclicsGetDevelopmentByIdResponse> {
    return this.request(
      region,
      `/api/development/${encodeURIComponent(developmentId)}`,
      requestOptions,
    );
  }

  getAmenities(region: TwoclicsRegion): Promise<TwoclicsCollectionResponse<TwoclicsAmenity, 'data'>> {
    return this.request(region, '/api/amenity');
  }

  getStates(region: TwoclicsRegion): Promise<TwoclicsCollectionResponse<TwoclicsState, 'states'>> {
    return this.request(region, '/api/location/states', { method: 'POST' });
  }

  getCities(
    region: TwoclicsRegion,
    stateId?: number,
  ): Promise<TwoclicsCollectionResponse<TwoclicsCity, 'cities'>> {
    return this.request(region, '/api/location/cities', {
      method: 'POST',
      body: stateId ? { state_id: stateId } : undefined,
    });
  }

  getNeighborhoods(
    region: TwoclicsRegion,
    cityId?: number,
  ): Promise<TwoclicsCollectionResponse<TwoclicsNeighborhood, 'neighborhoods'>> {
    return this.request(region, '/api/location/neighborhoods', {
      method: 'POST',
      body: cityId ? { city_id: cityId } : undefined,
    });
  }

  searchLocations(
    region: TwoclicsRegion,
    q: string,
  ): Promise<TwoclicsCollectionResponse<TwoclicsLocationSuggestion, 'data'>> {
    return this.request(region, `/api/location/search/${encodeURIComponent(q)}`);
  }

  sendLeadMessage(
    region: TwoclicsRegion,
    input: TwoclicsLeadMessageInput,
  ): Promise<TwoclicsLeadMessageResponse> {
    const cfg = requireTwoclicsRegionConfig(region);
    const body: TwoclicsLeadMessageInput = { ...input };

    if (!body.property_app_id && !body.development_app_id && !body.agent && !body.realEstate) {
      if (cfg.agentId) body.agent = cfg.agentId;
      else if (cfg.realEstateId) body.realEstate = cfg.realEstateId;
    }

    assertLeadTarget(body);
    return this.request(region, '/api/lead/message', { method: 'POST', body });
  }
}

export const twoclicsClient = new TwoclicsClient();
