'use client';

import { useEffect } from 'react';

type DataLayerPayload = Record<string, string>;

declare global {
  interface Window {
    dataLayer?: DataLayerPayload[];
  }
}

function cleanPayload(payload: DataLayerPayload): DataLayerPayload {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== ''));
}

function dataAttributeName(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function getDataValue(link: HTMLAnchorElement, key: string): string {
  const ownValue = link.dataset[key];
  if (ownValue) return ownValue;

  const owner = link.closest<HTMLElement>(`[data-${dataAttributeName(key)}]`);
  return owner?.dataset[key] || '';
}

function getButtonLocation(link: HTMLAnchorElement): string {
  const explicit = getDataValue(link, 'whatsappLocation');
  if (explicit) return explicit;
  if (link.classList.contains('whatsapp-float')) return 'floating';
  if (link.closest('.hero')) return 'hero';
  if (link.closest('#contacto')) return 'contacto';
  if (link.closest('footer')) return 'footer';
  if (link.closest('[data-property-contact], .property-detail-page')) return 'propiedad';
  return 'whatsapp_link';
}

function getWhatsAppNumber(link: HTMLAnchorElement): string {
  const explicit = getDataValue(link, 'whatsappNumber');
  if (explicit) return explicit;

  try {
    const url = new URL(link.href);
    if (url.hostname.includes('wa.me')) return url.pathname.replace(/\D/g, '');
    return url.searchParams.get('phone')?.replace(/\D/g, '') || '';
  } catch {
    return '';
  }
}

function buildEventPayload(link: HTMLAnchorElement): DataLayerPayload {
  const propertyId = getDataValue(link, 'propertyId');
  const propertyTitle = getDataValue(link, 'propertyTitle') || getDataValue(link, 'propertyName');
  const market = getDataValue(link, 'market') || getDataValue(link, 'propertyMarket');

  return cleanPayload({
    event: 'click_whatsapp',
    event_id: `click_whatsapp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    button_location: getButtonLocation(link),
    button_text: link.textContent?.trim() || link.getAttribute('aria-label') || 'WhatsApp',
    page_path: window.location.pathname,
    page_location: window.location.href,
    whatsapp_number: getWhatsAppNumber(link),
    market,
    property_id: propertyId,
    property_title: propertyTitle,
  });
}

export default function WhatsAppTracking() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest<HTMLAnchorElement>(
        'a[href*="wa.me"], a[href*="whatsapp.com"]',
      );
      if (!link) return;

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(buildEventPayload(link));
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
