import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_ALL, CONSENT_CHANGE_EVENT, serializeConsent } from '@/lib/consent';
import { runWhenAnalyticsReady, type ReadyWindow } from '@/lib/when-analytics-ready';

const CONSENTED = `gi_consent=${serializeConsent(CONSENT_ALL, 1_731_200_000_000)}`;

function fakeWindow(cookie: string, withDataLayer: boolean) {
  const listeners = new Map<string, Set<() => void>>();
  const win = {
    document: { cookie },
    dataLayer: withDataLayer ? ([] as unknown[]) : undefined,
    addEventListener: (type: string, fn: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: () => void) => listeners.get(type)?.delete(fn),
  } as unknown as ReadyWindow & { dataLayer?: unknown[] };
  return { win, listeners, emit: (type: string) => listeners.get(type)?.forEach((fn) => fn()) };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('runWhenAnalyticsReady', () => {
  it('dispara de inmediato y una sola vez si ya hay consentimiento y dataLayer', () => {
    const { win, listeners } = fakeWindow(CONSENTED, true);
    const fire = vi.fn();
    runWhenAnalyticsReady(fire, win);
    expect(fire).toHaveBeenCalledTimes(1);
    expect(listeners.get(CONSENT_CHANGE_EVENT)?.size ?? 0).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('visitante recurrente: espera a que GTM cree el dataLayer y dispara una sola vez', () => {
    const { win } = fakeWindow(CONSENTED, false);
    const fire = vi.fn();
    runWhenAnalyticsReady(fire, win);
    expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(fire).not.toHaveBeenCalled();
    win.dataLayer = [];
    vi.advanceTimersByTime(100);
    expect(fire).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(fire).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('sin consentimiento no reintenta (solo escucha el cambio) y dispara al aceptar', () => {
    const { win, emit } = fakeWindow('', true);
    const fire = vi.fn();
    runWhenAnalyticsReady(fire, win);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(fire).not.toHaveBeenCalled();
    win.document.cookie = CONSENTED;
    emit(CONSENT_CHANGE_EVENT);
    expect(fire).toHaveBeenCalledTimes(1);
    emit(CONSENT_CHANGE_EVENT);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('rechazo explícito: nunca dispara ni reintenta', () => {
    const { win, emit } = fakeWindow(`gi_consent=${serializeConsent({ analytics: false, marketing: false }, 1_731_200_000_000)}`, true);
    const fire = vi.fn();
    runWhenAnalyticsReady(fire, win);
    emit(CONSENT_CHANGE_EVENT);
    vi.advanceTimersByTime(10_000);
    expect(fire).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('host sin GTM (nunca hay dataLayer): deja de reintentar a los 5 s y no dispara', () => {
    const { win } = fakeWindow(CONSENTED, false);
    const fire = vi.fn();
    runWhenAnalyticsReady(fire, win);
    vi.advanceTimersByTime(5_000);
    expect(vi.getTimerCount()).toBe(0);
    win.dataLayer = [];
    vi.advanceTimersByTime(5_000);
    expect(fire).not.toHaveBeenCalled();
  });

  it('la limpieza (desmontar / cambiar de página) corta intervalo y listener sin disparar', () => {
    const { win, listeners, emit } = fakeWindow(CONSENTED, false);
    const fire = vi.fn();
    const cleanup = runWhenAnalyticsReady(fire, win);
    expect(vi.getTimerCount()).toBe(1);
    expect(listeners.get(CONSENT_CHANGE_EVENT)?.size).toBe(1);
    cleanup();
    expect(vi.getTimerCount()).toBe(0);
    expect(listeners.get(CONSENT_CHANGE_EVENT)?.size).toBe(0);
    win.dataLayer = [];
    emit(CONSENT_CHANGE_EVENT);
    vi.advanceTimersByTime(10_000);
    expect(fire).not.toHaveBeenCalled();
  });

  it('sin window (SSR) no hace nada', () => {
    const fire = vi.fn();
    expect(() => runWhenAnalyticsReady(fire, null)()).not.toThrow();
    expect(fire).not.toHaveBeenCalled();
  });
});
