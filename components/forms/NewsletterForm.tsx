'use client';

import { useEffect, useRef, useState } from 'react';
import { useTurnstile } from './useTurnstile';
import { submitNewsletter } from '@/actions/newsletter';

// Formulario de newsletter cableado a la Server Action submitNewsletter.
export default function NewsletterForm() {
  const loadedAtRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const { getToken, reset } = useTurnstile('ts-newsletter-0');

  useEffect(() => {
    if (loadedAtRef.current) loadedAtRef.current.value = String(Date.now());
  }, []);

  function showSuccess() {
    const el = document.getElementById('newsletterSuccess');
    if (!el) return;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 7000);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSubmitting(true);

    let token = '';
    try {
      token = await getToken();
    } catch {
      /* fail-open */
    }

    const fd = new FormData(form);
    fd.set('cf-turnstile-response', token);
    fd.set('form_name', 'Newsletter');
    fd.set('lead_type', 'newsletter');
    fd.set('event_id', `newsletter_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fd.set('page_location', window.location.href);

    try {
      const res = await submitNewsletter(fd);
      if (!res.ok) {
        alert(res.message || 'No se pudo enviar.');
        reset();
        return;
      }
      (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({
        event: 'newsletter_signup',
        event_id: res.event_id,
        form_name: 'Newsletter',
        page_location: window.location.href,
      });
      form.reset();
      reset();
      showSuccess();
    } catch {
      alert('Hubo un error. Intentá nuevamente.');
      reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="newsletter-form" data-newsletter onSubmit={handleSubmit}>
      {/* honeypot */}
      <div className="hp-field" aria-hidden="true">
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <input
        className="newsletter-input"
        type="email"
        name="email"
        placeholder="Tu correo electrónico"
        required
        maxLength={254}
      />
      <input ref={loadedAtRef} type="hidden" name="_form_loaded_at" className="js-form-loaded-at" defaultValue="" />
      {/* Turnstile invisible: contenedor oculto */}
      <div id="ts-newsletter-0" aria-hidden="true" style={{ display: 'none' }} />
      <button className="newsletter-btn" type="submit" disabled={submitting}>
        {submitting ? 'Enviando...' : 'Suscribirme'}
      </button>
    </form>
  );
}
