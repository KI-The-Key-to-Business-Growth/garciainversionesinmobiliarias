import { afterEach, describe, expect, it, vi } from 'vitest';

// `client.ts` lee `TWOCLICS_API_KEY` (vía lib/env.ts) al importar el módulo — hay que fijar el
// env ANTES de importar, con `vi.resetModules()` para forzar una re-evaluación fresca (mismo
// patrón que tests/2clics/config.test.ts).
async function loadClient() {
  vi.resetModules();
  process.env.TWOCLICS_API_KEY = 'test-key';
  return import('@/lib/2clics/client');
}

function jsonResponse(body: unknown): { ok: true; status: number; text: () => Promise<string> } {
  return { ok: true, status: 200, text: async () => JSON.stringify(body) };
}

afterEach(() => {
  vi.resetModules();
  delete process.env.TWOCLICS_API_KEY;
});

describe('isAmbiguousFailResponse', () => {
  it('detecta exactamente la forma real de 2Clics: status "fail" sin count/properties/description', async () => {
    const { isAmbiguousFailResponse } = await loadClient();

    expect(isAmbiguousFailResponse({ status: 'fail' })).toBe(true);
    // Cualquiera de estos tres campos presentes ya no es la forma ambigua — es un dato real
    // (0 legítimo con count, un array de properties, o un error real con description).
    expect(isAmbiguousFailResponse({ status: 'fail', count: 0 })).toBe(false);
    expect(isAmbiguousFailResponse({ status: 'fail', properties: [] })).toBe(false);
    expect(isAmbiguousFailResponse({ status: 'fail', description: 'Invalid filter' })).toBe(false);
    expect(isAmbiguousFailResponse({ status: 'success', count: 4, properties: [{}] })).toBe(false);
    expect(isAmbiguousFailResponse(null)).toBe(false);
    expect(isAmbiguousFailResponse(undefined)).toBe(false);
  });
});

// Bug real de producción (2026-08-26): el filtro "Oficina" (con inventario público real) devolvía
// 0 resultados en vivo durante varios minutos. Causa raíz: 2Clics responde HTTP 200 + status:"fail"
// (sin count/properties/description) tanto para "0 legítimo" como para un hipo transitorio del
// backend — misma forma exacta. El fetch cache de Next (force-cache + revalidate) no distingue las
// dos cosas y cachea el fail transitorio como si fuera la verdad hasta la próxima revalidación.
// Este test cubre la causa GENERAL (cualquier filtro/tipo, no solo Oficina) reproduciendo la forma
// exacta con un fetch mockeado, sin depender de datos reales de la API.
describe('TwoclicsClient.getProperties — reintenta un fail ambiguo antes de aceptarlo (fix general, no específico de Oficina)', () => {
  it('si el primer intento es un fail ambiguo y el segundo trae datos reales, devuelve los datos reales (mismo caso que Oficina en producción)', async () => {
    const { twoclicsClient } = await loadClient();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ status: 'fail' }))
      .mockResolvedValueOnce(
        jsonResponse({ status: 'success', count: 4, properties: [{ propertyId: 1 }] }),
      );
    global.fetch = fetchMock as never;

    const result = await twoclicsClient.getProperties('AR', {
      offset: 0,
      limit: 30,
      filters: { property_type: '5793' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ status: 'success', count: 4 });
  });

  it('agota los reintentos (máximo 3 intentos totales) y devuelve el fail tal cual si todos son ambiguos — nunca cuelga ni lanza para un tipo genuinamente sin resultados', async () => {
    const { twoclicsClient } = await loadClient();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'fail' }));
    global.fetch = fetchMock as never;

    const result = await twoclicsClient.getProperties('AR', {
      offset: 0,
      limit: 30,
      filters: { property_type: '5793' },
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ status: 'fail' });
  });

  it('un fail con count/properties/description (no ambiguo) NO se reintenta — se acepta en el primer intento', async () => {
    const { twoclicsClient } = await loadClient();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'fail', count: 0 }));
    global.fetch = fetchMock as never;

    const result = await twoclicsClient.getProperties('AR', { offset: 0, limit: 30 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: 'fail', count: 0 });
  });
});

// Seguridad crítica del fix: `retryAmbiguousFail` es opt-in por call site — `getProperties` (una
// lectura idempotente) lo activa, pero `sendLeadMessage` (una escritura real) NUNCA debe
// reintentar, porque reintentar un envío de lead podría duplicarlo del lado de 2Clics/CRM.
describe('TwoclicsClient.sendLeadMessage — nunca reintenta un fail ambiguo', () => {
  it('un fail ambiguo en el envío de un lead se devuelve tal cual, sin reintentar (evita duplicar el lead)', async () => {
    const { twoclicsClient } = await loadClient();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: 'fail' }));
    global.fetch = fetchMock as never;

    const result = await twoclicsClient.sendLeadMessage('AR', {
      property_app_id: 123,
      name: 'Ana',
      email: 'ana@example.com',
      phone: '+54 9 11 5555 5555',
      message: 'Quiero coordinar una visita.',
    } as never);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ status: 'fail' });
  });
});

// No regresión de las consultas de fichas: la opción `retries` de `sendLeadMessage` es opt-in. Sin
// ella el comportamiento es el histórico; el contacto general la usa con 0 para no duplicar negocios.
describe('TwoclicsClient.sendLeadMessage — opción retries (no regresión de fichas)', () => {
  const PROPERTY_LEAD = {
    property_app_id: 123,
    name: 'Ana',
    email: 'ana@example.com',
    phone: '+54 9 11 5555 5555',
    message: 'Quiero coordinar una visita.',
  };
  const serverError = { ok: false, status: 503, text: async () => '{"status":"fail"}' };

  it('sin opciones (fichas): conserva el comportamiento histórico y reintenta ante 5xx', async () => {
    const { twoclicsClient } = await loadClient();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(serverError)
      .mockResolvedValueOnce(jsonResponse({ status: 'success' }));
    global.fetch = fetchMock as never;

    const result = await twoclicsClient.sendLeadMessage('AR', PROPERTY_LEAD);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ status: 'success' });
    // El body de la ficha conserva property_app_id y no agrega agent/realEstate.
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent).toMatchObject({ property_app_id: 123 });
    expect(sent).not.toHaveProperty('agent');
    expect(sent).not.toHaveProperty('realEstate');
  });

  it('con retries: 0 (contacto general): un solo intento aunque falle con 5xx', async () => {
    const { twoclicsClient } = await loadClient();
    const fetchMock = vi.fn().mockResolvedValue(serverError);
    global.fetch = fetchMock as never;

    await expect(
      twoclicsClient.sendLeadMessage(
        'AR',
        { name: 'Ana', email: 'ana@example.com', message: 'Hola' },
        { retries: 0 },
      ),
    ).rejects.toMatchObject({ statusCode: 503 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Consulta general: sin property/development/agent/realEstate inventados.
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sent).toEqual({ name: 'Ana', email: 'ana@example.com', message: 'Hola' });
  });
});
