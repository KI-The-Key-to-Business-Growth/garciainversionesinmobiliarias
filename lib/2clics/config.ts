import 'server-only';
import { TWOCLICS_MARKETS } from '@/lib/2clics/regions';
import { env } from '@/lib/env';
import type { TwoclicsMarket, TwoclicsRegion } from '@/lib/2clics/types';

export type TwoclicsRegionConfig = TwoclicsMarket & {
  apiKey: string;
  requestApiKey: string;
  apiKeySource: 'default' | 'region' | 'missing';
  apiKeyRegionPrefix: string;
  agentId: string;
  realEstateId: string;
};

type TwoclicsRegionOverrides = Omit<
  TwoclicsRegionConfig,
  'apiKey' | 'requestApiKey' | 'apiKeySource' | 'apiKeyRegionPrefix' | 'enabled'
> & {
  apiKeyOverride: string;
};

const REGION_CONFIG: Record<TwoclicsRegion, TwoclicsRegionOverrides> = {
  AR: {
    ...TWOCLICS_MARKETS.AR,
    apiKeyOverride: env.TWOCLICS_AR_API_KEY,
    agentId: env.TWOCLICS_AR_AGENT_ID,
    realEstateId: env.TWOCLICS_AR_REAL_ESTATE_ID,
  },
  US: {
    ...TWOCLICS_MARKETS.US,
    apiKeyOverride: env.TWOCLICS_US_API_KEY,
    agentId: env.TWOCLICS_US_AGENT_ID,
    realEstateId: env.TWOCLICS_US_REAL_ESTATE_ID,
  },
};

export class MissingTwoclicsCredentialsError extends Error {
  constructor(region: TwoclicsRegion) {
    super(`2Clics API key is not configured. Set TWOCLICS_API_KEY or TWOCLICS_${region}_API_KEY`);
    this.name = 'MissingTwoclicsCredentialsError';
  }
}

function resolveApiKey(region: TwoclicsRegion): Pick<TwoclicsRegionConfig, 'apiKey' | 'apiKeySource'> {
  const regionApiKey = REGION_CONFIG[region].apiKeyOverride;
  if (regionApiKey) return { apiKey: regionApiKey, apiKeySource: 'region' };
  if (env.TWOCLICS_API_KEY) return { apiKey: env.TWOCLICS_API_KEY, apiKeySource: 'default' };
  return { apiKey: '', apiKeySource: 'missing' };
}

function normalizeApiKeyRegionPrefix(prefix: string): string {
  const normalized = prefix.trim().toUpperCase().replace(/[^A-Z]/g, '');
  return normalized || 'AR';
}

export function buildTwoclicsRequestApiKey(rawApiKey: string): {
  requestApiKey: string;
  apiKeyRegionPrefix: string;
} {
  const apiKey = rawApiKey.trim();
  const apiKeyRegionPrefix = normalizeApiKeyRegionPrefix(env.TWOCLICS_API_REGION_PREFIX);
  if (!apiKey) return { requestApiKey: '', apiKeyRegionPrefix };
  if (/^[A-Z]{2}-/.test(apiKey)) return { requestApiKey: apiKey, apiKeyRegionPrefix };
  return { requestApiKey: `${apiKeyRegionPrefix}-${apiKey}`, apiKeyRegionPrefix };
}

export function getTwoclicsRegionConfig(region: TwoclicsRegion): TwoclicsRegionConfig {
  const cfg = REGION_CONFIG[region];
  const resolved = resolveApiKey(region);
  const requestCredential = buildTwoclicsRequestApiKey(resolved.apiKey);
  return {
    region: cfg.region,
    label: cfg.label,
    country: cfg.country,
    city: cfg.city,
    agentId: cfg.agentId,
    realEstateId: cfg.realEstateId,
    ...resolved,
    ...requestCredential,
    enabled: Boolean(resolved.apiKey),
  };
}

export function requireTwoclicsRegionConfig(region: TwoclicsRegion): TwoclicsRegionConfig {
  const cfg = getTwoclicsRegionConfig(region);
  if (!cfg.apiKey) throw new MissingTwoclicsCredentialsError(region);
  return cfg;
}

export function getTwoclicsMarkets(): TwoclicsMarket[] {
  return (Object.keys(REGION_CONFIG) as TwoclicsRegion[]).map((region) => {
    const cfg = getTwoclicsRegionConfig(region);
    return {
      region: cfg.region,
      label: cfg.label,
      country: cfg.country,
      city: cfg.city,
      enabled: cfg.enabled,
    };
  });
}

export function getTwoclicsBaseUrl(): string {
  return env.TWOCLICS_API_BASE_URL;
}
