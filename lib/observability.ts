import 'server-only';
import * as Sentry from '@sentry/nextjs';

// Wrapper de reporte de errores. Nunca debe lanzar: si Sentry falla o no está
// configurado, el flujo de negocio sigue normal. Contexto sin PII.
export function captureError(err: unknown, context?: Record<string, unknown>): void {
  try {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    /* noop — el reporte de errores jamás rompe el request */
  }
}
