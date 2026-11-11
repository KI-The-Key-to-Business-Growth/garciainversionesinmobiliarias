'use client';

import React, { useEffect, useState } from 'react';
import { CONSENT_CHANGE_EVENT, type ConsentChoice } from '@/lib/consent';
import { getStoredConsent } from '@/lib/consent-client';
import { shouldAutoLoadEmbed } from '@/lib/embed-consent';

type Props = {
  src: string;
  title: string;
  /** Clase del marco: el aviso ocupa el mismo espacio que ocuparía el mapa (sin saltos de diseño). */
  className: string;
  provider?: string;
};

// Contenido incrustado de un tercero (hoy: Google Maps). Hasta que el visitante lo pide (botón) o
// acepta las cookies de publicidad, NO se carga el iframe: así Google no recibe la visita por el
// solo hecho de abrir la página. Los enlaces «Abrir en Google Maps» de las páginas no cambian.
export default function ConsentGatedEmbed({ src, title, className, provider = 'Google Maps' }: Props) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (shouldAutoLoadEmbed(getStoredConsent())) setLoaded(true);
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentChoice>).detail;
      if (shouldAutoLoadEmbed(detail)) setLoaded(true);
    };
    window.addEventListener(CONSENT_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onChange);
  }, []);

  if (loaded) {
    return (
      <iframe
        className={className}
        title={title}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    );
  }

  return (
    <div className={`${className} embed-consent`} data-consent-embed="blocked" data-embed-src={src}>
      <p className="embed-consent-text">
        Este mapa lo muestra {provider}, un servicio de terceros que puede usar cookies o datos técnicos de tu
        navegador. No se carga hasta que lo pidas.
      </p>
      <button type="button" className="btn btn-outline embed-consent-button" onClick={() => setLoaded(true)}>
        Cargar mapa
      </button>
    </div>
  );
}
