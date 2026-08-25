// Barrel público del módulo `lib/2clics`. NO lo importa ninguna página/componente de la app hoy
// (todos importan directamente del archivo puntual que necesitan) — existe para uso manual desde
// scripts/consola (ej. `runTwoclicsReadSmoke`, ver `lib/2clics/smoke.ts`) sin tener que recordar
// cada ruta de archivo. No conectar a producción sin evaluar el impacto en tree-shaking.
export {
  getTwoclicsMarkets,
  getTwoclicsRegionConfig,
  requireTwoclicsRegionConfig,
} from '@/lib/2clics/config';
export { classifyTwoclicsMarketFromLocation, getTwoclicsMarket } from '@/lib/2clics/regions';
export { TwoclicsApiError, TwoclicsClient, twoclicsClient } from '@/lib/2clics/client';
export {
  adaptImages,
  adaptPublicDevelopment,
  adaptPublicProperty,
} from '@/lib/2clics/adapters';
export { parsePublicMetadata } from '@/lib/2clics/metadata';
export { getTwoclicsReadCacheOptions } from '@/lib/2clics/cache';
export {
  compactText,
  developmentHref,
  developmentUnitHref,
  formatArea,
  formatLocation,
  formatOperation,
  formatPrice,
  formatPublicLocation,
  marketPublicLabel,
  operationFilterToApi,
  propertyHref,
} from '@/lib/2clics/format';
export {
  getFeaturedPublicProperties,
  getPropertyCatalog,
  getPublicDevelopmentById,
  getPublicPropertyById,
  parsePropertyListingFilters,
} from '@/lib/2clics/listings';
export { runTwoclicsReadSmoke } from '@/lib/2clics/smoke';
export type * from '@/lib/2clics/types';
export type {
  ListingLocationFilter,
  ListingLocationOption,
  ListingOperationFilter,
  ListingsStatus,
  PropertyCatalogResult,
  PropertyListingFilters,
  SingleDevelopmentResult,
  SinglePropertyResult,
} from '@/lib/2clics/listings';
export type {
  TwoclicsEndpointSmoke,
  TwoclicsPublicDevelopmentSmoke,
  TwoclicsPublicPropertySmoke,
  TwoclicsReadSmokeResult,
} from '@/lib/2clics/smoke';
