import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ATTRIBUTION_TTL_DAYS } from '@/lib/attribution';
import { CONSENT_MAX_AGE_DAYS } from '@/lib/consent';
import { WHATSAPP_CLICK_RETENTION_DAYS } from '@/lib/retention/whatsapp-clicks';
import { WHATSAPP_ATTRIBUTION_REQUIRES_MARKETING_CONSENT, WHATSAPP_CLICK_REQUIRES_CONSENT } from '@/lib/whatsapp-policy';

const page = readFileSync('app/privacidad/page.tsx', 'utf8');
const banner = readFileSync('components/consent/ConsentManager.tsx', 'utf8');
// Texto «plano» de la página (sin JSX) para buscar frases aunque estén partidas en varias líneas.
const text = page
  .split(/\r?\n/)
  .filter((line) => !line.trim().startsWith('//')) // sin los comentarios del código
  .join(' ')
  .replace(/<[^>]+>/g, ' ').replace(/\{'\s*'\}/g, ' ').replace(/\s+/g, ' ');

describe('política de privacidad: consistencia con el funcionamiento real', () => {
  it('el modelo restrictivo del código es el que la política describe', () => {
    expect(WHATSAPP_CLICK_REQUIRES_CONSENT).toBe(true); // sin consentimiento no se registra el clic
    expect(WHATSAPP_ATTRIBUTION_REQUIRES_MARKETING_CONSENT).toBe(true); // solo analítica: sin datos de campaña
    expect(text).toContain('Si rechazaste ambas opciones, no conservamos ese registro de clic');
    expect(text).toContain('Si aceptaste solo las de analítica, no guardamos datos de campañas ni identificadores publicitarios en ese registro');
    expect(text).toContain('incluidos identificadores técnicos de publicidad');
  });

  it('describe la funcionalidad de WhatsApp: referencia aleatoria, clic ≠ mensaje, Meta, copiar no registra', () => {
    expect(text).toContain('Enlaces de WhatsApp y origen de consultas');
    expect(text).toContain('referencia técnica aleatoria que no incorpora directamente tu nombre, teléfono ni correo electrónico');
    expect(text).toContain('Seleccionar un enlace no significa que hayas enviado un mensaje');
    expect(text).toContain('WhatsApp, un servicio de Meta');
    expect(text).toContain('Copiar el enlace sin abrirlo tampoco genera un registro');
  });

  it('los plazos de la política coinciden con las constantes del código', () => {
    expect(ATTRIBUTION_TTL_DAYS).toBe(90);
    expect(text).toMatch(/por hasta 90 días, el origen de tu visita/);
    expect(CONSENT_MAX_AGE_DAYS).toBe(180);
    expect(text).toMatch(/por hasta 180 días/);
    expect(WHATSAPP_CLICK_RETENTION_DAYS).toBe(90);
    expect(text).toMatch(/clics hacia WhatsApp[^.]*hasta 90 días y luego se eliminan automáticamente/);
  });

  it('no contiene afirmaciones absolutas que el comportamiento de los servicios no permite sostener', () => {
    for (const phrase of [
      'No enviamos tu nombre, correo electrónico ni teléfono a Google Analytics',
      'no vende, alquila ni cede',
      'No vendemos ni cedemos ningún dato',
      'garantizamos',
      '100%',
      'jamás',
      'validado jurídicamente',
      'validada jurídicamente',
      'jurídicamente aprobad',
      'aprobada por un asesor',
      'revisada por un abogado',
      'cumple con la ley',
    ]) {
      expect(text.toLowerCase(), phrase).not.toContain(phrase.toLowerCase());
    }
    // La diferencia entre datos de formulario y datos técnicos de las plataformas está dicha.
    expect(text).toContain('no se incorporan a los eventos que enviamos a Google Analytics, Google Tag Manager ni Meta');
    expect(text).toContain('reciben por sí mismos datos técnicos del navegador y de la conexión, como la dirección IP');
  });

  it('nombra a todos los proveedores que intervienen en el tratamiento', () => {
    for (const provider of ['Vercel', 'Supabase', 'Resend', '2Clics', 'Cloudflare', 'Upstash', 'Sentry', 'Google', 'Meta']) {
      expect(text, provider).toContain(provider);
    }
    expect(text).toContain('Las funciones del sitio se ejecutan en Washington D. C., Estados Unidos');
  });

  it('el índice apunta a secciones que existen', () => {
    const ids = [...page.matchAll(/\['([a-z-]+)', '[^']+'\]/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(14);
    for (const id of ids) expect(page, id).toContain(`id="${id}"`);
  });

  it('el correo de contacto es el indicado por la titular y es el mismo en toda la política', () => {
    const emails = new Set([...page.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)].map((m) => m[0]));
    expect([...emails]).toEqual(['fabiana@garciainversiones.com.ar']);
  });

  it('el banner y el panel de cookies describen lo mismo que la política', () => {
    const panel = banner.replace(/\s+/g, ' ');
    expect(panel).toMatch(/registrar qué propiedad o desarrollo generó un clic hacia WhatsApp, sin tus datos personales ni datos de campañas/);
    expect(panel).toMatch(/asociar los clics hacia WhatsApp con la campaña de origen/);
    expect(panel).toContain('El sitio, los formularios y WhatsApp funcionan igual si las rechazás');
  });
});

describe('política de privacidad: control de publicación (borrador sin validar)', () => {
  const pending = (page.match(/<Pendiente grupo="[BC]">/g) ?? []).length;
  const draftNote = page.includes('BORRADOR PARA REVISIÓN JURÍDICA');

  it('todo pendiente lleva grupo B (datos de García) o C (criterio jurídico); ninguno sin clasificar', () => {
    expect((page.match(/<Pendiente>/g) ?? []).length).toBe(0);
    expect((page.match(/<Pendiente grupo="[^BC"]*"/g) ?? []).length).toBe(0);
  });

  it('mientras haya puntos «[A CONFIRMAR]» el borrador lo dice, y no al revés', () => {
    expect(pending > 0).toBe(draftNote);
  });

  it('el borrador no se presenta como validado ni cambia los datos del responsable por inventados', () => {
    expect(text).not.toMatch(/CUIT:\s*\d/); // ningún CUIT inventado
    expect(page).not.toMatch(/Av\.|Avenida|Calle\s+\w+\s+\d+/); // ningún domicilio inventado
  });

  // GATE: ejecutar con PRIVACY_PUBLISH_CHECK=1 antes de publicar. Falla mientras queden pendientes.
  it.runIf(process.env.PRIVACY_PUBLISH_CHECK === '1')('PUBLICAR solo sin pendientes y sin la nota de borrador', () => {
    expect(pending).toBe(0);
    expect(draftNote).toBe(false);
  });
});
