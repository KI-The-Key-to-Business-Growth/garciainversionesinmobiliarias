'use client';

import { useCallback, useEffect, useRef } from 'react';

// Turnstile invisible — porta el motor de legacy/public/assets/js/site.js
// (render explícito, execution:'execute', appearance:'interaction-only').
// Sin NEXT_PUBLIC_TURNSTILE_SITE_KEY el widget no se renderiza y getToken devuelve '' (en ese caso
// `required` es false y el formulario puede enviarse: el server también saltea si no hay secret).
// Con site key configurada, `required` es true: si getToken devuelve '' el formulario NO debe
// enviarse (el server rechaza tokens vacíos cuando hay secret key).

// Site key de Turnstile vía env var pública (configurada en Vercel). Sin ella, el
// widget no se renderiza y getToken devuelve '' (el server valida server-side).
const SITEKEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
// Si el desafío no responde (script bloqueado, desafío invisible que pide interacción), no se
// deja el formulario colgado: se resuelve '' y el formulario muestra un error claro.
const TOKEN_TIMEOUT_MS = 12_000;

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    _tsReady?: boolean;
  }
}

export function useTurnstile(containerId: string) {
  const widgetId = useRef<string | null>(null);
  const pendingResolve = useRef<((token: string) => void) | null>(null);

  useEffect(() => {
    if (!SITEKEY) return;

    const init = () => {
      const container = document.getElementById(containerId);
      if (!container || !window.turnstile || widgetId.current !== null) return;
      widgetId.current = window.turnstile.render(container, {
        sitekey: SITEKEY,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (token: string) => {
          pendingResolve.current?.(token);
          pendingResolve.current = null;
        },
        'error-callback': () => {
          console.warn('[Turnstile] Error en verificación del desafío');
          pendingResolve.current?.('');
          pendingResolve.current = null;
        },
        'expired-callback': () => {
          pendingResolve.current?.('');
          pendingResolve.current = null;
          if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
        },
      });
    };

    if (window._tsReady || window.turnstile) init();
    else document.addEventListener('ts:ready', init, { once: true });

    return () => {
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* noop */
        }
        widgetId.current = null;
      }
    };
  }, [containerId]);

  const getToken = useCallback(
    () =>
      new Promise<string>((resolve) => {
        if (!SITEKEY || !window.turnstile || widgetId.current === null) {
          resolve('');
          return;
        }
        const settle = (token: string) => {
          clearTimeout(timer);
          resolve(token);
        };
        const timer = setTimeout(() => {
          if (pendingResolve.current === settle) pendingResolve.current = null;
          resolve('');
        }, TOKEN_TIMEOUT_MS);
        pendingResolve.current = settle;
        window.turnstile.execute(widgetId.current);
      }),
    [],
  );

  const reset = useCallback(() => {
    if (window.turnstile && widgetId.current !== null) window.turnstile.reset(widgetId.current);
  }, []);

  return { getToken, reset, required: Boolean(SITEKEY) };
}
