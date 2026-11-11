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
  .replace(/<[^>]+>/g, ' ')
  .replace(/\{'\s*'\}/g, ' ')
  .replace(/\s+/g, ' ');

describe('política de privacidad: consistencia con el funcionamiento real', () => {
  it('el modelo restrictivo del código es el que la política describe', () => {
    expect(WHATSAPP_CLICK_REQUIRES_CONSENT).toBe(true); // sin consentimiento no se registra el clic
    expect(WHATSAPP_ATTRIBUTION_REQUIRES_MARKETING_CONSENT).toBe(true); // solo analítica: sin datos de campaña
    expect(text).toContain('Si rechazaste ambas: no registramos el clic');
    expect(text).toContain('No guardamos datos de campañas ni identificadores publicitarios en ese registro');
    expect(text).toContain('incluidos identificadores técnicos de publicidad');
  });

  it('describe WhatsApp: referencia aleatoria, clic ≠ mensaje, Meta, copiar no registra, CRM manual', () => {
    expect(text).toContain('referencia técnica aleatoria que no incorpora directamente tu nombre, teléfono ni correo electrónico');
    expect(text).toContain('Seleccionar un enlace no significa que hayas enviado un mensaje');
    expect(text).toContain('WhatsApp, un servicio de Meta');
    expect(text).toContain('Copiar el enlace sin abrirlo tampoco genera un registro');
    expect(text).toContain('atendida personalmente por la titular');
    expect(text).toContain('se registran manualmente en nuestro CRM (2Clics); no se leen ni se procesan las conversaciones de forma automática');
  });

  it('los plazos anunciados coinciden con lo implementado y no se promete borrado automático', () => {
    expect(ATTRIBUTION_TTL_DAYS).toBe(90);
    expect(text).toMatch(/por hasta 90 días, el origen de tu visita/);
    expect(CONSENT_MAX_AGE_DAYS).toBe(180);
    expect(text).toMatch(/por hasta 180 días/);
    // 90 días de los clics de WhatsApp: propuesta; el borrado está desactivado → no se anuncia
    expect(WHATSAPP_CLICK_RETENTION_DAYS).toBe(90);
    expect(text).not.toMatch(/se eliminan automáticamente|eliminación automática|borrado automático/i);
    expect(text).not.toMatch(/WhatsApp[^.]*(hasta|por) 90 días/);
    expect(text).not.toMatch(/24 meses|dos años/i);
  });

  it('no contiene afirmaciones absolutas ni de validación jurídica que no se pueden sostener', () => {
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
    expect(text).toContain('no se incorporan a los eventos que enviamos a Google Analytics, Google Tag Manager ni Meta');
    expect(text).toContain('reciben por sí mismos datos técnicos del navegador y de la conexión, como la dirección IP');
  });

  it('nombra a todos los proveedores y no afirma regiones ni contratos sin comprobar', () => {
    for (const provider of ['Vercel', 'Supabase', 'Resend', '2Clics', 'Cloudflare', 'Upstash', 'Sentry', 'Google', 'Meta']) {
      expect(text, provider).toContain(provider);
    }
    expect(text).toContain('Las funciones del sitio se ejecutan en Washington D. C., Estados Unidos');
    expect(text).not.toMatch(/cláusulas contractuales|marco de privacidad|\bDPA\b|nivel adecuado|Standard Contractual/i);
    expect(text).not.toMatch(/Supabase[^.]*(región|São Paulo|Virginia|Irlanda)/i);
  });

  it('no incluye apartados sobre campañas internacionales hipotéticas ni detalles de implementación', () => {
    expect(text).not.toMatch(/España|Unión Europea|RGPD|GDPR|California/i);
    expect(text).not.toMatch(/lead_attribution|retention_audit|service role|RLS|tabla/i);
  });

  it('el índice apunta a secciones que existen', () => {
    const ids = [...page.matchAll(/\['([a-z-]+)', '[^']+'\]/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThanOrEqual(12);
    for (const id of ids) expect(page, id).toContain(`id="${id}"`);
  });

  it('identifica a la responsable con los datos confirmados y sin inventar otros', () => {
    expect(text).toContain('María Fabiana García');
    expect(text).toContain('titular de García Inversiones Inmobiliarias');
    expect(text).toContain('CMCPSI 6378');
    expect(text).toContain('Hipólito Yrigoyen 1470, El Talar (CP 1618), Partido de Tigre');
    expect(text).toContain('No constituye una oficina comercial ni un establecimiento de atención al público');
    expect(text).not.toMatch(/CUIT/i); // no se exhibe por defecto (decisión del asesor)
    expect(text).not.toMatch(/Nordelta/i);
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
  const pendingMarkers = (text.match(/\[A CONFIRMAR/g) ?? []).length;
  const draftNote = page.includes('BORRADOR PARA REVISIÓN JURÍDICA');

  it('un texto con «[A CONFIRMAR]» siempre lleva la nota de borrador', () => {
    if (pendingMarkers > 0) expect(draftNote).toBe(true);
  });

  it('el borrador no se presenta como validado', () => {
    expect(draftNote).toBe(true); // se quita solo cuando el abogado valide el texto
  });

  // GATE: ejecutar con PRIVACY_PUBLISH_CHECK=1 antes de publicar. Falla mientras exista la nota de
  // borrador o cualquier «[A CONFIRMAR]». La nota se quita únicamente tras la validación jurídica.
  it.runIf(process.env.PRIVACY_PUBLISH_CHECK === '1')('PUBLICAR solo sin nota de borrador ni pendientes', () => {
    expect(pendingMarkers).toBe(0);
    expect(draftNote).toBe(false);
  });
});
