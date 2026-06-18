import { handle2ClicsWebhook } from '@/lib/crm/handle-webhook';

// Alias de backward-compatibility (legacy server.js exponía /property además de /webhook).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  return handle2ClicsWebhook(req);
}
