import type { MetadataRoute } from 'next';
import { CANONICAL_BASE_URL } from '@/lib/env';
import { getActiveInvestmentOpportunities, getAllDevelopmentSlugs } from '@/lib/site-curation';

// Sitemap (convención App Router). Solo rutas públicas existentes; las rutas
// dinámicas de propiedad se agregarán en Fase 5 cuando exista el listado real.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
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
    '/gracias-consulta',
  ];

  return routes.map((path) => ({
    url: `${CANONICAL_BASE_URL}${path === '/' ? '' : path}`,
    lastModified,
  }));
}
