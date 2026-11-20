import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { CANONICAL_BASE_URL } from '@/lib/env';

// Imagen de vista previa para compartir (WhatsApp / redes): 1200×630, JPEG liviano.
//
// WhatsApp descarga la imagen desde el teléfono de quien envía, con poco tiempo, y descarta las que
// pesan mucho (recomienda < 300 KB). Las fotos de las fichas pesan ~800 KB, así que a veces el link
// salía con tarjeta chica y sin foto. Esta ruta entrega siempre una versión liviana. La imagen NO
// se muestra dentro de la página: solo la leen los que previsualizan el link (og:image).
//
// Seguridad: solo acepta orígenes conocidos (almacenamiento público de 2Clics y assets locales de
// public/), para que no funcione como proxy abierto.

export const runtime = 'nodejs';

const REMOTE_HOST = 'storage.googleapis.com';
const REMOTE_PREFIX = '/portales-prod-images/';
const LOCAL_PREFIXES = ['/developments/', '/assets/'];
const MAX_REMOTE_BYTES = 15 * 1024 * 1024;
const WIDTH = 1200;
const HEIGHT = 630;

const CACHE_HEADERS = {
  'Content-Type': 'image/jpeg',
  // Un día en el navegador, 30 días en el CDN, y se sirve la copia vieja mientras se renueva.
  'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800',
};

function bad(status: number, message: string) {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

async function loadSource(src: string): Promise<Buffer | null> {
  let url: URL;
  try {
    url = new URL(src, CANONICAL_BASE_URL);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;

  if (url.hostname === REMOTE_HOST && url.pathname.startsWith(REMOTE_PREFIX)) {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const length = Number(res.headers.get('content-length') || 0);
    if (length > MAX_REMOTE_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > MAX_REMOTE_BYTES ? null : buf;
  }

  if (url.origin === new URL(CANONICAL_BASE_URL).origin && LOCAL_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    const publicDir = path.join(process.cwd(), 'public');
    const file = path.normalize(path.join(publicDir, decodeURIComponent(url.pathname)));
    if (!file.startsWith(publicDir + path.sep)) return null;
    try {
      return await readFile(file);
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get('src');
  if (!src || src.length > 600) return bad(400, 'Falta la imagen');

  const source = await loadSource(src).catch(() => null);
  if (!source) return bad(404, 'Imagen no disponible');

  try {
    const output = await sharp(source, { failOn: 'none' })
      .rotate()
      .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 72, progressive: false, mozjpeg: true })
      .toBuffer();
    return new Response(new Uint8Array(output), { status: 200, headers: CACHE_HEADERS });
  } catch {
    return bad(422, 'No se pudo procesar la imagen');
  }
}
