import React from 'react';
import Link from 'next/link';
import PropertyDescription from '@/components/properties/PropertyDescription';
import PropertyInquiryPanel from '@/components/properties/PropertyInquiryPanel';
import PropertyCard from '@/components/properties/PropertyCard';
import PropertyGallery from '@/components/properties/PropertyGallery';
import PropertyMap from '@/components/properties/PropertyMap';
import PropertyShareButton from '@/components/properties/PropertyShareButton';
import {
  compactText,
  formatArea,
  formatCount,
  formatExpenses,
  formatLocation,
  formatOperation,
  formatPublicDisplayValue,
  formatPublicLocation,
  formatPrice,
  isLandPropertyType,
  isOfficePropertyType,
  isZeroExpensesValue,
  numberValue,
} from '@/lib/2clics/format';
import type { PublicProperty } from '@/lib/2clics/types';

type PropertyDetailViewProps = {
  property: PublicProperty;
  relatedProperties?: PublicProperty[];
};

type DetailItem = {
  label: string;
  value: string;
};

const GARCIA_PHONE_DISPLAY = '+54 9 11 6724-0353';
const GARCIA_PHONE_HREF = 'tel:+5491167240353';

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.31-.31.75-.41 1.16-.27 1.28.42 2.65.65 4.07.65.63 0 1.12.49 1.12 1.12v3.49c0 .63-.49 1.12-1.12 1.12C10.58 21.29 2.7 13.42 2.7 3.36c0-.63.5-1.12 1.12-1.12h3.5c.62 0 1.12.49 1.12 1.12 0 1.42.22 2.79.65 4.07.13.4.04.84-.28 1.15l-2.19 2.21Z" />
    </svg>
  );
}

function areaValue(value: string | number | null | undefined): string {
  const parsed = numberValue(value);
  if (parsed !== null) return parsed > 0 ? formatArea(parsed) : '';
  return formatPublicDisplayValue(value);
}

function item(label: string, value: string | number | boolean | null | undefined): DetailItem | null {
  const cleanValue = formatPublicDisplayValue(value);
  return cleanValue ? { label, value: cleanValue } : null;
}

function fact(label: string, value: string): DetailItem | null {
  return value ? { label, value } : null;
}

function detailList(items: Array<DetailItem | null>): DetailItem[] {
  return items.filter((entry): entry is DetailItem => Boolean(entry));
}

function essentialFacts(property: PublicProperty, price: string): DetailItem[] {
  const land = isLandPropertyType(property.propertyType?.name);
  const office = isOfficePropertyType(property.propertyType?.name);
  const rooms = formatCount(property.amountRoom, 'amb.', 'amb.');
  const bedrooms = formatCount(property.amountBedroom, 'dorm.', 'dorm.');
  const bathrooms = formatCount(property.metadata.bathrooms, 'baño', 'baños');
  const garages = formatCount(property.metadata.garages, 'cochera', 'cocheras');
  const totalArea = areaValue(property.totalArea || property.metadata.totalArea);
  const floor = formatPublicDisplayValue(property.metadata.floor);

  if (land) {
    return detailList([
      fact('Precio', price),
      fact('Superficie total', totalArea),
    ]);
  }

  if (office) {
    return detailList([
      fact('Precio', price),
      fact('Ambientes', rooms),
      fact('Baños', bathrooms),
      fact('Cocheras', garages),
      fact('Superficie total', totalArea),
      floor ? fact('Piso', floor) : null,
    ]);
  }

  return detailList([
    fact('Precio', price),
    fact('Ambientes', rooms),
    fact('Dormitorios', bedrooms),
    fact('Baños', bathrooms),
    fact('Cocheras', garages),
    fact('Superficie total', totalArea),
  ]);
}

export default function PropertyDetailView({
  property,
  relatedProperties = [],
}: PropertyDetailViewProps) {
  const location = formatPublicLocation(property.location, property.region);
  const mapLocation = formatLocation(property.location);
  const price = formatPrice(property.price, property.currency, property.hidePrice);
  const operation = formatOperation(property.operationType);
  const expenses = formatExpenses(
    property.metadata.expenses,
    property.metadata.expensesCurrency || property.currency,
  );
  const essentials = essentialFacts(property, price);
  // Tipo de propiedad y Operación NO van acá: ya se comunican arriba, en el
  // eyebrow del hero ("VENTA · CASA") — repetirlos sería duplicar información
  // ya visible por encima de esta sección.
  const showExpensesCurrencyOnly =
    !expenses && !isZeroExpensesValue(property.metadata.expenses) && Boolean(property.metadata.expensesCurrency);
  // Antigüedad (años) y Año/construcción (fecha) son dos formas de contestar la misma pregunta
  // ("hace cuánto se construyó"). Si ya hay Antigüedad, no repetir Año/construcción — sería
  // redundante, no complementario. No se infiere ni se calcula nada: ambos valores ya vienen
  // tal cual de 2Clics, solo se elige cuál mostrar cuando coinciden.
  const hasAntiquity = Boolean(property.metadata.antiquity);
  const basic = detailList([
    item('Piso', property.metadata.floor),
    item('Estado', property.metadata.condition),
    item('Apto crédito', property.aptCredit),
    item('Antigüedad', property.metadata.antiquity),
    item('Año / construcción', hasAntiquity ? '' : property.metadata.constructionDate),
    item('Disposición', property.metadata.disposition),
    item('Orientación', property.metadata.orientation),
    item('Expensas', expenses),
    item('Moneda de expensas', showExpensesCurrencyOnly ? property.metadata.expensesCurrency : ''),
  ]);
  const surfaces = detailList([
    fact('Cubierta', areaValue(property.coveredArea || property.metadata.coveredArea)),
    fact('Descubierta', areaValue(property.uncoveredArea)),
    fact('Semicubierta', areaValue(property.semiCoveredArea || property.metadata.semiCoveredArea)),
    fact('Balcón', areaValue(property.metadata.balconyArea) || formatPublicDisplayValue(property.metadata.balcony)),
    fact('Terreno', areaValue(property.metadata.landArea)),
  ]);
  const additional = detailList([
    item('Toilettes', formatCount(property.metadata.toilettes, 'toilette', 'toilettes')),
    item('Tipo de cochera', property.metadata.garageType),
  ]);
  const hasPrimaryTechnicalInfo = basic.length || surfaces.length;
  const hasBothDetailColumns = Boolean(basic.length && surfaces.length);
  const videoUrl = property.metadata.videoUrl || '';

  function specRows(entries: DetailItem[], extraClassName?: string) {
    const className = extraClassName ? `twoclics-spec-list ${extraClassName}` : 'twoclics-spec-list';
    return (
      <dl className={className}>
        {entries.map((entry) => (
          <div key={entry.label}>
            <dt>{entry.label}</dt>
            <dd>{entry.value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <>
      <section className="twoclics-detail-hero twoclics-detail-hero--property">
        <div className="container twoclics-detail-hero-container">
          <div className="twoclics-detail-hero-nav">
            <Link className="twoclics-back-link" href="/propiedades">
              ← Volver a propiedades
            </Link>
          </div>
          <div className="twoclics-detail-hero-inner twoclics-detail-hero-inner--property">
            <div className="twoclics-detail-heading">
              <p className="eyebrow twoclics-detail-eyebrow">
                {compactText([operation, property.propertyType?.name])}
              </p>
              <h1>{property.title}</h1>
              {location ? <p className="twoclics-detail-location">{location}</p> : null}
            </div>
            <div className="twoclics-detail-hero-action">
              <PropertyShareButton title={property.title} variant="icon" label="Compartir propiedad" />
            </div>
          </div>
        </div>
      </section>

      <section className="twoclics-detail-section">
        <div className="container twoclics-detail-layout">
          <main className="twoclics-detail-main">
            <PropertyGallery images={property.images} title={property.title} />

            <div className="twoclics-mobile-actions" aria-label="Acciones de propiedad">
              <PropertyShareButton title={property.title} variant="icon" label="Compartir propiedad" />
              <PropertyInquiryPanel
                propertyId={property.propertyId}
                propertyTitle={property.title}
                propertyRegion={property.region}
                label="Solicitar asesoramiento"
              />
              <a className="twoclics-mobile-call" href={GARCIA_PHONE_HREF} aria-label="Llamar a García">
                <PhoneIcon />
              </a>
            </div>

            {essentials.length ? (
              <section className="twoclics-essential-strip" aria-label="Datos principales">
                {essentials.map((entry) => (
                  <div key={entry.label} className="twoclics-essential-item">
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </div>
                ))}
              </section>
            ) : null}

            {property.description ? (
              <section className="twoclics-ficha-section twoclics-ficha-section--first">
                <h2>Descripción</h2>
                <PropertyDescription text={property.description} />
              </section>
            ) : null}

            {hasPrimaryTechnicalInfo ? (
              <section className="twoclics-ficha-section">
                <h2>Detalles de la propiedad</h2>
                <div
                  className={
                    hasBothDetailColumns
                      ? 'twoclics-details-columns'
                      : 'twoclics-details-columns twoclics-details-columns--single'
                  }
                >
                  {basic.length ? (
                    <div className="twoclics-details-column">
                      <h3>Información básica</h3>
                      {specRows(basic)}
                    </div>
                  ) : null}

                  {surfaces.length ? (
                    <div className="twoclics-details-column">
                      <h3>Superficies</h3>
                      {specRows(surfaces)}
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {property.amenities.length ? (
              <section className="twoclics-ficha-section">
                <h2>Amenities y servicios</h2>
                <ul className="twoclics-chip-list twoclics-chip-list--compact">
                  {property.amenities.map((amenity) =>
                    amenity.name ? <li key={`${amenity.amenitieId || amenity.name}`}>{amenity.name}</li> : null,
                  )}
                </ul>
              </section>
            ) : null}

            {additional.length ? (
              <section className="twoclics-ficha-section twoclics-ficha-section--minor">
                <h3>Información adicional</h3>
                {specRows(additional, 'twoclics-spec-list--compact')}
              </section>
            ) : null}

            {videoUrl ? (
              <section className="twoclics-ficha-section twoclics-ficha-section--minor">
                <h3>Video</h3>
                <div className="twoclics-detail-actions">
                  <a className="btn btn-outline" href={videoUrl} target="_blank" rel="noopener">
                    Ver video
                  </a>
                </div>
              </section>
            ) : null}

            <PropertyMap
              title={property.title}
              lat={property.lat}
              long={property.long}
              address={property.address}
              number={property.number}
              location={property.location}
              locationText={mapLocation}
            />
          </main>

          <aside className="twoclics-detail-aside">
            <div className="twoclics-detail-panel twoclics-advice-card">
              <p className="twoclics-advice-eyebrow">Asesoramiento</p>
              <h2>García Inversiones Inmobiliarias</h2>
              <div className="twoclics-advice-phone-row">
                <a
                  className="twoclics-advice-phone"
                  href={GARCIA_PHONE_HREF}
                  aria-label="Llamar a García Inversiones Inmobiliarias"
                >
                  {GARCIA_PHONE_DISPLAY}
                </a>
                <a
                  className="twoclics-advice-call"
                  href={GARCIA_PHONE_HREF}
                  aria-label="Llamar a García Inversiones Inmobiliarias"
                >
                  <PhoneIcon />
                </a>
              </div>
              <p>Consultá disponibilidad, información actualizada y próximos pasos.</p>
              <PropertyInquiryPanel
                propertyId={property.propertyId}
                propertyTitle={property.title}
                propertyRegion={property.region}
                label="Consultar esta propiedad"
              />
            </div>

            {property.developmentParent?.developmentId ? (
              <div className="twoclics-detail-panel">
                <h2>Desarrollo asociado</h2>
                <Link href={`/desarrollos/${property.developmentParent.developmentId}`}>
                  {property.developmentParent.title || 'Ver desarrollo'}
                </Link>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {relatedProperties.length ? (
        <section className="twoclics-related-section">
          <div className="container">
            <div className="twoclics-section-heading twoclics-section-heading--compact">
              <h2>Otras propiedades que pueden interesarte</h2>
            </div>
            <div className="twoclics-related-scroller" aria-label="Propiedades relacionadas">
              <div className="twoclics-related-track">
                {relatedProperties.map((related) => (
                  <PropertyCard
                    key={related.propertyId || related.title}
                    property={related}
                    compact
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
