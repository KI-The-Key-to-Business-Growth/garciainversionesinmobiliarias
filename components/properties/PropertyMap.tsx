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
  source: 'coordinates' | 'address' | 'neighborhood' | 'city' | 'state' | 'location';
};

export type PropertyMapInput = Pick<
  PropertyMapProps,
  'lat' | 'long' | 'address' | 'number' | 'location' | 'locationText' | 'title'
>;

function cleanPart(value: string | null | undefined): string {
  return formatPublicDetailValue(value);
}

function hasUsableCoordinates(lat: number | null, long: number | null): boolean {
  return (
    lat !== null &&
    long !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(long) &&
    lat >= -90 &&
    lat <= 90 &&
    long >= -180 &&
    long <= 180
  );
}

function hasStreetNumber(address: string, number: string): boolean {
  return Boolean(number || /\d/.test(address));
}

function joinAddress(address: string, number: string, locationText: string): string {
  return compactText([compactText([address, number], ' '), locationText], ', ');
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

export function resolvePropertyMapTarget(input: PropertyMapInput): PropertyMapTarget | null {
  const locationText = cleanPart(input.locationText || formatLocation(input.location));
  const address = cleanPart(input.address);
  const number = cleanPart(input.number);
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

  if (address && hasStreetNumber(address, number)) {
    const query = joinAddress(address, number, locationText);
    return {
      query,
      label: compactText([address, number], ' '),
      precision: 'exact',
      source: 'address',
    };
  }

  const neighborhoodQuery = compactText([neighborhood, city, state], ', ');
  if (neighborhood && city && state) {
    return {
      query: neighborhoodQuery,
      label: neighborhoodQuery,
      precision: 'approximate',
      source: 'neighborhood',
    };
  }

  const cityQuery = compactText([city, state], ', ');
  if (city && state) {
    return {
      query: cityQuery,
      label: cityQuery,
      precision: 'approximate',
      source: 'city',
    };
  }

  if (state) {
    return {
      query: state,
      label: state,
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
