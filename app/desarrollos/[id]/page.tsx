import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFloat from '@/components/layout/WhatsAppFloat';
import CuratedDevelopmentDetailView from '@/components/properties/CuratedDevelopmentDetailView';
import DevelopmentDetailView from '@/components/properties/DevelopmentDetailView';
import ListingState from '@/components/properties/ListingState';
import { formatLocation } from '@/lib/2clics/format';
import { getPublicDevelopmentById, getPublicPropertyById } from '@/lib/2clics/listings';
import { getDevelopmentBySlug } from '@/lib/site-curation';
import type { PublicProperty } from '@/lib/2clics/types';

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
export async function generateMetadata({ params }: DevelopmentDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  const curation = getDevelopmentBySlug(id);
  if (curation) {
    const source = await getPublicPropertyById(curation.sourcePropertyId);
    const description = source.property?.description || (source.property ? formatLocation(source.property.location) : undefined);
    return {
      title: `${curation.name} | García Inversiones Inmobiliarias`,
      description,
      alternates: { canonical: `/desarrollos/${curation.slug}` },
      openGraph: {
        title: curation.name,
        description,
        images: source.property?.images[0]?.displayUrl ? [source.property.images[0].displayUrl] : undefined,
      },
    };
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
  return {
    title: `${development.title} | García Inversiones Inmobiliarias`,
    description: description || undefined,
    alternates: { canonical: `/desarrollos/${developmentId}` },
    openGraph: {
      title: development.title,
      description: description || undefined,
      images: development.images[0]?.displayUrl ? [development.images[0].displayUrl] : undefined,
    },
  };
}

export default async function DevelopmentDetailPage({ params }: DevelopmentDetailPageProps) {
  const { id } = await params;

  const curation = getDevelopmentBySlug(id);
  if (curation) {
    const propertyResults = await Promise.all(
      curation.propertyIds.map((propertyId) => getPublicPropertyById(propertyId)),
    );
    const units = propertyResults
      .map((result) => result.property)
      .filter((property): property is PublicProperty => property !== null);
    const sourceProperty =
      units.find((unit) => unit.propertyId === curation.sourcePropertyId) || units[0] || null;

    return (
      <>
        <Header />
        <main>
          {sourceProperty ? (
            <CuratedDevelopmentDetailView curation={curation} sourceProperty={sourceProperty} units={units} />
          ) : (
            <section className="twoclics-detail-section">
              <div className="container">
                <ListingState status="error" kind="development" />
              </div>
            </section>
          )}
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
