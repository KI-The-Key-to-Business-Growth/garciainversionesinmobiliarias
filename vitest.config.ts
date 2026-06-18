import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    // Variables de entorno para los tests de paridad. Se dejan SIN configurar
    // TURNSTILE_SECRET_KEY (→ fail-open), SUPABASE_* (→ db no-op) y RESEND_API_KEY
    // (se mockea) para aislar el pipeline. CRM_AGENT_ID habilita leads generales.
    env: {
      CRM_AGENT_ID: '999',
      CRM_HASH: 'testhash',
      CRM_MESSAGE_URL: 'https://crm.test/msg',
      CONTACT_TO_EMAIL: 'alertas@test.local',
    },
  },
  resolve: {
    alias: {
      // Debe ir antes del alias '@' para que matchee primero.
      'server-only': path.resolve(__dirname, 'tests/stubs/server-only.ts'),
      '@': path.resolve(__dirname, '.'),
    },
  },
});
