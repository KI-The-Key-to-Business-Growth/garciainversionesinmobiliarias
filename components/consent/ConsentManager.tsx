'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CONSENT_ALL,
  CONSENT_DENIED,
  CONSENT_OPEN_EVENT,
  type ConsentChoice,
} from '@/lib/consent';
import { applyConsent, getStoredConsent } from '@/lib/consent-client';

// Banner de consentimiento + panel de preferencias. Modelo conservador: hasta que el visitante
// elige, no se carga ninguna tecnología opcional (ver lib/gtm.ts). Las categorías esenciales
// (formularios, Turnstile, WhatsApp, seguridad) funcionan siempre y no se piden.
export default function ConsentManager() {
  const [ready, setReady] = useState(false);
  const [decided, setDecided] = useState<ConsentChoice | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [draft, setDraft] = useState<ConsentChoice>(CONSENT_DENIED);
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const stored = getStoredConsent();
    if (stored) {
      setDecided({ analytics: stored.analytics, marketing: stored.marketing });
      setDraft({ analytics: stored.analytics, marketing: stored.marketing });
    } else {
      setShowBanner(true);
    }
    setReady(true);
  }, []);

  const openPrefs = useCallback(() => {
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setShowPrefs(true);
    setShowBanner(false);
  }, []);

  // Permite reabrir el panel desde el footer y desde /privacidad (elección modificable en cualquier momento).
  useEffect(() => {
    function onOpen() {
      const stored = getStoredConsent();
      setDraft(stored ? { analytics: stored.analytics, marketing: stored.marketing } : CONSENT_DENIED);
      openPrefs();
    }
    window.addEventListener(CONSENT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, onOpen);
  }, [openPrefs]);

  const choose = useCallback((choice: ConsentChoice) => {
    setDecided(choice);
    setDraft(choice);
    setShowBanner(false);
    setShowPrefs(false);
    // Si se retiró un permiso ya activo, applyConsent recarga la página (descarga scripts de terceros).
    applyConsent(choice);
    openerRef.current?.focus?.();
  }, []);

  useEffect(() => {
    if (!showPrefs) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && decided) setShowPrefs(false);
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [showPrefs, decided]);

  if (!ready) return null;

  return (
    <>
      {showBanner ? (
        <div className="consent-banner" role="region" aria-label="Preferencias de cookies" data-consent-banner>
          <div className="consent-banner-text">
            <p className="consent-title">Tu privacidad</p>
            <p>
              Usamos cookies propias y de terceros para medir el uso del sitio y la efectividad de nuestras
              campañas. Podés aceptarlas, rechazarlas o elegir cuáles permitir. El sitio, los formularios y
              WhatsApp funcionan igual si las rechazás.{' '}
              <Link href="/privacidad#cookies">Más información</Link>
            </p>
          </div>
          <div className="consent-banner-actions">
            <button type="button" className="consent-btn consent-btn-primary" onClick={() => choose(CONSENT_ALL)} data-consent-accept>
              Aceptar todo
            </button>
            <button type="button" className="consent-btn" onClick={() => choose(CONSENT_DENIED)} data-consent-reject>
              Rechazar opcionales
            </button>
            <button type="button" className="consent-btn consent-btn-link" onClick={openPrefs} data-consent-configure>
              Configurar
            </button>
          </div>
        </div>
      ) : null}

      {showPrefs ? (
        <div
          className="consent-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && decided) setShowPrefs(false);
          }}
        >
          <div
            className="consent-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="consent-panel-title"
            tabIndex={-1}
            ref={panelRef}
            data-consent-panel
          >
            <h2 id="consent-panel-title">Preferencias de cookies</h2>
            <p className="consent-panel-intro">
              Elegí qué tecnologías opcionales podemos usar. Podés cambiar tu elección cuando quieras desde
              «Preferencias de cookies» al pie del sitio.
            </p>

            <div className="consent-row">
              <div>
                <strong>Esenciales</strong>
                <p>
                  Necesarias para que el sitio funcione y sea seguro: formularios, verificación anti-spam
                  (Cloudflare Turnstile), enlaces a WhatsApp y esta misma preferencia. Siempre activas.
                </p>
              </div>
              <span className="consent-always">Siempre activas</span>
            </div>

            <div className="consent-row">
              <div>
                <strong>Analítica</strong>
                <p>
                  Google Analytics 4 (vía Google Tag Manager): nos ayuda a entender qué páginas y propiedades
                  se visitan y cómo mejorar el sitio. También permite guardar el origen de la visita.
                </p>
              </div>
              <label className="consent-switch">
                <input
                  type="checkbox"
                  checked={draft.analytics}
                  onChange={(e) => setDraft({ ...draft, analytics: e.target.checked })}
                  data-consent-analytics
                />
                <span className="consent-switch-label">{draft.analytics ? 'Activada' : 'Desactivada'}</span>
              </label>
            </div>

            <div className="consent-row">
              <div>
                <strong>Publicidad y medición de campañas</strong>
                <p>
                  Meta Pixel y Google Ads: miden qué anuncios generan consultas y permiten mostrarte
                  publicidad más relevante. También guardan los identificadores de clic de los anuncios.
                </p>
              </div>
              <label className="consent-switch">
                <input
                  type="checkbox"
                  checked={draft.marketing}
                  onChange={(e) => setDraft({ ...draft, marketing: e.target.checked })}
                  data-consent-marketing
                />
                <span className="consent-switch-label">{draft.marketing ? 'Activada' : 'Desactivada'}</span>
              </label>
            </div>

            <div className="consent-panel-actions">
              <button type="button" className="consent-btn consent-btn-primary" onClick={() => choose(draft)} data-consent-save>
                Guardar preferencias
              </button>
              <button type="button" className="consent-btn" onClick={() => choose(CONSENT_ALL)}>
                Aceptar todo
              </button>
              <button type="button" className="consent-btn" onClick={() => choose(CONSENT_DENIED)}>
                Rechazar opcionales
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
