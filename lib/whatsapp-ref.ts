// ── Referencia técnica de WhatsApp (Ref) ─────────────────────────────────────
// Referencia aleatoria y NO personal que viaja dentro del mensaje preparado de WhatsApp
// («… Ref: GI-7K3F2QPXM4HVD») y se registra en `lead_attribution` (event_id = Ref) al tocar el enlace.
// Sirve para relacionar, más adelante, un mensaje RECIBIDO con el origen guardado (WhatsApp
// Business Platform u otra integración autorizada). Un clic NO confirma que el mensaje se envió.
//
// Seguridad: 13 símbolos de un alfabeto de 32 = 65 bits de entropía, generados SIEMPRE con el
// generador criptográfico del navegador (`crypto.getRandomValues`); no hay alternativa con
// Math.random: si no existe, no se genera referencia y el enlace queda sin ella. No es adivinable
// ni deriva del activo, la persona, la hora o la sesión.
//
// Una referencia por (sesión del navegador + activo): tocar varias veces el mismo botón no duplica
// registros, y distintos activos de una misma visita tienen referencias distintas.
//
// IMPORTANTE: una referencia que NO se persistió (clic sin consentimiento, o clic que nunca se
// registró) no permite recuperar después su origen: el servidor no tiene nada contra qué
// compararla. Un mensaje que la traiga se tratará como «sin origen identificable».

export const WHATSAPP_NUMBER = '5491167240353';
export const WA_REF_PREFIX = 'GI-';
// 32 símbolos sin I/O/0/1 (evitan confusiones al leer o dictar): 5 bits por símbolo.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REF_LENGTH = 13; // 13 × 5 bits = 65 bits (mínimo exigido: 64)
export const WA_REF_ENTROPY_BITS = REF_LENGTH * 5;
export const WA_REF_EXACT = /^GI-[A-HJ-NP-Z2-9]{13}$/;
const WA_REF_IN_TEXT = /GI-[A-HJ-NP-Z2-9]{13}/;

export const DEFAULT_WHATSAPP_TEXT = 'Hola, me interesa recibir asesoramiento inmobiliario.';
const REF_STORAGE_KEY = 'gi_wa_ref';
const REGISTERED_STORAGE_KEY = 'gi_wa_reg';

type RandomBytes = (length: number) => Uint8Array;

// Solo el generador criptográfico. Sin `crypto.getRandomValues` lanza: nunca se degrada a Math.random.
function browserRandomBytes(length: number): Uint8Array {
  const webCrypto = globalThis.crypto;
  if (!webCrypto || typeof webCrypto.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues no disponible: no se genera referencia');
  }
  const bytes = new Uint8Array(length);
  webCrypto.getRandomValues(bytes);
  return bytes;
}

// 256 es múltiplo de 32: `byte & 31` no introduce sesgo.
export function generateWhatsAppRef(randomBytes: RandomBytes = browserRandomBytes): string {
  const bytes = randomBytes(REF_LENGTH);
  let out = '';
  for (let i = 0; i < REF_LENGTH; i++) out += ALPHABET[bytes[i] & 31];
  return `${WA_REF_PREFIX}${out}`;
}

export function isValidWhatsAppRef(value: unknown): value is string {
  return typeof value === 'string' && WA_REF_EXACT.test(value);
}

// Busca la referencia dentro de un mensaje recibido (tolera que la persona edite el resto del texto
// o escriba la referencia en minúsculas). Devuelve null si no está: «sin origen identificable».
export function extractWhatsAppRef(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = String(text).toUpperCase().match(WA_REF_IN_TEXT);
  return match ? match[0] : null;
}

// Nombre del activo para el texto: sin caracteres de control ni marcado, corto.
export function cleanAssetLabel(label: string | null | undefined): string {
  if (!label) return '';
  return String(label)
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 70);
}

export function buildWhatsAppMessage(input: { label?: string | null; ref: string }): string {
  const label = cleanAssetLabel(input.label);
  const lead = label ? `Hola, quiero información sobre ${label}.` : DEFAULT_WHATSAPP_TEXT;
  return `${lead} Ref: ${input.ref}`;
}

// Solo los enlaces al número de García llevan referencia; cualquier otro enlace queda intacto.
export function isGarciaWhatsAppHref(href: string | null | undefined): boolean {
  if (!href) return false;
  try {
    const url = new URL(href);
    return url.hostname === 'wa.me' && url.pathname.replace(/\D/g, '') === WHATSAPP_NUMBER;
  } catch {
    return false;
  }
}

export function buildWhatsAppHref(href: string, message: string): string {
  if (!isGarciaWhatsAppHref(href)) return href;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function readMap(storage: StorageLike | null | undefined, storageKey: string): Record<string, string> {
  try {
    const raw = storage?.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

// Misma referencia mientras dure la sesión del navegador para el mismo activo. Si el storage no está
// disponible se genera una nueva (el clic igual se registra; el único costo es perder la reutilización).
export function getSessionRef(
  storage: StorageLike | null | undefined,
  assetKey: string,
  generate: () => string = generateWhatsAppRef,
): string {
  const map = readMap(storage, REF_STORAGE_KEY);
  const existing = map[assetKey];
  if (isValidWhatsAppRef(existing)) return existing;
  const ref = generate();
  try {
    storage?.setItem(REF_STORAGE_KEY, JSON.stringify({ ...map, [assetKey]: ref }));
  } catch {
    /* storage bloqueado: sin reutilización */
  }
  return ref;
}

// Marca que el clic de esa referencia ya se registró en el servidor (evita llamadas repetidas).
export function wasRefRegistered(storage: StorageLike | null | undefined, ref: string): boolean {
  return readMap(storage, REGISTERED_STORAGE_KEY)[ref] === '1';
}

export function markRefRegistered(storage: StorageLike | null | undefined, ref: string): void {
  try {
    storage?.setItem(REGISTERED_STORAGE_KEY, JSON.stringify({ ...readMap(storage, REGISTERED_STORAGE_KEY), [ref]: '1' }));
  } catch {
    /* sin storage */
  }
}

// ¿Este evento del navegador es un clic efectivo sobre el enlace? `click` (botón principal) y
// `auxclick` con el botón central. El botón derecho (menú contextual, copiar enlace) y cualquier otro
// botón NO cuentan: copiar un enlace no es un clic ni un mensaje.
export function isEffectiveWhatsAppClick(type: string, button: number): boolean {
  if (type === 'click') return button === 0;
  if (type === 'auxclick') return button === 1;
  return false;
}
