import React from 'react';
import Link from 'next/link';
import ListingImage from '@/components/properties/ListingImage';
import {
  compactText,
  formatArea,
  formatCount,
  formatOperation,
  formatPrice,
  formatPublicLocation,
  isLandPropertyType,
  isOfficePropertyType,
  propertyHref,
} from '@/lib/2clics/format';
import type { PublicProperty } from '@/lib/2clics/types';

type PropertyCardProps = {
  property: PublicProperty;
  compact?: boolean;
  // Info principal superpuesta sobre la foto en vez de en un bloque blanco debajo. Aprobada para
  // /propiedades y Home ("Oportunidades seleccionadas") — ver docs/ai/PROPERTY_UX_DECISIONS.md.
  // La ficha (relacionadas, `PropertyDetailView.tsx`) sigue con 'default' sin cambios.
  //
  // 'overlay-home' vs. 'overlay-catalog' (2026-09-02, pedido explícito): comparten TODO el
  // markup/CSS salvo el comportamiento del título, porque Home y el catálogo cumplen funciones
  // distintas — Home muestra solo 3 destacadas y prioriza impacto visual (título oculto en
  // reposo, aparece en hover/focus en desktop); el catálogo necesita escanearse rápido con
  // muchas cards seguidas, así que el título queda SIEMPRE visible (1 línea en reposo, hasta 2 en
  // hover/focus en desktop). La diferencia se resuelve con una clase adicional
  // (`twoclics-card--overlay-catalog`) sobre el mismo `.twoclics-card--overlay` — no hay CSS
  // duplicado, solo un bloque de override acotado al `<h3>`.
  variant?: 'default' | 'overlay-home' | 'overlay-catalog';
};

// Mismo criterio que la ficha (`PropertyDetailView.tsx`, `essentialFacts`) para que ambas vistas
// nunca se contradigan: Terreno/Lote y Oficina no se tratan como vivienda estándar. Un valor <= 0
// nunca se muestra (`formatCount`/`formatArea` ya lo descartan) — "0 dorm."/"0 baños"/
// "0 cocheras"/"0 amb." representan ausencia o no aplicación, no un dato real.
function propertyFacts(property: PublicProperty): string[] {
  const land = isLandPropertyType(property.propertyType?.name);
  const office = isOfficePropertyType(property.propertyType?.name);
  const rooms = formatCount(property.amountRoom, 'amb.', 'amb.');
  const bedrooms = formatCount(property.amountBedroom, 'dorm.', 'dorm.');
  const bathrooms = formatCount(property.metadata.bathrooms, 'baño', 'baños');
  const garages = formatCount(property.metadata.garages, 'cochera', 'cocheras');
  const totalArea = formatArea(property.totalArea);

  // Terreno/Lote: superficie y nada más — dormitorios/baños/cocheras/ambientes no aplican, no se
  // rellena el espacio artificialmente aunque alguno tuviera un valor real por error de carga.
  if (land) return [totalArea].filter(Boolean);

  // Oficina: nunca Dormitorios, aunque el CRM traiga un valor (nuestro inventario real muestra
  // amountBedroom=1 en las 4 Oficinas auditadas — un dato residual, no un dormitorio real).
  if (office) return [rooms, bathrooms, garages, totalArea].filter(Boolean);

  return [rooms, bedrooms, bathrooms, garages, totalArea].filter(Boolean);
}

export default function PropertyCard({ property, compact = false, variant = 'default' }: PropertyCardProps) {
  const href = propertyHref(property);
  const location = formatPublicLocation(property.location, property.region);
  const price = formatPrice(property.price, property.currency, property.hidePrice);
  const operation = formatOperation(property.operationType);
  const type = property.propertyType?.name || '';
  const facts = propertyFacts(property);
  const featured = property.webListing === 'DESTACADO';

  if (variant === 'overlay-home' || variant === 'overlay-catalog') {
    const overlayClassName =
      variant === 'overlay-catalog'
        ? 'twoclics-card twoclics-card--overlay twoclics-card--overlay-catalog'
        : 'twoclics-card twoclics-card--overlay';
    return (
      <article className={overlayClassName}>
        <Link href={href} className="twoclics-card-media" aria-label={`Ver propiedad ${property.title}`}>
          <ListingImage image={property.images[0]} alt={property.title} />
          <div className="twoclics-card-gradient" />
          <div className="twoclics-card-badges">
            {operation ? <span>{operation}</span> : null}
            {featured ? <span className="twoclics-card-badge--subtle">Destacada</span> : null}
          </div>
          <div className="twoclics-card-overlay-info">
            <h3>{property.title}</h3>
            {location ? <p className="twoclics-card-location">{location}</p> : null}
            {price ? <p className="twoclics-card-price">{price}</p> : null}
            {facts.length ? <p className="twoclics-card-facts">{compactText(facts)}</p> : null}
            <div className="twoclics-card-overlay-footer">
              <span className="twoclics-card-overlay-cta">Ver propiedad →</span>
              {type ? <span className="twoclics-card-meta">{type}</span> : null}
            </div>
          </div>
        </Link>
        {property.developmentParent?.developmentId ? (
          <Link
            href={`/desarrollos/${property.developmentParent.developmentId}`}
            className="twoclics-card-relation twoclics-card-relation--overlay"
          >
            {property.developmentParent.title || 'Ver desarrollo'}
          </Link>
        ) : null}
      </article>
    );
  }

  return (
    <article className={compact ? 'twoclics-card twoclics-card--compact' : 'twoclics-card'}>
      <Link href={href} className="twoclics-card-media" aria-label={`Ver propiedad ${property.title}`}>
        <ListingImage image={property.images[0]} alt={property.title} />
        <div className="twoclics-card-badges">
          {operation ? <span>{operation}</span> : null}
          {featured ? <span>Destacada</span> : null}
        </div>
      </Link>

      <div className="twoclics-card-body">
        {type ? (
          <div className="twoclics-card-meta">
            <span>{type}</span>
          </div>
        ) : null}
        <h3>
          <Link href={href}>{property.title}</Link>
        </h3>
        {location ? <p className="twoclics-card-location">{location}</p> : null}
        {price ? <p className="twoclics-card-price">{price}</p> : null}
        {facts.length ? <p className="twoclics-card-facts">{compactText(facts)}</p> : null}
        {property.developmentParent?.developmentId ? (
          <Link
            href={`/desarrollos/${property.developmentParent.developmentId}`}
            className="twoclics-card-relation"
          >
            {property.developmentParent.title || 'Ver desarrollo'}
          </Link>
        ) : null}
        <Link href={href} className="btn btn-dark twoclics-card-cta">
          Ver propiedad
        </Link>
      </div>
    </article>
  );
}
