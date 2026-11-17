// ── Sanitización y validación de inputs ──────────────────────────────────────
// Portado de legacy/server.js (escapeHtml, isValidEmail, isValidPhone,
// MAX_LENGTHS, MOTIVOS_PERMITIDOS). Paridad exacta con el comportamiento auditado.

// Escapa HTML antes de insertar inputs en emails (prevención XSS) — server.js:223-231
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Validación de formato de email — server.js:234-236
export function isValidEmail(email: unknown): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

// Validación básica de formato de teléfono — server.js:248-250.
// Auditoría 2026-11-17: además de los caracteres permitidos se exigen entre 6 y 15 DÍGITOS reales
// (E.164 admite hasta 15). Antes pasaban basura como «------», «((((((» o números de 16+ dígitos.
export function isValidPhone(phone: unknown): boolean {
  const value = String(phone || '').trim();
  if (!/^[+\d\s\-().]{6,30}$/.test(value)) return false;
  const digits = value.replace(/\D/g, '').length;
  return digits >= 6 && digits <= 15;
}

// Longitudes máximas aceptadas por campo — server.js:239-245
export const MAX_LENGTHS = {
  name: 120,
  phone: 30,
  email: 254,
  message: 2000,
  motivo: 100,
} as const;

// Valores permitidos para el campo motivo del formulario de contacto — server.js:362-365
export const MOTIVOS_PERMITIDOS = new Set<string>([
  '',
  'Inversión inmobiliaria',
  'Compra de propiedad',
  'Venta de propiedad',
  'Alquiler de propiedad',
  'Mercados internacionales',
  'Asesoramiento general',
]);
