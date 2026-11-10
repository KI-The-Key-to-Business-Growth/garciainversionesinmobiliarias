import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { GTM_ID, buildGtmBootstrap } from '@/lib/gtm';
import { serializeConsent } from '@/lib/consent';
import { TRACKING_HOSTS, isTrackingHost, normalizeHost } from '@/lib/tracking-hosts';

// Ejecuta el snippet REAL de arranque de GTM en un "navegador" simulado (sin DOM) y devuelve lo que
// hizo: el <script> que insertó (si lo hizo), el dataLayer y la función de carga diferida.
// `cookie` simula document.cookie (por defecto: sin elección de consentimiento).
function runBootstrap(hostname: string | undefined, script = buildGtmBootstrap(), cookie = '') {
  const inserted: Array<{ src?: string; async?: boolean }> = [];
  const anchor = {
    parentNode: { insertBefore: (node: { src?: string; async?: boolean }) => inserted.push(node) },
  };
  const window: Record<string, unknown> = hostname === undefined ? {} : { location: { hostname } };
  const document = {
    cookie,
    getElementsByTagName: () => [anchor],
    createElement: () => ({}) as { src?: string; async?: boolean },
  };
  vm.runInNewContext(script, { window, document, URLSearchParams, decodeURIComponent });
  const dataLayer = window.dataLayer as unknown[] | undefined;
  return {
    inserted,
    dataLayer,
    // gtag() empuja objetos `arguments`; se normalizan a arrays para poder comparar.
    commands: (dataLayer ?? []).map((e) => {
      const obj = e as { event?: string; length?: number };
      return obj && typeof obj === 'object' && !('event' in obj) && typeof obj.length === 'number'
        ? Array.from(e as ArrayLike<unknown>)
        : e;
    }),
    load: window.__giLoadGtm as (() => void) | undefined,
  };
}

const ACCEPT_ALL = `gi_consent=${serializeConsent({ analytics: true, marketing: true })}`;
const REJECT_ALL = `gi_consent=${serializeConsent({ analytics: false, marketing: false })}`;
const ANALYTICS_ONLY = `gi_consent=${serializeConsent({ analytics: true, marketing: false })}`;
const PROD = 'www.garciainversionesinmobiliarias.com.ar';

describe('lib/tracking-hosts — hosts de producción de García', () => {
  it('declara exactamente los dos hosts de producción, sin comodines', () => {
    expect([...TRACKING_HOSTS]).toEqual([
      'www.garciainversionesinmobiliarias.com.ar',
      'garciainversionesinmobiliarias.com.ar',
    ]);
    for (const host of TRACKING_HOSTS) expect(host).not.toMatch(/[*\s/]/);
  });

  it('acepta los hosts de producción (con mayúsculas o punto final de FQDN)', () => {
    expect(isTrackingHost('www.garciainversionesinmobiliarias.com.ar')).toBe(true);
    expect(isTrackingHost('garciainversionesinmobiliarias.com.ar')).toBe(true);
    expect(isTrackingHost('WWW.GarciaInversionesInmobiliarias.com.ar')).toBe(true);
    expect(isTrackingHost('www.garciainversionesinmobiliarias.com.ar.')).toBe(true);
    expect(normalizeHost('  Garcia.COM.ar. ')).toBe('garcia.com.ar');
  });

  it('rechaza localhost, IPs, previews de Vercel, lookalikes y valores vacíos', () => {
    const blocked = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '192.168.0.15',
      '[::1]',
      'garciainversionesinmobiliarias-weareki-projects.vercel.app',
      'garciainversionesinmobiliarias-git-main-weareki-projects.vercel.app',
      'garciainversionesinmobiliarias-jjnjo7pre-weareki-projects.vercel.app',
      'algo.vercel.app',
      'www.garciainversionesinmobiliarias.com.ar.evil.com',
      'evilgarciainversionesinmobiliarias.com.ar',
      'staging.garciainversionesinmobiliarias.com.ar',
      'garciainversionesinmobiliarias.com',
      '',
      '   ',
      '.',
    ];
    for (const host of blocked) expect(isTrackingHost(host), host).toBe(false);
    expect(isTrackingHost(undefined)).toBe(false);
    expect(isTrackingHost(null)).toBe(false);
  });
});

describe('lib/gtm — Consent Mode v2: denied por defecto y GTM solo con consentimiento', () => {
  it('sin elección: define consent default DENEGADO antes de todo y NO inserta gtm.js', () => {
    const { inserted, commands, load } = runBootstrap(PROD);
    expect(inserted).toHaveLength(0);
    expect(commands[0]).toEqual([
      'consent',
      'default',
      expect.objectContaining({
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
      }),
    ]);
    expect(typeof load).toBe('function');
  });

  it('con rechazo guardado: todo denied y GTM NO carga (el rechazo se respeta en cada visita)', () => {
    const { inserted, commands } = runBootstrap(PROD, buildGtmBootstrap(), REJECT_ALL);
    expect(inserted).toHaveLength(0);
    expect(commands[1]).toEqual([
      'consent',
      'update',
      expect.objectContaining({
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      }),
    ]);
  });

  it('con aceptación guardada: update granted y gtm.js con el contenedor de García, después del default', () => {
    const { inserted, commands } = runBootstrap(PROD, buildGtmBootstrap(), ACCEPT_ALL);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].src).toBe(`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`);
    expect(inserted[0].async).toBe(true);
    expect(commands[0]).toEqual(['consent', 'default', expect.any(Object)]);
    expect(commands[1]).toEqual([
      'consent',
      'update',
      expect.objectContaining({
        analytics_storage: 'granted',
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      }),
    ]);
    expect(commands.findIndex((c) => (c as { event?: string }).event === 'gtm.js')).toBeGreaterThan(1);
  });

  it('solo analítica: analytics granted y publicidad denied', () => {
    const { inserted, commands } = runBootstrap(PROD, buildGtmBootstrap(), ANALYTICS_ONLY);
    expect(inserted).toHaveLength(1);
    expect(commands[1]).toEqual([
      'consent',
      'update',
      expect.objectContaining({
        analytics_storage: 'granted',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      }),
    ]);
  });

  it('aceptar en el banner (después) carga GTM una sola vez', () => {
    const { inserted, load } = runBootstrap(PROD);
    expect(inserted).toHaveLength(0);
    load!();
    load!();
    expect(inserted).toHaveLength(1);
  });

  it('cookie de consentimiento corrupta o de otra versión = sin elección', () => {
    for (const cookie of ['gi_consent=basura', 'gi_consent=v%3D9%26a%3D1%26m%3D1%26t%3D1', 'gi_consent=v%3D1%26a%3D1']) {
      expect(runBootstrap(PROD, buildGtmBootstrap(), cookie).inserted, cookie).toHaveLength(0);
    }
  });

  it('tolera mayúsculas y punto final en el hostname', () => {
    expect(
      runBootstrap('WWW.GarciaInversionesInmobiliarias.com.ar.', buildGtmBootstrap(), ACCEPT_ALL).inserted,
    ).toHaveLength(1);
  });

  it('localhost NO carga GTM ni crea el dataLayer, aunque haya consentimiento', () => {
    const { inserted, dataLayer } = runBootstrap('localhost', buildGtmBootstrap(), ACCEPT_ALL);
    expect(inserted).toHaveLength(0);
    expect(dataLayer).toBeUndefined();
  });

  it('previews de Vercel, IPs locales y lookalikes NO cargan GTM aunque haya consentimiento', () => {
    const blocked = [
      '127.0.0.1',
      '192.168.1.20',
      'garciainversionesinmobiliarias-git-main-weareki-projects.vercel.app',
      'garciainversionesinmobiliarias-4xwgzrti4-weareki-projects.vercel.app',
      'www.garciainversionesinmobiliarias.com.ar.evil.com',
      'evilgarciainversionesinmobiliarias.com.ar',
      '',
    ];
    for (const host of blocked) {
      const { inserted, dataLayer } = runBootstrap(host, buildGtmBootstrap(), ACCEPT_ALL);
      expect(inserted, host).toHaveLength(0);
      expect(dataLayer, host).toBeUndefined();
    }
  });

  it('sin location (entorno inesperado) falla cerrado: no carga GTM y no lanza', () => {
    const { inserted, dataLayer } = runBootstrap(undefined, buildGtmBootstrap(), ACCEPT_ALL);
    expect(inserted).toHaveLength(0);
    expect(dataLayer).toBeUndefined();
  });

  it('la lista de hosts y el contenedor son parametrizables y se serializan sin romper el script', () => {
    const script = buildGtmBootstrap('GTM-TEST123', ['staging.ejemplo.com']);
    expect(runBootstrap('staging.ejemplo.com', script, ACCEPT_ALL).inserted[0]?.src).toContain('id=GTM-TEST123');
    expect(runBootstrap(PROD, script, ACCEPT_ALL).inserted).toHaveLength(0);
    // El snippet se inyecta como texto: no debe contener cierres de etiqueta <script>.
    expect(script.toLowerCase()).not.toContain('</script');
  });

  it('el contenedor sigue siendo GTM-MBNKBBSW (sin cambios)', () => {
    expect(GTM_ID).toBe('GTM-MBNKBBSW');
  });
});

describe('app/layout.tsx — usa el bootstrap con consentimiento y no deja GTM sin proteger', () => {
  const layout = readFileSync('app/layout.tsx', 'utf8');

  it('importa el bootstrap y monta el gestor de consentimiento', () => {
    expect(layout).toContain("from '@/lib/gtm'");
    expect(layout).toContain('buildGtmBootstrap()');
    expect(layout).toContain('<ConsentManager />');
  });

  it('no queda ningún gtm.js, iframe noscript ni ID de contenedor hardcodeado en el layout', () => {
    expect(layout).not.toContain('gtm.js?id=');
    expect(layout).not.toContain('ns.html');
    expect(layout).not.toContain('<noscript');
    expect(layout).not.toContain('GTM-MBNKBBSW');
  });
});
