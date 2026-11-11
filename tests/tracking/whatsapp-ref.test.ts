import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildWhatsAppHref,
  buildWhatsAppMessage,
  cleanAssetLabel,
  DEFAULT_WHATSAPP_TEXT,
  extractWhatsAppRef,
  generateWhatsAppRef,
  getSessionRef,
  isEffectiveWhatsAppClick,
  isGarciaWhatsAppHref,
  isValidWhatsAppRef,
  markRefRegistered,
  WA_REF_EXACT,
  WHATSAPP_NUMBER,
  wasRefRegistered,
} from '@/lib/whatsapp-ref';
import {
  _resetWhatsAppAssetContext,
  clearWhatsAppAssetContext,
  getWhatsAppAssetContext,
  setWhatsAppAssetContext,
} from '@/lib/whatsapp-context';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('referencia de WhatsApp', () => {
  it('genera referencias GI-XXXXXX válidas, sin caracteres ambiguos y sin repetirse en una muestra grande', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 5000; i++) {
      const ref = generateWhatsAppRef();
      expect(ref).toMatch(WA_REF_EXACT);
      expect(ref.slice(3)).not.toMatch(/[IO01]/);
      seen.add(ref);
    }
    expect(seen.size).toBe(5000);
  });

  it('es determinista con una fuente aleatoria dada y usa los 32 símbolos', () => {
    const bytes = (n: number) => Uint8Array.from({ length: n }, (_, i) => i * 37);
    expect(generateWhatsAppRef(bytes)).toBe(generateWhatsAppRef(bytes));
    const all = new Set<string>();
    for (let b = 0; b < 256; b++) all.add(generateWhatsAppRef(() => new Uint8Array(6).fill(b)).slice(3, 4));
    expect(all.size).toBe(32);
  });

  it('valida el formato exacto', () => {
    expect(isValidWhatsAppRef('GI-7K3F2Q')).toBe(true);
    for (const bad of ['GI-7K3F2', 'gi-7k3f2q', 'GI-7K3F2QX', 'GI-7K3F2I', 'XX-7K3F2Q', '', null, undefined, 12345]) {
      expect(isValidWhatsAppRef(bad)).toBe(false);
    }
  });

  it('recupera la referencia dentro de un mensaje aunque la persona edite el resto o use minúsculas', () => {
    expect(extractWhatsAppRef('Hola, quiero información sobre Domus Brickell Center. Ref: GI-7K3F2Q')).toBe('GI-7K3F2Q');
    expect(extractWhatsAppRef('buenas, me pasan precios?? ref gi-7k3f2q gracias')).toBe('GI-7K3F2Q');
    expect(extractWhatsAppRef('Hola, quiero precios')).toBeNull(); // sin referencia = sin origen identificable
    expect(extractWhatsAppRef('GI-7K3F2')).toBeNull();
    expect(extractWhatsAppRef(null)).toBeNull();
  });

  it('arma el mensaje con el activo y la referencia; sin activo conserva el texto actual', () => {
    expect(buildWhatsAppMessage({ label: 'Domus Brickell Center', ref: 'GI-7K3F2Q' })).toBe(
      'Hola, quiero información sobre Domus Brickell Center. Ref: GI-7K3F2Q',
    );
    expect(buildWhatsAppMessage({ ref: 'GI-7K3F2Q' })).toBe(`${DEFAULT_WHATSAPP_TEXT} Ref: GI-7K3F2Q`);
    expect(buildWhatsAppMessage({ label: '   ', ref: 'GI-7K3F2Q' })).toBe(`${DEFAULT_WHATSAPP_TEXT} Ref: GI-7K3F2Q`);
  });

  it('limpia el nombre del activo (marcado, saltos de línea, largo)', () => {
    expect(cleanAssetLabel('<b>Benavídez\nVillage</b>')).toBe('b Benavídez Village /b');
    expect(cleanAssetLabel('x'.repeat(200))).toHaveLength(70);
    expect(cleanAssetLabel(undefined)).toBe('');
  });

  it('solo reescribe enlaces al número de García y no toca otros', () => {
    const own = `https://wa.me/${WHATSAPP_NUMBER}?text=Hola`;
    expect(isGarciaWhatsAppHref(own)).toBe(true);
    expect(isGarciaWhatsAppHref(`https://wa.me/${WHATSAPP_NUMBER}`)).toBe(true);
    expect(isGarciaWhatsAppHref('https://wa.me/5491100000000')).toBe(false);
    expect(isGarciaWhatsAppHref('https://example.com/5491167240353')).toBe(false);
    expect(isGarciaWhatsAppHref('no es una url')).toBe(false);

    const other = 'https://wa.me/5491100000000?text=Hola';
    expect(buildWhatsAppHref(other, 'x')).toBe(other);
    const href = buildWhatsAppHref(own, 'Hola, quiero información. Ref: GI-7K3F2Q');
    expect(href.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`)).toBe(true);
    expect(decodeURIComponent(href.split('text=')[1])).toBe('Hola, quiero información. Ref: GI-7K3F2Q');
    // idempotente: volver a prepararlo reemplaza el texto sin acumular parámetros
    expect(buildWhatsAppHref(href, 'otro texto')).toBe(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('otro texto')}`);
  });
});

describe('referencia por sesión y activo', () => {
  it('reutiliza la referencia para el mismo activo y usa otra para otro activo', () => {
    const storage = memoryStorage();
    const a1 = getSessionRef(storage, 'development:domus');
    const a2 = getSessionRef(storage, 'development:domus');
    const b = getSessionRef(storage, 'development:benavidez');
    expect(a1).toBe(a2);
    expect(b).not.toBe(a1);
    expect(getSessionRef(storage, 'general')).not.toBe(a1);
  });

  it('descarta valores corruptos del storage y funciona sin storage', () => {
    const storage = memoryStorage();
    storage.setItem('gi_wa_ref', '{"general":"basura"}');
    expect(getSessionRef(storage, 'general')).toMatch(WA_REF_EXACT);
    storage.setItem('gi_wa_ref', 'no-json');
    expect(getSessionRef(storage, 'general')).toMatch(WA_REF_EXACT);
    expect(getSessionRef(null, 'general')).toMatch(WA_REF_EXACT);
    const blocked = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(getSessionRef(blocked, 'general')).toMatch(WA_REF_EXACT);
  });

  it('recuerda qué referencias ya se registraron (evita llamadas repetidas)', () => {
    const storage = memoryStorage();
    expect(wasRefRegistered(storage, 'GI-7K3F2Q')).toBe(false);
    markRefRegistered(storage, 'GI-7K3F2Q');
    expect(wasRefRegistered(storage, 'GI-7K3F2Q')).toBe(true);
    expect(wasRefRegistered(storage, 'GI-AAAAAA')).toBe(false);
    expect(wasRefRegistered(null, 'GI-7K3F2Q')).toBe(false);
  });
});

describe('contexto del activo', () => {
  beforeEach(() => _resetWhatsAppAssetContext());

  it('lo fija la ficha y se limpia solo si sigue vigente (navegación entre fichas)', () => {
    const a = { key: 'development:domus', label: 'Domus Brickell Center' };
    const b = { key: 'property:237569', label: 'Casa' };
    setWhatsAppAssetContext(a);
    expect(getWhatsAppAssetContext()).toBe(a);
    setWhatsAppAssetContext(b);
    clearWhatsAppAssetContext(a); // el limpiador tardío de la ficha anterior no borra el nuevo
    expect(getWhatsAppAssetContext()).toBe(b);
    clearWhatsAppAssetContext(b);
    expect(getWhatsAppAssetContext()).toBeNull();
  });
});

describe('sin datos personales hacia GA4 y Meta', () => {
  it('el evento click_whatsapp conserva la referencia como event_id y descarta teléfono y claves personales', async () => {
    const { stripPii } = await import('@/lib/analytics');
    const payload = stripPii({
      event_id: 'GI-7K3F2Q',
      button_location: 'floating',
      button_text: 'WhatsApp',
      page_path: '/desarrollos/domus-brickell-center',
      whatsapp_number: '5491167240353',
      phone: '+54 9 11 6724-0353',
      email: 'ana@example.com',
      message: 'Hola, quiero información. Ref: GI-7K3F2Q',
      property_id: '236682',
    });
    expect(payload).toMatchObject({ event_id: 'GI-7K3F2Q', button_location: 'floating', property_id: '236682' });
    for (const key of ['whatsapp_number', 'phone', 'email', 'message']) expect(payload).not.toHaveProperty(key);
  });

  it('la referencia es aleatoria: no contiene datos del activo ni de la persona', () => {
    const refs = Array.from({ length: 200 }, () => generateWhatsAppRef());
    const joined = refs.join('').toLowerCase();
    expect(joined).not.toContain('domus');
    // Dos referencias para el mismo activo y sesión distinta no se parecen (sin patrón derivable)
    expect(new Set(refs.map((r) => r.slice(3, 5))).size).toBeGreaterThan(50);
  });
});

describe('qué cuenta como clic efectivo', () => {
  it('cuentan el clic izquierdo y el central; copiar el enlace (botón derecho) y los demás eventos no', () => {
    expect(isEffectiveWhatsAppClick('click', 0)).toBe(true);
    expect(isEffectiveWhatsAppClick('auxclick', 1)).toBe(true);
    expect(isEffectiveWhatsAppClick('auxclick', 2)).toBe(false); // botón derecho
    expect(isEffectiveWhatsAppClick('auxclick', 3)).toBe(false);
    expect(isEffectiveWhatsAppClick('contextmenu', 2)).toBe(false);
    expect(isEffectiveWhatsAppClick('pointerdown', 0)).toBe(false);
    expect(isEffectiveWhatsAppClick('focusin', 0)).toBe(false);
  });
});
