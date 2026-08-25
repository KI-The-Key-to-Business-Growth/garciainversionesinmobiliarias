import React from 'react';
import Link from 'next/link';
import type { ListingsStatus } from '@/lib/2clics/listings';

type ListingStateProps = {
  status: ListingsStatus | 'not-found';
  kind?: 'catalog' | 'property' | 'development' | 'featured';
  filtered?: boolean;
};

export function listingStateMessage({
  status,
  kind = 'catalog',
  filtered = false,
}: ListingStateProps): string {
  if (status === 'ready' && filtered) {
    return 'No encontramos propiedades con estos criterios. Probá modificando los filtros.';
  }

  if (status === 'not-found') {
    return kind === 'development'
      ? 'No encontramos el desarrollo solicitado.'
      : 'No encontramos la propiedad solicitada.';
  }

  if (kind === 'featured' && status === 'ready') {
    return 'Por ahora no hay oportunidades destacadas publicadas.';
  }

  if (kind === 'catalog' && status === 'ready') {
    return 'Por ahora no hay propiedades publicadas para mostrar.';
  }

  return 'No pudimos cargar esta información en este momento. Podés intentar nuevamente más tarde o escribirnos para recibir atención personalizada.';
}

export default function ListingState(props: ListingStateProps) {
  return (
    <div className="twoclics-state" role="status">
      <p>{listingStateMessage(props)}</p>
      <Link className="btn btn-outline" href="/#contacto">
        Contactar a García
      </Link>
    </div>
  );
}
