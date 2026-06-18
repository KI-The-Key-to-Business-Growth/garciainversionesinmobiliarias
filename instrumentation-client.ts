import * as Sentry from '@sentry/nextjs';

// Sentry — navegador. Clave pública NEXT_PUBLIC_SENTRY_DSN (se activa solo si está).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
