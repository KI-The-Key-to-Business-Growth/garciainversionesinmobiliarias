import React from 'react';
import Link from 'next/link';
import ListingImage from '@/components/properties/ListingImage';
import { formatPublicLocation } from '@/lib/2clics/format';
import type { DevelopmentCardSource } from '@/lib/desarrollos';
import type { DevelopmentCuration } from '@/lib/site-curation';

// `source` es un vínculo técnico MÍNIMO (`DevelopmentCardSource`, lib/desarrollos.ts) — NO
// `PublicProperty` completo (decimosexta pasada). Cualquier página que incluya un Client
// Component en su árbol (Header/Footer/WhatsAppFloat lo son en TODA página del sitio) serializa
// las props de CADA Server Component de ese árbol en el payload RSC que llega al navegador —
// visible en "ver código fuente" aunque el JSX nunca lo pinte. Confirmado en vivo: con
// `PublicProperty` completo, el título/descripción comercial cruda de desarrollos como Flow House
// (con una promesa de rentabilidad — "Renta Garantizada 6 %" — y datos de agente/licencia)
// aparecía en el HTML servido de /desarrollos aunque la card nunca los renderiza.
type CuratedDevelopmentCardProps = {
  curation: DevelopmentCuration;
  source: DevelopmentCardSource;
  // 'compact' (decimonovena pasada) — variante visual EXCLUSIVA del índice /desarrollos, para que
  // los desarrollos de un mismo mercado se recorran rápido en una grilla más densa. No afecta a la
  // ficha individual (`CuratedDevelopmentDetailView`), que no usa este componente. Default
  // 'default' preserva exactamente el tamaño/spacing ya aprobado (sin consumidor hoy fuera de
  // /desarrollos, pero se deja como default explícito en vez de asumir 'compact' en todos lados).
  variant?: 'default' | 'compact';
};

// Card de proyecto para /desarrollos (décima pasada — catálogo visual, ya no spotlight/grilla
// separadas; variante compacta agregada en la decimonovena). Imagen protagonista + un único link
// accesible cubriendo toda la card (mismo patrón ya aprobado en PropertyCard overlay: "toda la
// card es un único <Link>"). Solo datos respaldados: imagen + nombre editorial + ubicación pública
// (2Clics real) + slug curado (lib/site-curation.ts). Deliberadamente SIN precio/unidades/año/
// estado/developer/fecha de entrega/rentabilidad/payment plan — García no tiene esos datos
// oficialmente confirmados hoy, y esta card no debe insinuarlos aunque sitios de referencia
// (developers/brokers) sí los muestren.
export default function CuratedDevelopmentCard({ curation, source, variant = 'default' }: CuratedDevelopmentCardProps) {
  const href = `/desarrollos/${curation.slug}`;
  const location = formatPublicLocation(source.location, source.region);
  // `source.title` ya viene resuelto de forma segura desde `toDevelopmentCardSource()`
  // (publicName confirmado por curaduría cuando el título real de 2Clics es deficiente/genérico
  // → título real de la fuente cuando es válido, como Faena) — `curation.name` queda solo como
  // último fallback defensivo si ni siquiera eso resolvió.
  const displayName = source.title || curation.name;
  const isCompact = variant === 'compact';

  return (
    <article className={`twoclics-card twoclics-card--development${isCompact ? ' twoclics-card--development-compact' : ''}`}>
      <Link href={href} className="development-card-link">
        <div className="development-card-media">
          <ListingImage image={source.image} alt="" />
        </div>
        <div className="development-card-body">
          <span className="development-card-eyebrow">Desarrollo</span>
          <h3>{displayName}</h3>
          {location ? <p className="development-card-location">{location}</p> : null}
        </div>
      </Link>
    </article>
  );
}
