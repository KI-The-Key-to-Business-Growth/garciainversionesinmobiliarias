import type { TwoclicsMarket, TwoclicsRegion } from '@/lib/2clics/types';

export const TWOCLICS_MARKETS: Record<TwoclicsRegion, Omit<TwoclicsMarket, 'enabled'>> = {
  AR: {
    region: 'AR',
    label: 'Argentina / Buenos Aires',
    country: 'Argentina',
    city: 'Buenos Aires',
  },
  US: {
    region: 'US',
    label: 'Estados Unidos / Miami',
    country: 'Estados Unidos',
    city: 'Miami',
  },
};

export function getTwoclicsMarket(region: TwoclicsRegion): Omit<TwoclicsMarket, 'enabled'> {
  return TWOCLICS_MARKETS[region];
}

type TwoclicsLocationLike = {
  state?: { name?: string };
  city?: { name?: string };
  neighborhood?: { name?: string };
};

function normalizeName(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function hasAnyLocationName(locationText: string, names: string[]): boolean {
  return names.some((name) => locationText.includes(name));
}

export function classifyTwoclicsMarketFromLocation(
  location: TwoclicsLocationLike,
  fallbackRegion: TwoclicsRegion,
): Omit<TwoclicsMarket, 'enabled'> {
  const locationText = [
    location.state?.name,
    location.city?.name,
    location.neighborhood?.name,
  ]
    .map(normalizeName)
    .filter(Boolean)
    .join(' ');

  if (hasAnyLocationName(locationText, ['miami', 'florida', 'miami-dade'])) {
    return TWOCLICS_MARKETS.US;
  }

  if (
    hasAnyLocationName(locationText, [
      'buenos aires',
      'bs.as',
      'g.b.a',
      'gba',
      'caba',
      'capital federal',
      'ciudad autonoma',
      'tigre',
      'nordelta',
    ])
  ) {
    return TWOCLICS_MARKETS.AR;
  }

  return getTwoclicsMarket(fallbackRegion);
}
