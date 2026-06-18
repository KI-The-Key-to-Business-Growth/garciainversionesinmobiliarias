/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // paridad con app.disable('x-powered-by') del server.js legacy
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Redirecciones 301 .html → URL limpia (paridad con server.js:172-176 y vercel.json)
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/propiedades.html', destination: '/propiedades', permanent: true },
      { source: '/propiedad.html', destination: '/propiedad', permanent: true },
      { source: '/gracias-consulta.html', destination: '/gracias-consulta', permanent: true },
      { source: '/privacidad.html', destination: '/privacidad', permanent: true },
    ];
  },
};

export default nextConfig;
