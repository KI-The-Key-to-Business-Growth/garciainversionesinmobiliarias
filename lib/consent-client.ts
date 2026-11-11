import {
  CONSENT_CHANGE_EVENT,
  buildConsentCookie,
  buildExpiredCookie,
  cookieDomainVariants,
  hasAnyConsent,
  listMeasurementCookies,
  readConsentFromCookieString,
  toConsentModeSignals,
  type ConsentChoice,
  type StoredConsent,
} from '@/lib/consent';
import { clearAttribution, pruneAttribution } from '@/lib/attribution';

// ── Lado navegador del consentimiento ────────────────────────────────────────
// Recibe `win` por parámetro (por defecto `window`) para poder probarse en Node.

export type ConsentWindow = {
  document: { cookie: string };
  location: { hostname: string; protocol: string; reload: () => void };
  localStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  sessionStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  dataLayer?: unknown[];
  __giLoadGtm?: () => void;
  __giGtmLoaded?: boolean;
  __giFbqBlocked?: boolean;
  dispatchEvent?: (event: Event) => boolean;
  CustomEvent?: typeof CustomEvent;
};

function browserWindow(): ConsentWindow {
  return window as unknown as ConsentWindow;
}

export function getStoredConsent(win: ConsentWindow = browserWindow()): StoredConsent | null {
  try {
    return readConsentFromCookieString(win.document.cookie);
  } catch {
    return null;
  }
}

// `gtag()` real: Google exige un objeto `arguments`, no un array.
function gtagPush(win: ConsentWindow, command: string, action: string, payload: unknown): void {
  const layer = win.dataLayer;
  if (!Array.isArray(layer)) return;
  (function gtag(..._args: unknown[]) {
    void _args;
    layer.push(arguments);
  })(command, action, payload);
}

export function clearMeasurementCookies(win: ConsentWindow = browserWindow()): void {
  let names: string[] = [];
  try {
    names = listMeasurementCookies(win.document.cookie);
  } catch {
    return;
  }
  const domains = cookieDomainVariants(win.location.hostname);
  for (const name of names) {
    for (const domain of domains) {
      try {
        win.document.cookie = buildExpiredCookie(name, domain);
      } catch {
        /* cookie bloqueada: nada que borrar */
      }
    }
  }
}

export type ApplyConsentResult = { reloaded: boolean; previous: StoredConsent | null };

// Guarda la elección, actualiza Consent Mode, carga GTM si corresponde y, si se RETIRÓ un permiso
// que ya estaba activo, borra cookies/atribución y recarga (los scripts de terceros ya cargados no
// se pueden descargar: la recarga garantiza que no sigan corriendo).
export function applyConsent(choice: ConsentChoice, win: ConsentWindow = browserWindow()): ApplyConsentResult {
  const previous = getStoredConsent(win);
  const secure = win.location.protocol === 'https:';
  win.document.cookie = buildConsentCookie(choice, Date.now(), secure);

  gtagPush(win, 'consent', 'update', toConsentModeSignals(choice));
  if (Array.isArray(win.dataLayer)) {
    win.dataLayer.push({
      event: 'consent_update',
      consent_analytics: choice.analytics ? 'granted' : 'denied',
      consent_marketing: choice.marketing ? 'granted' : 'denied',
    });
  }

  const withdrew =
    Boolean(previous) &&
    ((previous!.analytics && !choice.analytics) || (previous!.marketing && !choice.marketing));

  // Sin elección válida previa (primera vez, o cookie de una versión anterior que ya no cuenta): si no
  // se concede todo, se limpian las cookies de medición que hubieran quedado de antes.
  if (!previous && !(choice.analytics && choice.marketing)) clearMeasurementCookies(win);

  if (withdrew) {
    clearMeasurementCookies(win);
    if (!hasAnyConsent(choice)) clearAttribution(win);
    else pruneAttribution(choice, win);
  } else if (!hasAnyConsent(choice)) {
    clearAttribution(win);
  } else {
    pruneAttribution(choice, win);
  }

  if (hasAnyConsent(choice) && !withdrew) win.__giLoadGtm?.();

  try {
    if (win.dispatchEvent && win.CustomEvent) {
      win.dispatchEvent(new win.CustomEvent(CONSENT_CHANGE_EVENT, { detail: choice }));
    }
  } catch {
    /* sin DOM de eventos (tests) */
  }

  // El Pixel de Meta quedó bloqueado (sin consentimiento de publicidad) en esta carga de página:
  // para activarlo hay que recargar, así GTM y el Pixel arrancan con el consentimiento nuevo.
  if (choice.marketing && win.__giFbqBlocked) {
    win.location.reload();
    return { reloaded: true, previous };
  }

  if (withdrew && win.__giGtmLoaded) {
    win.location.reload();
    return { reloaded: true, previous };
  }
  return { reloaded: false, previous };
}
