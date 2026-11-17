import { NextResponse, type NextRequest } from 'next/server';
import { securityHeaders } from '@/lib/security/csp';

// ── Middleware: seguridad site-wide + CORS para /api ─────────────────────────
// Aplica los headers de seguridad a TODO el tráfico (páginas + estáticos + API),
// cerrando el gap del informe §5.7. Las redirecciones .html→limpia están en
// next.config.mjs (redirects). El rate limiting vive en las Server Actions y el
// Route Handler del webhook (runtime Node, donde el Map en memoria persiste).

const HEADERS = securityHeaders();

function allowedOrigins(): string[] {
  const base = (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  // Auditoría 2026-11-17: antes siempre se anteponía "www." (si la base ya lo traía, quedaba
  // "https://www.www..."). Ahora se permiten ambas variantes: con y sin www.
  const withWww = base.replace(/^https:\/\/(?!www\.)/, 'https://www.');
  const withoutWww = base.replace(/^https:\/\/www\./, 'https://');
  return [
    base,
    withWww,
    withoutWww,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    // Orígenes locales solo fuera de producción.
    ...(process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000', 'http://localhost:3001']),
  ].filter(Boolean) as string[];
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── CORS para /api: sólo orígenes en lista blanca — server.js:154-170 ──────
  if (pathname.startsWith('/api')) {
    const origin = req.headers.get('origin') || '';
    const allowed = allowedOrigins();

    // Sin Origin (server→server, curl, Postman) se permite; el webhook valida hash.
    if (origin && !allowed.includes(origin)) {
      return new NextResponse(JSON.stringify({ ok: false, message: 'Origen no permitido.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const res = NextResponse.next();
    for (const [k, v] of Object.entries(HEADERS)) res.headers.set(k, v);
    if (origin) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
      res.headers.set('Vary', 'Origin');
    }
    return res;
  }

  // ── Resto del sitio: headers de seguridad ─────────────────────────────────
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(HEADERS)) res.headers.set(k, v);
  return res;
}

// Excluir assets internos de Next.js (sus propias respuestas ya son seguras) salvo
// que querramos headers también ahí. Aplicamos a todo menos _next/static y favicon.
export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
