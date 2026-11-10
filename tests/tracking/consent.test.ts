import { describe, expect, it } from 'vitest';
import {
  CONSENT_ALL,
  CONSENT_COOKIE,
  CONSENT_DENIED,
  buildConsentCookie,
  cookieDomainVariants,
  hasAnyConsent,
  listMeasurementCookies,
  parseConsent,
  readConsentFromCookieString,
  serializeConsent,
  toConsentModeSignals,
} from '@/lib/consent';

describe('lib/consent — serialización y lectura', () => {
  it('ida y vuelta de la elección', () => {
    for (const choice of [CONSENT_ALL, CONSENT_DENIED, { analytics: true, marketing: false }, { analytics: false, marketing: true }]) {
      const parsed = parseConsent(serializeConsent(choice, 1_731_200_000_000));
      expect(parsed).toMatchObject(choice);
      expect(parsed?.ts).toBe(1_731_200_000);
    }
  });

  it('valores corruptos, vacíos o de otra versión se tratan como SIN elección', () => {
    for (const raw of [null, undefined, '', 'basura', 'v=1&a=2&m=0&t=1', 'v=9&a=1&m=1&t=1', 'v=1&a=1&t=1', '%E0%A4%A']) {
      expect(parseConsent(raw as string)).toBeNull();
    }
  });

  it('lee la cookie entre otras y no confunde nombres parecidos', () => {
    const cookie = `_ga=GA1.1.1; x_${CONSENT_COOKIE}=v%3D1%26a%3D1%26m%3D1%26t%3D1; ${CONSENT_COOKIE}=${serializeConsent({ analytics: true, marketing: false })}`;
    expect(readConsentFromCookieString(cookie)).toMatchObject({ analytics: true, marketing: false });
    expect(readConsentFromCookieString('_ga=GA1.1.1')).toBeNull();
  });

  it('la cookie es de primera parte, Lax, 180 días y Secure solo en https', () => {
    const c = buildConsentCookie(CONSENT_ALL, 1000, true);
    expect(c).toContain('Max-Age=15552000');
    expect(c).toContain('SameSite=Lax');
    expect(c).toContain('Secure');
    expect(buildConsentCookie(CONSENT_ALL, 1000, false)).not.toContain('Secure');
  });
});

describe('lib/consent — Consent Mode v2', () => {
  it('rechazo total: todo denied', () => {
    expect(toConsentModeSignals(CONSENT_DENIED)).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
  });
  it('analytics no habilita publicidad y marketing no habilita analytics', () => {
    expect(toConsentModeSignals({ analytics: true, marketing: false })).toMatchObject({
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    expect(toConsentModeSignals({ analytics: false, marketing: true })).toMatchObject({
      analytics_storage: 'denied',
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
    });
  });
  it('hasAnyConsent', () => {
    expect(hasAnyConsent(CONSENT_DENIED)).toBe(false);
    expect(hasAnyConsent(null)).toBe(false);
    expect(hasAnyConsent({ analytics: true, marketing: false })).toBe(true);
  });
});

describe('lib/consent — limpieza al retirar', () => {
  it('lista solo cookies de medición/publicidad (no la de consentimiento ni otras)', () => {
    const cookie = `_ga=1; _ga_YD6FJKCK3M=2; _gid=3; _gcl_au=4; _gcl_aw=5; _fbp=6; _fbc=7; ${CONSENT_COOKIE}=x; sesion=9; foo_ga=1`;
    expect(listMeasurementCookies(cookie).sort()).toEqual(
      ['_ga', '_ga_YD6FJKCK3M', '_gid', '_gcl_au', '_gcl_aw', '_fbp', '_fbc'].sort(),
    );
  });
  it('variantes de dominio: host y dominios padre, sin TLD pelado', () => {
    const v = cookieDomainVariants('www.garciainversionesinmobiliarias.com.ar');
    expect(v).toContain('');
    expect(v).toContain('www.garciainversionesinmobiliarias.com.ar');
    expect(v).toContain('.garciainversionesinmobiliarias.com.ar');
    expect(v).not.toContain('.ar');
  });
});
