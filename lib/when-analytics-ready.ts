import { analyticsAllowed, type AnalyticsWindow } from '@/lib/analytics';
import { CONSENT_CHANGE_EVENT, hasAnyConsent, readConsentFromCookieString } from '@/lib/consent';

// Ejecuta `fire` UNA sola vez cuando se puede emitir un evento de medición:
//  - ya hay consentimiento y existe `window.dataLayer` → inmediato;
//  - el visitante acepta después de cargar la página → al evento de cambio de consentimiento;
//  - visitante recurrente (consentimiento guardado) pero el script de GTM todavía no creó el
//    `dataLayer` (se inyecta `afterInteractive`, después de hidratar): reintento corto hasta que exista.
// Sin consentimiento NO hay reintentos. En hosts sin GTM (localhost/preview) el reintento termina solo
// al cumplirse `maxMs`. Devuelve la función de limpieza (listener + intervalo).

export type ReadyWindow = AnalyticsWindow & {
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

export const READY_POLL_INTERVAL_MS = 100;
export const READY_POLL_MAX_MS = 5000;

export function runWhenAnalyticsReady(
  fire: () => void,
  win: ReadyWindow | null = typeof window === 'undefined' ? null : (window as unknown as ReadyWindow),
  options: { intervalMs?: number; maxMs?: number } = {},
): () => void {
  if (!win) return () => {};
  const intervalMs = options.intervalMs ?? READY_POLL_INTERVAL_MS;
  const maxMs = options.maxMs ?? READY_POLL_MAX_MS;

  let done = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const stopPolling = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
  const cleanup = () => {
    stopPolling();
    win.removeEventListener(CONSENT_CHANGE_EVENT, onConsentChange);
  };
  const tryFire = (): boolean => {
    if (done) return true;
    if (!analyticsAllowed(win)) return false;
    done = true;
    cleanup();
    fire();
    return true;
  };
  function onConsentChange() {
    if (tryFire()) return;
    startPollingIfConsented();
  }
  function startPollingIfConsented() {
    if (done || timer !== null) return;
    let consented = false;
    try {
      consented = hasAnyConsent(readConsentFromCookieString(win!.document.cookie));
    } catch {
      consented = false;
    }
    if (!consented) return;
    let elapsed = 0;
    timer = setInterval(() => {
      elapsed += intervalMs;
      if (tryFire()) return;
      if (elapsed >= maxMs) stopPolling();
    }, intervalMs);
  }

  if (tryFire()) return cleanup;
  win.addEventListener(CONSENT_CHANGE_EVENT, onConsentChange);
  startPollingIfConsented();
  return cleanup;
}
