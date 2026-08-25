'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { submitPropertyInquiry } from '@/actions/property-inquiry';
import type { PropertyInquiryState } from '@/lib/2clics/property-inquiry';
import type { TwoclicsRegion } from '@/lib/2clics/types';

type PropertyInquiryPanelProps = {
  propertyId: number | null;
  propertyTitle: string;
  propertyRegion: TwoclicsRegion;
  label: string;
};

const INITIAL_MESSAGE = 'Hola, quiero recibir más información sobre esta propiedad.';
const INITIAL_STATE: PropertyInquiryState = { ok: false };

export default function PropertyInquiryPanel({
  propertyId,
  propertyTitle,
  propertyRegion,
  label,
}: PropertyInquiryPanelProps) {
  const [open, setOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<PropertyInquiryState>(INITIAL_STATE);
  const loadedAtRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (loadedAtRef.current) loadedAtRef.current.value = String(Date.now());
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set('page_url', window.location.href);
    setSubmitting(true);

    try {
      const result = await submitPropertyInquiry(formData);
      setState(result);
      if (result.ok && result.message) form.reset();
    } catch {
      setState({
        ok: false,
        message: 'No pudimos procesar tu consulta en este momento. Por favor intenta de nuevo.',
      });
    } finally {
      setSubmitting(false);
    }
  }

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
            <h3 id="property-inquiry-title">Consultar esta propiedad</h3>
            <p className="twoclics-inquiry-property">{propertyTitle}</p>

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
                  defaultValue={INITIAL_MESSAGE}
                />
              </div>

              {state.message ? (
                <p className={state.ok ? 'twoclics-inquiry-status is-ok' : 'twoclics-inquiry-status is-error'}>
                  {state.message}
                </p>
              ) : null}

              <button className="btn btn-primary" type="submit" disabled={submitting || !propertyId}>
                {submitting ? 'Enviando...' : 'Enviar consulta'}
              </button>
            </form>
          </section>
        </div>,
          portalRoot,
        )
        : null}
    </>
  );
}
