import { describe, expect, it } from 'vitest';
import { GET } from '@/app/share-image/route';

const BASE = 'https://www.garciainversionesinmobiliarias.com.ar';
const call = (src?: string) =>
  GET(new Request(`${BASE}/share-image${src === undefined ? '' : `?src=${encodeURIComponent(src)}`}`));

describe('/share-image (vista previa liviana para WhatsApp)', () => {
  it('sin imagen: 400', async () => {
    expect((await call()).status).toBe(400);
  });

  it('rechaza orígenes que no son los conocidos (no es un proxy abierto)', async () => {
    expect((await call('https://example.com/foto.jpg')).status).toBe(404);
    expect((await call('https://storage.googleapis.com/otro-bucket/foto.jpg')).status).toBe(404);
    expect((await call('http://storage.googleapis.com/portales-prod-images/foto.jpg')).status).toBe(404);
    expect((await call('https://evil.example/developments/benavidez-village/hero.jpg')).status).toBe(404);
  });

  it('rechaza rutas locales fuera de las carpetas permitidas y los intentos de salirse de public/', async () => {
    expect((await call('/robots.txt')).status).toBe(404);
    expect((await call('/developments/../.env.local')).status).toBe(404);
    expect((await call(`${BASE}/developments/..%2f..%2fpackage.json`)).status).toBe(404);
  });

  it('un asset local sale como JPEG de 1200×630 y liviano', async () => {
    const res = await call('/developments/benavidez-village/hero.jpg');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('cache-control')).toContain('s-maxage');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.length).toBeLessThan(300 * 1024);
    const sharp = (await import('sharp')).default;
    const meta = await sharp(buf).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([1200, 630, 'jpeg']);
  });
});
