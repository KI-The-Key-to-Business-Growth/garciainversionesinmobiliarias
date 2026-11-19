import type { MetadataRoute } from 'next';
import { CANONICAL_BASE_URL } from '@/lib/env';
import { getPublicPropertySitemapEntries } from '@/lib/2clics/listings';
import {
  getActiveInvestmentOpportunities,
  getAllDevelopmentSlugs,
  getInvestmentOpportunityByPropertyId,
  getMasterCatalogExcludedPropertyIds,
} from '@/lib/site-curation';

// Sitemap (convención App Router): páginas públicas fijas + una entrada por cada ficha de propiedad
// activa y pública (id y fecha real de modificación salen de 2Clics). Las páginas fijas no declaran
// `lastModified`: no hay una fecha real que informar y una fecha inventada le quita valor al archivo.
// Quedan fuera las fichas que no son propiedades (registro técnico de oportunidades) y las que
// redirigen a otra URL.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    '/',
    '/comprar',
    '/alquilar',
    '/desarrollos',
    ...getAllDevelopmentSlugs().map((slug) => `/desarrollos/${slug}`),
    '/invertir',
    ...getActiveInvestmentOpportunities().map((entry) => `/invertir/${entry.slug}`),
    '/vender',
    '/nosotros',
    '/servicios',
    '/contacto',
    '/privacidad',
  ];

  const excluded = new Set(getMasterCatalogExcludedPropertyIds());
  const properties = (await getPublicPropertySitemapEntries()).filter(
    ({ propertyId }) => !excluded.has(propertyId) && !getInvestmentOpportunityByPropertyId(propertyId),
  );

  return [
    ...routes.map((path) => ({ url: `${CANONICAL_BASE_URL}${path === '/' ? '' : path}` })),
    ...properties.map(({ propertyId, modifiedDate }) => {
      const parsed = modifiedDate ? new Date(modifiedDate) : null;
      return {
        url: `${CANONICAL_BASE_URL}/propiedades/${propertyId}`,
        ...(parsed && !Number.isNaN(parsed.getTime()) ? { lastModified: parsed } : {}),
      };
    }),
  ];
}
