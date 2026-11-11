'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';
import { recordWhatsAppClick } from '@/actions/whatsapp-click';
import { getAttributionPayload } from '@/lib/attribution-client';
import { getWhatsAppAssetContext, type WhatsAppAssetContext } from '@/lib/whatsapp-context';
import {
  buildWhatsAppHref,
  buildWhatsAppMessage,
  getSessionRef,
  isGarciaWhatsAppHref,
  markRefRegistered,
  wasRefRegistered,
} from '@/lib/whatsapp-ref';

type DataLayerPayload = Record<string, string>;

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

function buildEventPayload(link: HTMLAnchorElement, ref: string | null): DataLayerPayload {
  const propertyId = getDataValue(link, 'propertyId');
  const propertyTitle = getDataValue(link, 'propertyTitle') || getDataValue(link, 'propertyName');
  const market = getDataValue(link, 'market') || getDataValue(link, 'propertyMarket');

  return cleanPayload({
    event: 'click_whatsapp',
    // Con referencia: el mismo identificador que viaja en el mensaje y se guarda en Supabase.
    event_id: ref ?? `click_whatsapp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
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

function safeSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// Agrega al mensaje preparado el activo y la referencia (solo en enlaces al número de García).
// Se llama en pointerdown/touchstart/contextmenu/focus y en el clic, para que también el
// «abrir en pestaña nueva» y el teclado salgan con la referencia.
function prepareLink(link: HTMLAnchorElement): { ref: string; context: WhatsAppAssetContext | null } | null {
  if (!isGarciaWhatsAppHref(link.href)) return null;
  const context = getWhatsAppAssetContext();
  const ref = getSessionRef(safeSessionStorage(), context?.key ?? 'general');
  const href = buildWhatsAppHref(link.href, buildWhatsAppMessage({ label: context?.label, ref }));
  if (link.href !== href) link.href = href;
  link.dataset.waRef = ref;
  return { ref, context };
}

// Registra el clic una sola vez por referencia y sesión. Un clic NO confirma un mensaje enviado.
function registerClick(ref: string, context: WhatsAppAssetContext | null): void {
  const storage = safeSessionStorage();
  if (wasRefRegistered(storage, ref)) return;
  markRefRegistered(storage, ref);
  void recordWhatsAppClick({
    ref,
    page_location: window.location.href,
    property_id: context?.propertyId,
    attribution: getAttributionPayload(),
  }).catch(() => {
    /* best-effort: nunca debe afectar la navegación hacia WhatsApp */
  });
}

export default function WhatsAppTracking() {
  useEffect(() => {
    const WA_SELECTOR = 'a[href*="wa.me"], a[href*="whatsapp.com"]';
    const findLink = (event: Event) =>
      event.target instanceof Element ? event.target.closest<HTMLAnchorElement>(WA_SELECTOR) : null;

    function onPrepare(event: Event) {
      const link = findLink(event);
      if (link) prepareLink(link);
    }

    function onClick(event: MouseEvent) {
      const link = findLink(event);
      if (!link) return;

      const prepared = prepareLink(link);
      if (prepared) registerClick(prepared.ref, prepared.context);

      // Clic en WhatsApp = intención de contacto (NO un lead confirmado: la conversación se da en la
      // app Business y no hay forma de verificarla desde la web). Solo con consentimiento.
      const { event: eventName, ...params } = buildEventPayload(link, prepared?.ref ?? null);
      trackEvent(eventName, params);
    }

    const PREPARE_EVENTS = ['pointerdown', 'touchstart', 'contextmenu', 'focusin'] as const;
    for (const type of PREPARE_EVENTS) document.addEventListener(type, onPrepare, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('auxclick', onClick, true);
    return () => {
      for (const type of PREPARE_EVENTS) document.removeEventListener(type, onPrepare, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('auxclick', onClick, true);
    };
  }, []);

  return null;
}
