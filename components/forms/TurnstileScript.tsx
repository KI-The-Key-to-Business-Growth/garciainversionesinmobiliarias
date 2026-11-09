'use client';

import Script from 'next/script';

// Carga el motor de Cloudflare Turnstile SOLO donde se incluya. Hoy hay formularios con Turnstile
// en la Home (newsletter, app/page.tsx) y en /contacto (app/contacto/page.tsx): TODA página que
// renderice un formulario con useTurnstile debe incluir este componente, o el token llega vacío.
// Reemplaza la carga global que estaba en app/layout.tsx para no bajar este JS de terceros en
// páginas sin formulario.
//
// Emite la misma señal de readiness que espera useTurnstile.ts:
//   window._tsReady = true  +  evento 'ts:ready'
// (antes lo hacía el inline window.onTurnstileReady vía el param &onload=).
export default function TurnstileScript() {
  return (
    <Script
      id="cf-turnstile-api"
      src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      strategy="afterInteractive"
      onLoad={() => {
        window._tsReady = true;
        document.dispatchEvent(new Event('ts:ready'));
      }}
    />
  );
}
