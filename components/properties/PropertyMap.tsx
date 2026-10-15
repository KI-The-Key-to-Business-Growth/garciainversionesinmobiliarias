import React from 'react';
import { compactText, formatLocation, formatPublicDetailValue } from '@/lib/2clics/format';
import type { PublicLocation } from '@/lib/2clics/types';

type PropertyMapProps = {
  title: string;
  lat: number | null;
  long: number | null;
  address: string;
  number: string;
  location: PublicLocation;
  locationText?: string;
  useEmbed?: boolean;
  embedApiKey?: string;
};

export type PropertyMapTarget = {
  query: string;
  label: string;
  precision: 'exact' | 'approximate';
  source: 'coordinates' | 'neighborhood' | 'city' | 'state' | 'location';
};

export type PropertyMapInput = Pick<
  PropertyMapProps,
  'lat' | 'long' | 'address' | 'number' | 'location' | 'locationText' | 'title'
>;

function cleanPart(value: string | null | undefined): string {
  return formatPublicDetailValue(value);
}

// (0,0) — "Null Island" — es el placeholder que 2Clics devuelve cuando nunca se cargó una
// coordenada real (ej. 187683, 187691): nunca se publica como pin.
export function hasUsableCoordinates(lat: number | null, long: number | null): boolean {
  return (
    lat !== null &&
    long !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(long) &&
    lat >= -90 &&
    lat <= 90 &&
    long >= -180 &&
    long <= 180 &&
    !(lat === 0 && long === 0)
  );
}

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function googleMapsPublicEmbedUrl(query: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

export function googleMapsApiEmbedUrl(query: string, apiKey: string): string {
  return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}`;
}

export function googleMapsEmbedUrl(query: string, apiKey?: string): string {
  return apiKey ? googleMapsApiEmbedUrl(query, apiKey) : googleMapsPublicEmbedUrl(query);
}

// El campo `address` de 2Clics es una dirección interna/operativa del CRM (ej. "Pacheco Central 2
// Ambientes a Estrenar con Financiacion", "Benavídez Village · UF 16") — no se usa ni como query ni
// como texto visible. El texto visible es siempre la ubicación pública (`locationText`); el `state`
// crudo (ej. "Bs.As. G.B.A. Norte") solo viaja dentro de la query de búsqueda, nunca como label.
export function resolvePropertyMapTarget(input: PropertyMapInput): PropertyMapTarget | null {
  const publicText = cleanPart(input.locationText);
  const locationText = publicText || cleanPart(formatLocation(input.location));
  const neighborhood = cleanPart(input.location.neighborhood?.name);
  const city = cleanPart(input.location.city?.name);
  const state = cleanPart(input.location.state?.name);

  if (hasUsableCoordinates(input.lat, input.long)) {
    const query = `${input.lat},${input.long}`;
    return {
      query,
      label: locationText || cleanPart(input.title) || query,
      precision: 'exact',
      source: 'coordinates',
    };
  }

  const neighborhoodQuery = compactText([neighborhood, city, state], ', ');
  if (neighborhood && city && state) {
    return {
      query: neighborhoodQuery,
      label: publicText || neighborhoodQuery,
      precision: 'approximate',
      source: 'neighborhood',
    };
  }

  const cityQuery = compactText([city, state], ', ');
  if (city && state) {
    return {
      query: cityQuery,
      label: publicText || cityQuery,
      precision: 'approximate',
      source: 'city',
    };
  }

  if (state) {
    return {
      query: state,
      label: publicText || state,
      precision: 'approximate',
      source: 'state',
    };
  }

  if (locationText) {
    return {
      query: locationText,
      label: locationText,
      precision: 'approximate',
      source: 'location',
    };
  }

  return null;
}

export default function PropertyMap({
  title,
  lat,
  long,
  address,
  number,
  location,
  locationText,
  useEmbed = true,
  embedApiKey = '',
}: PropertyMapProps) {
  const target = resolvePropertyMapTarget({
    title,
    lat,
    long,
    address,
    number,
    location,
    locationText,
  });

  if (!target) return null;

  const searchUrl = googleMapsSearchUrl(target.query);
  const embedUrl = googleMapsEmbedUrl(target.query, embedApiKey || undefined);

  return (
    <section className="twoclics-detail-panel twoclics-map-panel">
      <h2>Ubicación</h2>
      <p className="twoclics-map-location">{target.label}</p>
      {target.precision === 'approximate' ? (
        <p className="twoclics-map-note">Ubicación aproximada</p>
      ) : null}

      {useEmbed ? (
        <>
          <iframe
            className="twoclics-map-frame"
            title={`Mapa de ${title}`}
            src={embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <a className="twoclics-map-link" href={searchUrl} target="_blank" rel="noopener">
            Abrir en Google Maps ↗
          </a>
        </>
      ) : (
        <div className="twoclics-map-placeholder">
          <a className="btn btn-outline" href={searchUrl} target="_blank" rel="noopener">
            Ver ubicación en Google Maps
          </a>
        </div>
      )}
    </section>
  );
}
