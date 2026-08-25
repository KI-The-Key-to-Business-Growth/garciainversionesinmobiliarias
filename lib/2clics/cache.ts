import 'server-only';
import { env } from '@/lib/env';
import type { TwoclicsRequestCacheOptions } from '@/lib/2clics/client';

export function getTwoclicsReadCacheOptions(): TwoclicsRequestCacheOptions {
  const revalidate = Number.isFinite(env.TWOCLICS_REVALIDATE_SECONDS)
    ? Math.max(30, env.TWOCLICS_REVALIDATE_SECONDS)
    : 300;

  return {
    cache: 'force-cache',
    next: { revalidate },
  };
}
