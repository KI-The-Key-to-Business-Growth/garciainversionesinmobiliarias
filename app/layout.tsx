import type { Metadata } from 'next';
import Script from 'next/script';
import localFont from 'next/font/local';
import './globals.css';
import { CANONICAL_BASE_URL } from '@/lib/env';
import { INSTITUTIONAL_OPEN_GRAPH, INSTITUTIONAL_TWITTER } from '@/lib/share-metadata';
import WhatsAppTracking from '@/components/tracking/WhatsAppTracking';
import ConsentManager from '@/components/consent/ConsentManager';
import AttributionCapture from '@/components/tracking/AttributionCapture';
import { buildGtmBootstrap } from '@/lib/gtm';

// Fuentes self-hosted vía next/font/local (sin request a Google en el build ni en runtime).
// Jost y Cormorant Garamond: mismas fuentes variables (subconjunto latin, licencia SIL OFL 1.1) que se
// servían con next/font/google; los archivos y sus licencias están en app/fonts/. Con next/font/google
// el build consulta a Google y a veces falla (loader.js: `exec(url)[1]` sobre una URL sin extensión).
// Pesos 300–600 y, en Cormorant, normal + cursiva: los mismos que usa el sitio. Los únicos caracteres
// del sitio fuera de latin son símbolos (→ ☰ ✓ ▾ ↗) que estas familias nunca cubrieron.
const jost = localFont({
  src: [{ path: './fonts/Jost-latin-variable.woff2', style: 'normal', weight: '300 600' }],
  variable: '--font-jost',
  display: 'swap',
  adjustFontFallback: 'Arial',
});
const cormorant = localFont({
  src: [
    { path: './fonts/CormorantGaramond-latin-normal-variable.woff2', style: 'normal', weight: '300 600' },
    { path: './fonts/CormorantGaramond-latin-italic-variable.woff2', style: 'italic', weight: '300 600' },
  ],
  variable: '--font-cormorant',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});

export const metadata: Metadata = {
  metadataBase: new URL(CANONICAL_BASE_URL),
  title: 'García Inversiones Inmobiliarias | Real Estate Buenos Aires y Miami',
  description:
    'Consultora boutique de real estate en Buenos Aires y Miami. Propiedades seleccionadas, asesoramiento en compra, venta e inversión y acompañamiento personalizado.',
  alternates: { canonical: '/' },
  icons: {
    icon: '/assets/logos/isotipo.png',
    apple: '/assets/logos/isotipo.png',
  },
  // Open Graph/Twitter institucionales (lib/share-metadata.ts). Sin og:url acá: una página que no
  // declara la suya no debe presentarse como el Home. Las fichas usan `buildShareMetadata`.
  openGraph: INSTITUTIONAL_OPEN_GRAPH,
  twitter: INSTITUTIONAL_TWITTER,
  formatDetection: { telephone: false },
};

// Schema.org — Organization / LocalBusiness / RealEstateAgent + WebSite
const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['RealEstateAgent', 'LocalBusiness'],
      '@id': `${CANONICAL_BASE_URL}/#organization`,
      name: 'García Inversiones Inmobiliarias',
      url: CANONICAL_BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${CANONICAL_BASE_URL}/assets/logos/Garcia.svg`,
        width: 2048,
        height: 1152,
      },
      image: `${CANONICAL_BASE_URL}/assets/propiedades/condor-resort.jpeg`,
      description:
        'Asesoramiento estratégico en real estate. Propiedades seleccionadas y acompañamiento personalizado para quienes invierten con criterio.',
      telephone: '+54-9-11-6724-0353',
      email: 'contacto@garciainversiones.com.ar',
      address: { '@type': 'PostalAddress', addressLocality: 'Buenos Aires', addressCountry: 'AR' },
      sameAs: ['https://www.instagram.com/garciainversiones.re/'],
      areaServed: [
        { '@type': 'City', name: 'Buenos Aires, Argentina' },
        { '@type': 'City', name: 'Miami, Florida, Estados Unidos' },
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${CANONICAL_BASE_URL}/#website`,
      url: CANONICAL_BASE_URL,
      name: 'García Inversiones Inmobiliarias',
      description:
        'Consultora boutique de real estate en Buenos Aires y Miami, con propiedades seleccionadas y acompañamiento personalizado.',
      publisher: { '@id': `${CANONICAL_BASE_URL}/#organization` },
      inLanguage: 'es-AR',
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${jost.variable} ${cormorant.variable}`}>
      <body data-page-type="home">
        {/* JSON-LD (hoisted a <head> por React 19). Las fuentes ahora son self-hosted (next/font). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
        />

        <WhatsAppTracking />

        {children}

        <ConsentManager />
        <AttributionCapture />

        {/* Turnstile NO se carga acá: el script vive en <TurnstileScript /> y se
            incluye solo en las rutas con formulario (hoy, la home). */}

        {/* Google Tag Manager — Consent Mode v2 en "denied" por defecto y guarda de hostname en el
            propio snippet (lib/gtm.ts): solo carga en los hosts de producción de García
            (lib/tracking-hosts.ts) y únicamente después de que el visitante acepta (ConsentManager).
            Sin iframe noscript: sin JavaScript no hay forma de pedir consentimiento. */}
        <Script id="gtm" strategy="afterInteractive">
          {buildGtmBootstrap()}
        </Script>
      </body>
    </html>
  );
}
