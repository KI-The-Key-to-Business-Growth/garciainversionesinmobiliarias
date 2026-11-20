import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 16 escribe solo un bloque de instrucciones en AGENTS.md cada vez que corre `next dev`; acá el
  // AGENTS.md se mantiene a mano (fuente única del punto de entrada), así que se desactiva.
  agentRules: false,
  poweredByHeader: false, // paridad con app.disable('x-powered-by') del server.js legacy
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: 'storage.googleapis.com' }],
  },
  // Los assets editoriales de desarrollos (public/developments/**) se activan solo si el archivo
  // existe (lib/development-assets.ts) — incluirlos en la función server para que esa verificación
  // también funcione en Vercel.
  outputFileTracingIncludes: {
    '/desarrollos': ['./public/developments/**/*'],
    '/desarrollos/[id]': ['./public/developments/**/*'],
    // /share-image lee los renders locales para armar la vista previa liviana.
    '/share-image': ['./public/developments/**/*', './public/assets/**/*'],
  },
  // Redirecciones 301 .html → URL limpia (paridad con server.js:172-176 y vercel.json)
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/propiedades.html', destination: '/comprar', permanent: true },
      { source: '/propiedad.html', destination: '/propiedad', permanent: true },
      { source: '/gracias-consulta.html', destination: '/gracias-consulta', permanent: true },
      { source: '/privacidad.html', destination: '/privacidad', permanent: true },
    ];
  },
};

// withSentryConfig: instrumenta el build. La subida de source maps se hace solo
// si hay SENTRY_AUTH_TOKEN (en local/sin token no falla, solo no sube mapas).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
