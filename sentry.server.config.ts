import * as Sentry from '@sentry/nextjs';

// Sentry — runtime Node (Server Actions, Route Handlers, webhook).
// Se activa solo si SENTRY_DSN está configurada (build/dev sin DSN = no-op).
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: !!process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  // Sin datos personales por defecto (privacidad — informe §5.6).
  sendDefaultPii: false,
});
