'use client';

import { useEffect, useRef, useState } from 'react';
import { useTurnstile } from './useTurnstile';
import { submitContact } from '@/actions/contact';

// Formulario de contacto cableado a la Server Action submitContact.
// Anti-bot: honeypot (campo website), timing (_form_loaded_at) y Turnstile invisible.
export default function ContactForm() {
  const loadedAtRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const { getToken, reset } = useTurnstile('ts-contact-0');

  useEffect(() => {
    // Timestamp anti-bot (timing check) al montar.
    if (loadedAtRef.current) loadedAtRef.current.value = String(Date.now());
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);

    let token = '';
    try {
      token = await getToken();
    } catch {
      /* fail-open: el server valida */
    }

    const fd = new FormData(form);
    fd.set('cf-turnstile-response', token);
    fd.set('form_name', 'Formulario principal');
    fd.set('lead_type', 'consulta_general');
    fd.set('event_id', `form_submit_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fd.set('page_location', window.location.href);

    (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({
      event: 'form_submit',
      form_name: 'Formulario principal',
      lead_type: 'consulta_general',
      page_location: window.location.href,
    });

    try {
      const res = await submitContact(fd);
      if (!res.ok) {
        alert(res.message || 'No se pudo enviar.');
        reset();
        return;
      }
      (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({
        event: 'generate_lead',
        event_id: res.event_id,
        form_name: 'Formulario principal',
        lead_type: 'consulta_general',
        page_location: window.location.href,
      });
      form.reset();
      reset();
      window.location.href = '/gracias-consulta';
    } catch {
      alert('Hubo un error. Intentá nuevamente.');
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="contact-form reveal" data-crm-contact onSubmit={handleSubmit}>
      {/* honeypot anti-bot: visible solo para bots, oculto para humanos vía CSS */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="hp_website">Dejar en blanco</label>
        <input type="text" id="hp_website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="nombre">Nombre</label>
          <input type="text" id="nombre" name="nombre" placeholder="Tu nombre" required maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="apellido">Apellido</label>
          <input type="text" id="apellido" name="apellido" placeholder="Tu apellido" required maxLength={120} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" name="email" placeholder="tu@email.com" required maxLength={254} />
        </div>
        <div className="field">
          <label htmlFor="telefono">Teléfono / WhatsApp</label>
          <input type="tel" id="telefono" name="telefono" placeholder="+54 9 ..." required maxLength={30} />
        </div>
        <div className="field full">
          <label htmlFor="motivo">Motivo de consulta</label>
          <select id="motivo" name="motivo" defaultValue="">
            <option value="">Seleccionar</option>
            <option>Inversión inmobiliaria</option>
            <option>Compra de propiedad</option>
            <option>Venta de propiedad</option>
            <option>Alquiler de propiedad</option>
            <option>Mercados internacionales</option>
            <option>Asesoramiento general</option>
          </select>
        </div>
        <div className="field full">
          <label htmlFor="mensaje">Mensaje</label>
          <textarea
            id="mensaje"
            name="mensaje"
            placeholder="Contanos brevemente qué tipo de operación te interesa, en qué mercado y con qué presupuesto aproximado. Eso nos permite darte una respuesta más precisa."
            maxLength={2000}
          />
        </div>
        {/* Timestamp anti-bot (oculto) */}
        <input ref={loadedAtRef} type="hidden" name="_form_loaded_at" className="js-form-loaded-at" defaultValue="" />
        {/* Turnstile invisible: contenedor oculto asociado al formulario */}
        <div id="ts-contact-0" aria-hidden="true" style={{ display: 'none' }} />
        <div className="field full">
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Enviando...' : 'Enviar consulta'}
          </button>
        </div>
        <div className="field full">
          <p className="form-legal">
            Al enviar este formulario aceptás que García Inversiones Inmobiliarias utilice tus datos
            para responder tu consulta comercial. <a href="/privacidad">Ver Política de Privacidad</a>.
          </p>
        </div>
      </div>
    </form>
  );
}
