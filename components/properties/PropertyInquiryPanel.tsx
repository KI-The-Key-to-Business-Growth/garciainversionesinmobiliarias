'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { submitPropertyInquiry } from '@/actions/property-inquiry';
import type { PropertyInquiryState } from '@/lib/2clics/property-inquiry';
import type { TwoclicsRegion } from '@/lib/2clics/types';
import TurnstileScript from '@/components/forms/TurnstileScript';
import { useTurnstile } from '@/components/forms/useTurnstile';
import { getAttributionPayload } from '@/lib/attribution-client';
import { trackEventOnce } from '@/lib/analytics';

type PropertyInquiryPanelProps = {
  propertyId: number | null;
  propertyTitle: string;
  propertyRegion: TwoclicsRegion;
  label: string;
  // Copy contextual OPCIONAL del modal (vigesimocuarta pasada, Domus Brickell Center) — sin
  // pasarlos, el modal conserva exactamente el título/mensaje genéricos de siempre (todos los
  // demás consumidores: PropertyDetailView, InvestmentOpportunityDetailView, el resto de
  // Desarrollos). Nunca cambia el mecanismo de envío/endpoint/validación.
  modalTitle?: string;
  initialMessage?: string;
};

const DEFAULT_MODAL_TITLE = 'Consultar esta propiedad';
const DEFAULT_INITIAL_MESSAGE = 'Hola, quiero recibir más información sobre esta propiedad.';
const INITIAL_STATE: PropertyInquiryState = { ok: false };

export default function PropertyInquiryPanel({
  propertyId,
  propertyTitle,
  propertyRegion,
  label,
  modalTitle = DEFAULT_MODAL_TITLE,
  initialMessage = DEFAULT_INITIAL_MESSAGE,
}: PropertyInquiryPanelProps) {
  const [open, setOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [state, setState] = useState<PropertyInquiryState>(INITIAL_STATE);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn btn-primary twoclics-detail-cta"
        data-property-app-id={propertyId || undefined}
        disabled={!propertyId}
        onClick={() => {
          setState(INITIAL_STATE);
          setOpen(true);
        }}
      >
        {label}
      </button>

      {open ? <TurnstileScript /> : null}

      {open && portalRoot
        ? createPortal(
        <div
          className="twoclics-inquiry-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            className="twoclics-inquiry-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="property-inquiry-title"
          >
            <button
              type="button"
              className="twoclics-inquiry-close"
              aria-label="Cerrar consulta"
              onClick={() => setOpen(false)}
            >
              ×
            </button>

            <p className="eyebrow">Consulta de propiedad</p>
            <h3 id="property-inquiry-title">{modalTitle}</h3>
            <p className="twoclics-inquiry-property">{propertyTitle}</p>

            <PropertyInquiryForm
              propertyId={propertyId}
              propertyTitle={propertyTitle}
              propertyRegion={propertyRegion}
              initialMessage={initialMessage}
              state={state}
              setState={setState}
            />
          </section>
        </div>,
          portalRoot,
        )
        : null}
    </>
  );
}

type PropertyInquiryFormProps = {
  propertyId: number | null;
  propertyTitle: string;
  propertyRegion: TwoclicsRegion;
  initialMessage: string;
  state: PropertyInquiryState;
  setState: (state: PropertyInquiryState) => void;
};

// El formulario vive en su propio componente: se monta al abrir el modal, así el contenedor de
// Turnstile ya existe en el DOM cuando useTurnstile renderiza el widget.
function PropertyInquiryForm({
  propertyId,
  propertyTitle,
  propertyRegion,
  initialMessage,
  state,
  setState,
}: PropertyInquiryFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const loadedAtRef = useRef<HTMLInputElement>(null);
  const { getToken, reset, required } = useTurnstile('ts-property-inquiry');

  useEffect(() => {
    if (loadedAtRef.current) loadedAtRef.current.value = String(Date.now());
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);

    let token = '';
    try {
      token = await getToken();
    } catch {
      token = '';
    }

    // Con Turnstile requerido no se envía con token vacío: el servidor lo rechazaría igual.
    if (required && !token) {
      setState({
        ok: false,
        message: 'No pudimos completar la verificación de seguridad. Recargá la página e intentá nuevamente.',
      });
      reset();
      setSubmitting(false);
      return;
    }

    const formData = new FormData(form);
    formData.set('page_url', window.location.href);
    const attribution = getAttributionPayload();
    if (attribution) formData.set('attribution', attribution);
    formData.set('cf-turnstile-response', token);

    try {
      const result = await submitPropertyInquiry(formData);
      setState(result);
      // generate_lead: UNA sola vez, solo con la consulta efectivamente recibida (event_id lo
      // entrega el servidor tras enviar a 2Clics o respaldar por email; los envíos simulados de
      // Preview/Development y los rechazos no traen event_id y no cuentan).
      if (result.ok && result.event_id) {
        trackEventOnce('generate_lead', result.event_id, {
          lead_type: 'consulta_propiedad',
          form_name: 'Consulta de propiedad',
          content_type: 'property',
          property_id: result.property_id,
          development_slug: result.development_slug,
          page_location: window.location.href,
        });
      }
      if (result.ok && result.message) form.reset();
      if (!result.ok) reset();
    } catch {
      setState({
        ok: false,
        message: 'No pudimos procesar tu consulta en este momento. Por favor intenta de nuevo.',
      });
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
            <form className="twoclics-inquiry-form" onSubmit={handleSubmit}>
              <input type="hidden" name="property_app_id" value={propertyId || ''} />
              <input type="hidden" name="property_title" value={propertyTitle} />
              <input type="hidden" name="property_region" value={propertyRegion} />
              <input type="hidden" name="page_url" value="" readOnly />
              <input
                ref={loadedAtRef}
                type="hidden"
                name="_form_loaded_at"
                className="js-form-loaded-at"
                defaultValue=""
              />

              <div className="hp-field" aria-hidden="true">
                <label htmlFor="property_hp_website">Dejar en blanco</label>
                <input id="property_hp_website" type="text" name="website" tabIndex={-1} autoComplete="off" />
              </div>

              <div className="field">
                <label htmlFor="property_inquiry_name">Nombre</label>
                <input id="property_inquiry_name" name="name" type="text" required maxLength={120} />
              </div>
              <div className="field">
                <label htmlFor="property_inquiry_email">Email</label>
                <input id="property_inquiry_email" name="email" type="email" required maxLength={254} />
              </div>
              <div className="field">
                <label htmlFor="property_inquiry_phone">Teléfono</label>
                <input id="property_inquiry_phone" name="phone" type="tel" required maxLength={30} />
              </div>
              <div className="field">
                <label htmlFor="property_inquiry_message">Mensaje</label>
                <textarea
                  id="property_inquiry_message"
                  name="message"
                  required
                  maxLength={2000}
                  defaultValue={initialMessage}
                />
              </div>

              {state.message ? (
                <p className={state.ok ? 'twoclics-inquiry-status is-ok' : 'twoclics-inquiry-status is-error'}>
                  {state.message}
                </p>
              ) : null}

              {/* Turnstile invisible: contenedor oculto asociado al formulario */}
              <div id="ts-property-inquiry" aria-hidden="true" style={{ display: 'none' }} />
              <button className="btn btn-primary" type="submit" disabled={submitting || !propertyId}>
                {submitting ? 'Enviando...' : 'Enviar consulta'}
              </button>
            </form>
  );
}
