import * as Sentry from '@sentry/nextjs';

// Carga la config de Sentry según el runtime (Node / Edge).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Captura errores no manejados en Server Components, Route Handlers y Server Actions.
export const onRequestError = Sentry.captureRequestError;
