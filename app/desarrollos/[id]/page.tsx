import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import CuratedDevelopmentDetailView from '@/components/properties/CuratedDevelopmentDetailView';
import PropertyViewTracker from '@/components/tracking/PropertyViewTracker';
import DevelopmentDetailView from '@/components/properties/DevelopmentDetailView';
import ListingState from '@/components/properties/ListingState';
import { formatLocation } from '@/lib/2clics/format';
import { getPublicDevelopmentById } from '@/lib/2clics/listings';
import { loadDevelopment } from '@/lib/development-source';
import { resolveDevelopmentAssets, resolveDevelopmentHeroImage } from '@/lib/development-assets';
import { buildShareMetadata } from '@/lib/share-metadata';
import { getDevelopmentEditorialCuration, getDevelopmentFallbackLocation, getDevelopmentOfflineName, resolveSafeDescription } from '@/lib/desarrollos';
import { getDevelopmentBySlug, isDevelopmentPublic } from '@/lib/site-curation';

type DevelopmentDetailPageProps = {
  params: Promise<{ id: string }>;
};

function parseId(id: string): number | null {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// WEB GARCÍA V2 (docs/ai/WEB_GARCIA_V2.md): esta ruta ahora resuelve DOS arquitecturas de
// "desarrollo" distintas bajo el mismo segmento dinámico, por preferencia explícita:
// 1. Slug editorial (ej. "faena") → curaduría nueva, propertyIds normales, NO usa
//    `/api/development`. Es la arquitectura objetivo de V2.
// 2. Id numérico → flujo legacy existente, `/api/development` nativo de 2Clics. Se mantiene
//    intacto por compatibilidad (no se enlaza desde la nueva navegación V2), pero no se borra.
// No puede haber dos carpetas `[id]`/`[slug]` con el mismo padre en Next.js — de ahí que ambas
// arquitecturas convivan acá en vez de en rutas separadas.
// Desarrollo temporalmente oculto (`hidden` en lib/site-curation.ts): la URL directa redirige
// (307, temporal) a /comprar. La curaduría queda intacta para reactivarlo.
const HIDDEN_DEVELOPMENT_REDIRECT = '/comprar';

export async function generateMetadata({ params }: DevelopmentDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  const curation = getDevelopmentBySlug(id);
  if (curation && !isDevelopmentPublic(curation)) redirect(HIDDEN_DEVELOPMENT_REDIRECT);
  if (curation) {
    const { sourceProperty } = await loadDevelopment(curation);
    // Prioridad: nombre público confirmado por curaduría → título real de 2Clics (Faena) →
    // nombre editorial interno como último fallback defensivo (decimosexta pasada).
    const displayName = curation.publicName || sourceProperty?.title || getDevelopmentOfflineName(curation);
    // Nunca la descripción comercial cruda completa como meta description/OG (puede traer precios,
    // cronogramas o claims no publicables) salvo que haya curaduría editorial propia que ya la usa
    // completa y aprobada (Faena) — ver `resolveSafeDescription` en lib/desarrollos.ts.
    const editorial = getDevelopmentEditorialCuration(curation.slug);
    const safeDescription = sourceProperty
      ? resolveSafeDescription(sourceProperty.description || '', editorial)
      : '';
    const description =
      safeDescription ||
      (sourceProperty ? formatLocation(sourceProperty.location) : getDevelopmentFallbackLocation(curation.slug) || undefined);
    // Preview social = la misma imagen de apertura que muestra la ficha (render oficial local o
    // portada curada de 2Clics) — nunca `images[0]` a ciegas (en Benavídez era una foto de obra).
    const image = resolveDevelopmentHeroImage(curation.slug, sourceProperty?.images || []);
    return buildShareMetadata({
      title: displayName,
      description,
      path: `/desarrollos/${curation.slug}`,
      image: image?.displayUrl,
    });
  }

  const developmentId = parseId(id);
  if (!developmentId) return { title: 'Desarrollo | García Inversiones Inmobiliarias' };

  const result = await getPublicDevelopmentById(developmentId);
  if (!result.development) {
    return {
      title: 'Desarrollo | García Inversiones Inmobiliarias',
      alternates: { canonical: `/desarrollos/${developmentId}` },
    };
  }

  const development = result.development;
  const description = development.description || formatLocation(development.location);
  return buildShareMetadata({
    title: development.title,
    description,
    path: `/desarrollos/${developmentId}`,
    image: development.images[0]?.displayUrl,
  });
}

export default async function DevelopmentDetailPage({ params }: DevelopmentDetailPageProps) {
  const { id } = await params;

  const curation = getDevelopmentBySlug(id);
  if (curation && !isDevelopmentPublic(curation)) redirect(HIDDEN_DEVELOPMENT_REDIRECT);
  if (curation) {
    // Misma resolución de fuente que el índice y la metadata (`loadDevelopment`). El desarrollo NO
    // depende de ninguna unidad: sin fuente viva (`sourceProperty` null) se publica igual con la
    // curaduría editorial.
    const { sourceProperty, units, availabilityKnown } = await loadDevelopment(curation);
    const editorial = getDevelopmentEditorialCuration(curation.slug);

    return (
      <>
        <Header />
        <main>
          <PropertyViewTracker
            contentType="development"
            propertyId={sourceProperty?.propertyId ?? curation.sourcePropertyId}
            developmentSlug={curation.slug}
            market={curation.market}
          />
          <CuratedDevelopmentDetailView
            curation={curation}
            source={
              sourceProperty
                ? {
                    propertyId: sourceProperty.propertyId,
                    region: sourceProperty.region,
                    title: curation.publicName || sourceProperty.title,
                    location: sourceProperty.location,
                    description: resolveSafeDescription(sourceProperty.description || '', editorial),
                    images: sourceProperty.images,
                    amenities: sourceProperty.amenities,
                    // Con `hidePrice` true, 2Clics marca el precio como no publicable — no alcanza con
                    // que el JSX nunca lo renderice: el número crudo seguía viajando en el payload
                    // RSC/"ver código fuente" (encontrado auditando Domus Brickell Center). Se corrige
                    // acá, en el único punto donde `source` se arma para CUALQUIER desarrollo.
                    price: sourceProperty.hidePrice ? null : sourceProperty.price,
                    currency: sourceProperty.currency,
                    hidePrice: sourceProperty.hidePrice,
                  }
                : null
            }
            units={units}
            availabilityKnown={availabilityKnown}
            assets={resolveDevelopmentAssets(curation.slug)}
          />
        </main>
        <Footer />
        <WhatsAppFloat />
      </>
    );
  }

  const developmentId = parseId(id);
  if (!developmentId) notFound();

  const result = await getPublicDevelopmentById(developmentId);
  const development = result.development;

  return (
    <>
      <Header />
      <main>
        {development ? (
          <DevelopmentDetailView development={development} />
        ) : result.status === 'not-found' ? (
          notFound()
        ) : (
          <section className="twoclics-detail-section">
            <div className="container">
              <ListingState status={result.status} kind="development" />
            </div>
          </section>
        )}
      </main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
