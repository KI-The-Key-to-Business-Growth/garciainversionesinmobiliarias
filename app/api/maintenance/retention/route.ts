import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { runWhatsAppClickRetention } from '@/lib/retention/whatsapp-clicks';
import { isProductionRuntime } from '@/lib/runtime-env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Ruta de mantenimiento: conservación de clics de WhatsApp ─────────────────
// La invoca el cron de Vercel (vercel.json) con `Authorization: Bearer ${CRON_SECRET}`.
// DESHABILITADA por defecto: no hace nada salvo que existan `CRON_SECRET` y `RETENTION_ENABLED=true`.
// Fuera de producción (Preview/Development comparten Supabase con producción) fuerza el modo de
// prueba: cuenta y audita, pero NUNCA borra. `?dry=1` fuerza el modo de prueba también en producción.

function authorized(req: NextRequest, secret: string): boolean {
  const received = Buffer.from(req.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || process.env.RETENTION_ENABLED !== 'true') {
    return NextResponse.json({ ok: false, message: 'Conservación deshabilitada.' }, { status: 503 });
  }
  if (!authorized(req, secret)) {
    return NextResponse.json({ ok: false, message: 'No autorizado.' }, { status: 401 });
  }
  const dryRun = req.nextUrl.searchParams.get('dry') === '1' || !isProductionRuntime();
  const result = await runWhatsAppClickRetention({ dryRun });
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
