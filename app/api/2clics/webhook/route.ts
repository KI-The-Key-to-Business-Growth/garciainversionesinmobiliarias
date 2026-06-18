import { handle2ClicsWebhook } from '@/lib/crm/handle-webhook';

// URL canónica del webhook de 2Clics. Pasar esta URL al CRM.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  return handle2ClicsWebhook(req);
}
