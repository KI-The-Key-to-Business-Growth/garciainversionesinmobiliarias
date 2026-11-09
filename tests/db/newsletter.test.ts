import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({ getSupabase: () => null }));

import { dbInsertNewsletter } from '@/lib/db/newsletter';

describe('dbInsertNewsletter sin Supabase configurado', () => {
  it('lanza error: nunca se informa éxito sin persistencia', async () => {
    await expect(dbInsertNewsletter({ email: 'a@b.com' })).rejects.toThrow(
      'supabase_not_configured',
    );
  });
});
