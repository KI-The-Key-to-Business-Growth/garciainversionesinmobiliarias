import { afterEach, describe, expect, it, vi } from 'vitest';

const TWOCLICS_ENV_KEYS = [
  'TWOCLICS_API_KEY',
  'TWOCLICS_API_REGION_PREFIX',
  'TWOCLICS_AR_API_KEY',
  'TWOCLICS_US_API_KEY',
  'TWOCLICS_AR_AGENT_ID',
  'TWOCLICS_US_AGENT_ID',
  'TWOCLICS_AR_REAL_ESTATE_ID',
  'TWOCLICS_US_REAL_ESTATE_ID',
];

const ORIGINAL_ENV = Object.fromEntries(
  TWOCLICS_ENV_KEYS.map((key) => [key, process.env[key]]),
);

function resetTwoclicsEnv(values: Record<string, string> = {}): void {
  for (const key of TWOCLICS_ENV_KEYS) {
    delete process.env[key];
  }
  Object.assign(process.env, values);
}

async function loadConfig(values: Record<string, string> = {}) {
  vi.resetModules();
  resetTwoclicsEnv(values);
  return import('@/lib/2clics/config');
}

afterEach(() => {
  vi.resetModules();
  resetTwoclicsEnv(
    Object.fromEntries(
      Object.entries(ORIGINAL_ENV).filter(([, value]) => value !== undefined),
    ) as Record<string, string>,
  );
});

describe('2Clics API key resolution', () => {
  it('uses TWOCLICS_API_KEY as the default credential for both regions', async () => {
    const { getTwoclicsMarkets, getTwoclicsRegionConfig, requireTwoclicsRegionConfig } =
      await loadConfig({ TWOCLICS_API_KEY: 'account-default-key' });

    expect(getTwoclicsRegionConfig('AR')).toMatchObject({
      apiKey: 'account-default-key',
      requestApiKey: 'AR-account-default-key',
      apiKeySource: 'default',
      apiKeyRegionPrefix: 'AR',
      enabled: true,
    });
    expect(getTwoclicsRegionConfig('US')).toMatchObject({
      apiKey: 'account-default-key',
      requestApiKey: 'AR-account-default-key',
      apiKeySource: 'default',
      apiKeyRegionPrefix: 'AR',
      enabled: true,
    });
    expect(() => requireTwoclicsRegionConfig('US')).not.toThrow();
    expect(getTwoclicsMarkets().map((market) => market.enabled)).toEqual([true, true]);
  });

  it('uses a region-specific key only as an override', async () => {
    const { getTwoclicsRegionConfig } = await loadConfig({
      TWOCLICS_API_KEY: 'account-default-key',
      TWOCLICS_US_API_KEY: 'miami-override-key',
    });

    expect(getTwoclicsRegionConfig('AR')).toMatchObject({
      apiKey: 'account-default-key',
      apiKeySource: 'default',
    });
    expect(getTwoclicsRegionConfig('US')).toMatchObject({
      apiKey: 'miami-override-key',
      requestApiKey: 'AR-miami-override-key',
      apiKeySource: 'region',
    });
  });

  it('does not mutate or duplicate an already-prefixed key', async () => {
    const { getTwoclicsRegionConfig } = await loadConfig({
      TWOCLICS_API_KEY: 'AR-account-default-key',
    });

    expect(getTwoclicsRegionConfig('AR')).toMatchObject({
      apiKey: 'AR-account-default-key',
      requestApiKey: 'AR-account-default-key',
    });
  });

  it('allows the request prefix to remain configurable server-side', async () => {
    const { getTwoclicsRegionConfig } = await loadConfig({
      TWOCLICS_API_KEY: 'account-default-key',
      TWOCLICS_API_REGION_PREFIX: 'US',
    });

    expect(getTwoclicsRegionConfig('AR')).toMatchObject({
      apiKey: 'account-default-key',
      requestApiKey: 'US-account-default-key',
      apiKeyRegionPrefix: 'US',
    });
  });

  it('requires some credential, not one key per region', async () => {
    const { getTwoclicsRegionConfig, requireTwoclicsRegionConfig } = await loadConfig();

    expect(getTwoclicsRegionConfig('AR')).toMatchObject({
      apiKey: '',
      apiKeySource: 'missing',
      enabled: false,
    });
    expect(() => requireTwoclicsRegionConfig('AR')).toThrow(
      '2Clics API key is not configured. Set TWOCLICS_API_KEY or TWOCLICS_AR_API_KEY',
    );
  });
});
