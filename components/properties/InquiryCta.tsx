import React from 'react';

type InquiryCtaProps = {
  propertyId?: number | null;
  developmentId?: number | null;
  label: string;
};

export default function InquiryCta({ propertyId, developmentId, label }: InquiryCtaProps) {
  const params = new URLSearchParams();
  if (propertyId) params.set('property_app_id', String(propertyId));
  if (developmentId) params.set('development_app_id', String(developmentId));
  const href = params.size ? `/contacto?${params.toString()}` : '/contacto';

  return (
    <a
      className="btn btn-primary twoclics-detail-cta"
      href={href}
      data-property-app-id={propertyId || undefined}
      data-development-app-id={developmentId || undefined}
    >
      {label}
    </a>
  );
}
