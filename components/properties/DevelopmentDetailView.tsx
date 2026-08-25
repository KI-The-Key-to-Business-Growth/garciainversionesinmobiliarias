import React from 'react';
import Link from 'next/link';
import InquiryCta from '@/components/properties/InquiryCta';
import PropertyGallery from '@/components/properties/PropertyGallery';
import PropertyMap from '@/components/properties/PropertyMap';
import {
  compactText,
  developmentUnitHref,
  formatArea,
  formatLocation,
  formatPublicDetailValue,
  formatPrice,
} from '@/lib/2clics/format';
import type { PublicDevelopment } from '@/lib/2clics/types';

type DevelopmentDetailViewProps = {
  development: PublicDevelopment;
};

export default function DevelopmentDetailView({ development }: DevelopmentDetailViewProps) {
  const location = formatLocation(development.location);
  const typeName = formatPublicDetailValue(development.type?.name);
  const statusName = formatPublicDetailValue(development.status?.name);
  const meta = compactText([typeName, statusName]);

  return (
    <>
      <section className="twoclics-detail-hero">
        <div className="container twoclics-detail-hero-inner">
          <div>
            <p className="eyebrow">DESARROLLO</p>
            <h1>{development.title}</h1>
            {location ? <p className="twoclics-detail-location">{location}</p> : null}
          </div>
          <div className="twoclics-detail-price-block">
            <span>{development.marketLabel || location}</span>
            {meta ? <strong>{meta}</strong> : null}
          </div>
        </div>
      </section>

      <section className="twoclics-detail-section">
        <div className="container twoclics-detail-layout">
          <main className="twoclics-detail-main">
            <PropertyGallery images={development.images} plans={development.plans} title={development.title} />

            {development.description ? (
              <section className="twoclics-detail-panel">
                <h2>Descripción</h2>
                <p className="twoclics-rich-text">{development.description}</p>
              </section>
            ) : null}

            {development.amenities.length ? (
              <section className="twoclics-detail-panel">
                <h2>Amenities</h2>
                <ul className="twoclics-chip-list">
                  {development.amenities.map((amenity) =>
                    amenity.name ? <li key={`${amenity.amenitieId || amenity.name}`}>{amenity.name}</li> : null,
                  )}
                </ul>
              </section>
            ) : null}

            {development.properties.length ? (
              <section className="twoclics-detail-panel">
                <h2>Unidades asociadas</h2>
                <div className="twoclics-units">
                  {development.properties.map((unit) => {
                    const price = formatPrice(unit.price, unit.currency);
                    const area = formatArea(unit.totalArea);
                    const href = developmentUnitHref(unit);
                    return (
                      <Link key={unit.propertyId || unit.address} href={href} className="twoclics-unit">
                        <strong>{unit.address || unit.propertyType?.name || 'Unidad'}</strong>
                        <span>
                          {compactText([
                            unit.propertyType?.name,
                            unit.amountRoom ? `${unit.amountRoom} amb.` : '',
                            unit.amountBedroom ? `${unit.amountBedroom} dorm.` : '',
                            area,
                            price,
                          ])}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <PropertyMap
              title={development.title}
              lat={development.lat}
              long={development.long}
              address={development.address}
              number={development.number}
              location={development.location}
              locationText={location}
            />
          </main>

          <aside className="twoclics-detail-aside">
            <div className="twoclics-detail-panel">
              <h2>Consulta</h2>
              <p>Podés consultar este desarrollo para recibir información actualizada.</p>
              <InquiryCta developmentId={development.developmentId} label="Consultar este desarrollo" />
            </div>

            <div className="twoclics-detail-panel">
              <h2>Resumen</h2>
              <dl className="twoclics-detail-list twoclics-detail-list--compact">
                {typeName ? (
                  <div>
                    <dt>Tipo</dt>
                    <dd>{typeName}</dd>
                  </div>
                ) : null}
                {statusName ? (
                  <div>
                    <dt>Estado</dt>
                    <dd>{statusName}</dd>
                  </div>
                ) : null}
                {formatPublicDetailValue(development.metadata.deliveryDate) ? (
                  <div>
                    <dt>Entrega</dt>
                    <dd>{formatPublicDetailValue(development.metadata.deliveryDate)}</dd>
                  </div>
                ) : null}
                {development.properties.length ? (
                  <div>
                    <dt>Unidades</dt>
                    <dd>{development.properties.length}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
