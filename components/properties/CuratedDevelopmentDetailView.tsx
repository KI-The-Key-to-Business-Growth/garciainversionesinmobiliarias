import React from 'react';
import Image from 'next/image';
import PropertyInquiryPanel from '@/components/properties/PropertyInquiryPanel';
import PropertyCard from '@/components/properties/PropertyCard';
import { formatPublicLocation } from '@/lib/2clics/format';
import {
  filterEditorialAmenities,
  formatDevelopmentPriceRange,
  getDevelopmentEditorialCuration,
  resolveSectionImages,
  resolveSourceTextSegment,
} from '@/lib/desarrollos';
import type { DevelopmentSection, DevelopmentSnapshotField } from '@/lib/desarrollos';
import type { DevelopmentCuration } from '@/lib/site-curation';
import type { PublicImage, PublicLocation, PublicProperty, TwoclicsAmenity, TwoclicsRegion } from '@/lib/2clics/types';

// Vínculo técnico MÍNIMO con el registro real de 2Clics — deliberadamente NO es `PublicProperty`
// completo (decimosexta pasada). Cualquier página que incluya un Client Component en su árbol
// (Header/Footer/WhatsAppFloat/PropertyInquiryPanel lo son) serializa las props de CADA Server
// Component de ese árbol en el payload RSC que llega al navegador — visible en "ver código
// fuente" aunque el JSX nunca lo pinte. Confirmado en vivo al generalizar a desarrollos con datos
// más crudos que Faena: con `sourceProperty: PublicProperty` completo, el título/descripción
// comercial cruda (con una promesa de rentabilidad — "Renta Garantizada 6 %" — nombre/matrícula de
// agente) aparecía en el HTML servido aunque la vista nunca los renderiza. Solo se pasan los
// campos realmente usados acá — `units` sigue siendo `PublicProperty[]` completo porque
// `PropertyCard` (sin modificar) ya recibe objetos completos en todo el resto del sitio, no es un
// riesgo nuevo de esta pasada.
type DevelopmentSource = {
  propertyId: number | null;
  region: TwoclicsRegion;
  title: string;
  location: PublicLocation;
  description: string;
  images: PublicImage[];
  // Amenities ESTRUCTURADOS reales de 2Clics (nunca inferidos de la descripción libre). Ya son
  // datos públicos/seguros por sí mismos (solo nombre/tipo, sin precio ni datos de agente) — se
  // muestran solo si `editorial.amenities` lo habilita explícitamente por desarrollo (ver
  // lib/desarrollos.ts). Faena no lo activa (decisión ya aprobada).
  amenities: TwoclicsAmenity[];
  // Precio estructurado real de 2Clics (vigésima pasada, FASE 3) — SIEMPRE en vivo, nunca
  // hardcodeado en lib/desarrollos.ts. Ya son campos públicos/seguros por sí mismos (un número +
  // moneda + flag, sin datos de agente). Se resuelve a "Rango de precio" dentro del snapshot vía
  // `formatDevelopmentPriceRange()` — ver ese comentario para la fuente exacta de la cifra.
  price: number | null;
  currency: string;
  hidePrice: boolean;
};

type CuratedDevelopmentDetailViewProps = {
  curation: DevelopmentCuration;
  source: DevelopmentSource;
  units: PublicProperty[];
};

// Landing EDITORIAL de desarrollo (WEB GARCÍA V2 — decimotercera pasada; generalizada a múltiples
// desarrollos en la decimosexta). Reescrita sobre la duodécima pasada: alternar mecánicamente
// imagen/fragmento de texto (por espaciado, sin relación temática real entre ambos) seguía sin
// sentirse una presentación de proyecto — y varias imágenes reales de Faena, al mostrarse a un
// ancho mayor a su resolución nativa, se veían borrosas (ver auditoría en
// docs/ai/PROPERTY_UX_DECISIONS.md). Este componente es puramente un RENDERIZADOR: la curaduría
// real (qué imagen, qué fragmento, qué layout) vive en `lib/desarrollos.ts`
// (`getDevelopmentEditorialCuration`) — acá solo se resuelve esa curaduría contra los datos reales
// de `source` y se pinta. 2Clics sigue siendo la única fuente de verdad: cada fragmento de texto
// se extrae en runtime de `source.description` (ya sanitizado), cada imagen es una de
// `source.images` — nada se copia ni se inventa acá. Desarrollos SIN curaduría editorial propia
// en `lib/desarrollos.ts` (todos salvo Faena hoy) degradan con gracia a apertura + CTA usando solo
// campos reales y verificables — nunca secciones inventadas ni contenido completado por
// inferencia (ver `lib/site-curation.ts`).
export default function CuratedDevelopmentDetailView({
  curation,
  source,
  units,
}: CuratedDevelopmentDetailViewProps) {
  // `source.title` ya viene resuelto de forma segura por quien arma este prop (publicName
  // confirmado por curaduría → título real de la fuente, como Faena) — `curation.name` queda
  // solo como último fallback defensivo si ni siquiera eso resolvió.
  const displayName = source.title || curation.name;
  const location = formatPublicLocation(source.location, source.region);
  const description = source.description || '';
  const editorial = getDevelopmentEditorialCuration(curation.slug);

  // Sin curaduría editorial declarada para este desarrollo: degrada con gracia a apertura + CTA
  // de cierre, sin inventar secciones ni intentar adivinar bloques de una descripción no curada.
  const heroImage = editorial ? source.images[editorial.heroImageIndex] : source.images[0];
  const introSegment = editorial ? editorial.introSegment : ({ type: 'firstParagraphLead' } as const);
  const introText = resolveSourceTextSegment(description, introSegment);

  const hasIndependentUnits = units.length > 1;

  // Amenities editoriales — opt-in explícito por desarrollo (ver lib/desarrollos.ts), solo con 2+
  // reales estructurados de 2Clics, filtrados primero contra amenities que no aportan al relato
  // (ej. "Permite mascotas", idéntica en toda la cartera — ver `filterEditorialAmenities`). Faena,
  // Flow House y One Hollywood no la activan (cada uno por su propio motivo, ver auditoría en
  // lib/desarrollos.ts) — sin cambios de comportamiento para Faena.
  const amenityNames = editorial?.amenities
    ? filterEditorialAmenities(source.amenities)
        .map((amenity) => amenity.name)
        .filter((name): name is string => Boolean(name))
    : [];
  const showAmenitiesSection = Boolean(editorial?.amenities) && amenityNames.length >= 2;
  const amenitiesImage =
    editorial?.amenities?.imageIndex !== undefined ? source.images[editorial.amenities.imageIndex] : undefined;
  const amenitiesModifier = editorial?.amenities?.layout === 'image-right' ? 'right' : 'left';

  // "Rango de precio" (vigésima pasada) — calculado en runtime contra el precio estructurado real
  // de 2Clics, nunca contra un valor guardado en la curaduría. Se agrega como PRIMER campo del
  // snapshot cuando existe; si `hidePrice` o no hay precio válido, no se agrega nada (nunca un
  // placeholder). Ver `formatDevelopmentPriceRange()` en lib/desarrollos.ts.
  const priceRangeValue = formatDevelopmentPriceRange(source.price, source.currency, source.hidePrice);
  const priceRangeField: DevelopmentSnapshotField | null = priceRangeValue
    ? { label: 'Rango de precio', value: priceRangeValue }
    : null;

  // "Interiores"/"Interiores y residencias" (FASE 4, vigésima pasada) — opt-in por desarrollo,
  // mismo patrón que `amenities`. Se renderiza DESPUÉS del bloque de amenities (cuando ambos están
  // activos) para respetar la secuencia editorial pedida: Amenities → Interiores → CTA.
  const interiorsImages = editorial?.interiors ? resolveSectionImages(source.images, editorial.interiors.imageIndexes) : [];
  const showInteriorsSection = Boolean(editorial?.interiors) && interiorsImages.length > 0;

  return (
    <div className="development-detail">
      {/* Apertura — imagen real + presentación. Sin CTA acá (una sola instancia fuerte de
          consulta, al final) y sin mención de amenities sueltos (ver docs/ai/PROPERTY_UX_DECISIONS.md). */}
      <section className="project-open">
        <div className="container project-open-grid">
          {heroImage ? (
            <div className="project-open-media">
              <Image
                src={heroImage.displayUrl}
                alt=""
                fill
                priority
                sizes="(max-width: 900px) 100vw, 600px"
                style={{ objectFit: 'cover', objectPosition: 'center' }}
              />
            </div>
          ) : null}
          <div className="project-open-copy">
            <p className="eyebrow">Desarrollo</p>
            <h1>{displayName}</h1>
            {location ? <p className="project-open-location">{location}</p> : null}
            {typeof introText === 'string' && introText ? <p className="project-open-text">{introText}</p> : null}
          </div>
        </div>
      </section>

      {editorial
        ? editorial.sections.map((section) => renderSection(section, source.images, description, priceRangeField))
        : null}

      {/* Amenities — opt-in por desarrollo, solo amenities reales estructurados (nunca inferidos
          de texto libre). Mismo patrón visual que los bloques imagen+lista de arriba, reutilizado. */}
      {showAmenitiesSection ? (
        <section className={`project-block project-block--${amenitiesModifier}`}>
          <div className="container project-block-grid">
            {amenitiesImage ? (
              <div className="project-block-media">
                <Image
                  src={amenitiesImage.displayUrl}
                  alt=""
                  fill
                  sizes="(max-width: 900px) 100vw, 560px"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>
            ) : null}
            <div className="project-block-content">
              <h2>{editorial?.amenities?.title || 'Amenities'}</h2>
              <ul className={`project-block-list${amenityNames.length <= 3 ? ' project-block-list--compact' : ''}`}>
                {amenityNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {/* "Interiores"/"Interiores y residencias" — opt-in por desarrollo (ver lib/desarrollos.ts),
          siempre el último bloque visual antes del CTA. Bloque protagonista + complementarias
          (2-4 imágenes) o una sola imagen grande cuando el material real disponible es más
          acotado — nunca se rellena con imágenes de relleno. */}
      {showInteriorsSection ? (
        <section className="project-interiors">
          <div className="container">
            <div className="project-interiors-heading">
              <h2>{editorial?.interiors?.title}</h2>
            </div>
            <div className={`project-interiors-grid project-interiors-grid--${interiorsImages.length}`}>
              {interiorsImages.map((image, index) => (
                <div className="project-interiors-media" key={image.id || index}>
                  <Image
                    src={image.displayUrl}
                    alt=""
                    fill
                    sizes="(max-width: 780px) 100vw, (max-width: 1080px) 50vw, 620px"
                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {hasIndependentUnits ? (
        <section className="twoclics-related-section project-units">
          <div className="container">
            <div className="twoclics-section-heading twoclics-section-heading--compact">
              <h2>Propiedades disponibles</h2>
            </div>
            <div className="twoclics-grid">
              {units.map((unit) => (
                <PropertyCard key={unit.propertyId || unit.title} property={unit} variant="overlay-catalog" />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Cierre — única instancia de CTA en toda la landing. Reutiliza el mismo mecanismo de
          consulta específica que PropertyDetailView.tsx (PropertyInquiryPanel → /api/lead/message
          con property_app_id), nunca /contacto. */}
      <section className="section-sm project-cta-final">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2>¿Querés conocer más sobre {displayName}?</h2>
              <p>Coordiná una conversación con García para recibir información actualizada del desarrollo.</p>
            </div>
            <PropertyInquiryPanel
              propertyId={source.propertyId}
              propertyTitle={displayName}
              propertyRegion={source.region}
              label="Consultar desarrollo"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function renderSection(
  section: DevelopmentSection,
  images: PublicImage[],
  description: string,
  priceRangeField: DevelopmentSnapshotField | null,
) {
  const sectionImages: PublicImage[] = resolveSectionImages(images, section.imageIndexes);
  const segment = resolveSourceTextSegment(description, section.sourceTextSegment);
  const items = Array.isArray(segment) ? segment : [];
  const text = typeof segment === 'string' ? segment : '';
  const hasImage = sectionImages.length > 0;

  if (section.layout === 'snapshot') {
    // "Project Snapshot" editorial (FASE 3, decimoctava pasada; "Rango de precio" agregado en la
    // vigésima) — solo datos P/S ya verificados + el precio real en vivo (nunca disponibilidad ni
    // entrega). Se muestran únicamente los campos declarados por la curaduría más el precio, si
    // existe (nunca placeholders ni "Consultar" para lo que falta) — líneas finas, sin cards. El
    // precio va primero — es el dato dinámico, calculado en runtime, nunca guardado en la
    // curaduría estática (ver `priceRangeField` en el componente principal).
    const fields = priceRangeField ? [priceRangeField, ...(section.snapshotFields || [])] : section.snapshotFields || [];
    if (!fields.length) return null;
    return (
      <section key={section.key} className="project-snapshot">
        <div className="container project-snapshot-inner">
          {fields.map((field) => (
            <div className="project-snapshot-field" key={field.label}>
              <span className="project-snapshot-label">{field.label}</span>
              <span className="project-snapshot-value">{field.value}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.layout === 'image-large') {
    if (!hasImage) return null;
    return (
      <section key={section.key} className="project-momento">
        <div className="project-momento-frame">
          <Image
            src={sectionImages[0].displayUrl}
            alt=""
            fill
            sizes="(max-width: 1200px) 100vw, 1160px"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </div>
      </section>
    );
  }

  if (section.layout === 'text-only') {
    // Bloque sin imagen — puede ser un párrafo curado (`curatedText`/`firstParagraphRest`) o una
    // lista curada sin foto disponible (ej. "Residencias" de Flow House, sin material fotográfico
    // real de unidades) — nunca se fuerza una imagen que no existe.
    if (!text && !items.length) return null;
    return (
      <section key={section.key} className="project-editorial-text">
        <div className="container project-editorial-text-inner">
          {section.title ? <h2>{section.title}</h2> : null}
          {text ? <p>{text}</p> : null}
          {items.length ? (
            <ul className={`project-block-list${items.length <= 3 ? ' project-block-list--compact' : ''}`}>
              {items.map((item, index) => (
                <li key={`${section.key}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    );
  }

  // image-left / image-right — el heading siempre va pegado a su contenido real (texto o lista),
  // nunca solo, para no dejar títulos huérfanos (FASE 2-A). Antes de la decimoctava pasada este
  // bloque solo pintaba `items` (listas) e ignoraba `text` (párrafos) — un bloque con
  // `curatedText`/`firstParagraphRest` y layout image-left/right quedaba con el heading sin
  // ningún contenido debajo (bug real, encontrado en "Hollywood Beach y la ubicación" de Icon
  // Beach). Corregido acá: se pinta lo que corresponda según el tipo de segmento resuelto.
  if (!text && !items.length && !hasImage) return null;
  const modifier = section.layout === 'image-left' ? 'left' : 'right';
  const mediaStyle = section.imageAspect ? { aspectRatio: section.imageAspect } : undefined;
  return (
    <section key={section.key} className={`project-block project-block--${modifier}`}>
      <div className="container project-block-grid">
        {hasImage ? (
          <div className="project-block-media" style={mediaStyle}>
            <Image
              src={sectionImages[0].displayUrl}
              alt=""
              fill
              sizes="(max-width: 900px) 100vw, 560px"
              style={{ objectFit: 'cover', objectPosition: 'center' }}
            />
          </div>
        ) : null}
        <div className="project-block-content">
          {section.title ? <h2>{section.title}</h2> : null}
          {text ? <p className="project-block-text">{text}</p> : null}
          {items.length ? (
            <ul className={`project-block-list${items.length <= 3 ? ' project-block-list--compact' : ''}`}>
              {items.map((item, index) => (
                <li key={`${section.key}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
