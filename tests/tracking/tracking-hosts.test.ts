import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { GTM_ID, buildGtmBootstrap, shouldRenderGtmNoscript } from '@/lib/gtm';
import { TRACKING_HOSTS, isTrackingHost, normalizeHost } from '@/lib/tracking-hosts';

// Ejecuta el snippet REAL de arranque de GTM en un "navegador" simulado (sin DOM) y devuelve lo que
// hizo: el <script> que insertó (si lo hizo) y el estado del dataLayer.
function runBootstrap(hostname: string | undefined, script = buildGtmBootstrap()) {
  const inserted: Array<{ src?: string; async?: boolean }> = [];
  const anchor = {
    parentNode: { insertBefore: (node: { src?: string; async?: boolean }) => inserted.push(node) },
  };
  const window: Record<string, unknown> = hostname === undefined ? {} : { location: { hostname } };
  const document = {
    getElementsByTagName: () => [anchor],
    createElement: () => ({}) as { src?: string; async?: boolean },
  };
  vm.runInNewContext(script, { window, document });
  return { inserted, dataLayer: window.dataLayer as Array<Record<string, unknown>> | undefined };
}

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

describe('lib/gtm — snippet de arranque con guarda de hostname (ejecutado de verdad)', () => {
  it('en los hosts de producción inserta gtm.js con el contenedor de García y crea el dataLayer', () => {
    for (const host of ['www.garciainversionesinmobiliarias.com.ar', 'garciainversionesinmobiliarias.com.ar']) {
      const { inserted, dataLayer } = runBootstrap(host);
      expect(inserted, host).toHaveLength(1);
      expect(inserted[0].src).toBe(`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`);
      expect(inserted[0].async).toBe(true);
      expect(dataLayer?.[0]).toMatchObject({ event: 'gtm.js' });
    }
  });

  it('tolera mayúsculas y punto final en el hostname', () => {
    expect(runBootstrap('WWW.GarciaInversionesInmobiliarias.com.ar.').inserted).toHaveLength(1);
  });

  it('localhost NO carga GTM ni crea el dataLayer (el Pixel y GA4 viven dentro de GTM)', () => {
    const { inserted, dataLayer } = runBootstrap('localhost');
    expect(inserted).toHaveLength(0);
    expect(dataLayer).toBeUndefined();
  });

  it('previews de Vercel, IPs locales y lookalikes NO cargan GTM', () => {
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
      const { inserted, dataLayer } = runBootstrap(host);
      expect(inserted, host).toHaveLength(0);
      expect(dataLayer, host).toBeUndefined();
    }
  });

  it('sin location (entorno inesperado) falla cerrado: no carga GTM y no lanza', () => {
    const { inserted, dataLayer } = runBootstrap(undefined);
    expect(inserted).toHaveLength(0);
    expect(dataLayer).toBeUndefined();
  });

  it('la lista de hosts y el contenedor son parametrizables y se serializan sin romper el script', () => {
    const script = buildGtmBootstrap('GTM-TEST123', ['staging.ejemplo.com']);
    expect(runBootstrap('staging.ejemplo.com', script).inserted[0]?.src).toContain('id=GTM-TEST123');
    expect(runBootstrap('www.garciainversionesinmobiliarias.com.ar', script).inserted).toHaveLength(0);
    // El snippet se inyecta como texto: no debe contener cierres de etiqueta <script>.
    expect(script.toLowerCase()).not.toContain('</script');
  });

  it('el contenedor sigue siendo GTM-MBNKBBSW (sin cambios)', () => {
    expect(GTM_ID).toBe('GTM-MBNKBBSW');
  });
});

describe('<noscript> de GTM — solo en builds de producción de Vercel', () => {
  it('se renderiza únicamente con VERCEL_ENV=production', () => {
    expect(shouldRenderGtmNoscript({ VERCEL_ENV: 'production' })).toBe(true);
    expect(shouldRenderGtmNoscript({ VERCEL_ENV: 'preview' })).toBe(false);
    expect(shouldRenderGtmNoscript({ VERCEL_ENV: 'development' })).toBe(false);
    expect(shouldRenderGtmNoscript({ NODE_ENV: 'production' })).toBe(false);
    expect(shouldRenderGtmNoscript({})).toBe(false);
  });
});

describe('app/layout.tsx — usa la guarda y no conserva el snippet sin proteger', () => {
  const layout = readFileSync('app/layout.tsx', 'utf8');

  it('importa el bootstrap y el noscript condicional de lib/gtm', () => {
    expect(layout).toContain("from '@/lib/gtm'");
    expect(layout).toContain('buildGtmBootstrap()');
    expect(layout).toContain('shouldRenderGtmNoscript()');
  });

  it('no queda ningún gtm.js ni ID de contenedor hardcodeado en el layout', () => {
    expect(layout).not.toContain('gtm.js?id=');
    expect(layout).not.toContain('GTM-MBNKBBSW');
  });
});
