// Stub de @sentry/nextjs para vitest (evita cargar el SDK real fuera de Next).
export const captureException = () => {};
export const captureRequestError = () => {};
export const captureRouterTransitionStart = () => {};
export const init = () => {};
export const withSentryConfig = <T>(config: T): T => config;
