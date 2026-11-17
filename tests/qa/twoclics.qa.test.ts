// QA — pruebas de PROPIEDADES y DIFERENCIALES sobre la capa de datos de 2Clics:
// formato de precios, privacidad de metadatos internos y lista blanca de la información pública.
import { describe, expect, it } from 'vitest';
import {
  compactText,
  formatExpenses,
  formatMetadataMoney,
  formatPrice,
  formatPublicDetailValue,
  isPublicPropertyStatus,
  isZeroExpensesValue,
} from '@/lib/2clics/format';
import { parsePublicMetadata, stripInternalDescriptionTags } from '@/lib/2clics/metadata';
import { adaptImages, adaptPublicProperty } from '@/lib/2clics/adapters';
import { isBlockedHost } from '@/lib/security/ssrf';
import { gen, SEEDS } from './_gen';

const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ─────────────────────────────── precios ───────────────────────────────
describe('formatPrice / dinero (diferencial contra agrupación de referencia)', () => {
  it('enteros positivos: moneda + miles con punto, siempre (incluidos 4 dígitos)', () => {
    for (const seed of SEEDS(3000)) {
      const g = gen(seed);
      const price = g.pick([g.int(1, 999), g.int(1000, 9999), g.int(10_000, 999_999), g.int(1_000_000, 90_000_000)]);
      const currency = g.pick(['U$D', 'AR$', 'USD', '']);
      expect(formatPrice(price, currency)).toBe(currency ? `${currency} ${grouped(price)}` : grouped(price));
    }
  });

  it('con decimales redondea al entero más cercano (hacia arriba en .5)', () => {
    for (const seed of SEEDS(2000)) {
      const g = gen(seed);
      const price = g.int(1000, 900_000) + g.pick([0.1, 0.49, 0.5, 0.75, 0.99]);
      expect(formatPrice(price, 'U$D')).toBe(`U$D ${grouped(Math.round(price))}`);
    }
  });

  it('hidePrice manda sobre todo; null/NaN/Infinity dan vacío', () => {
    for (const price of [0, 1, 150_000, null, NaN]) expect(formatPrice(price, 'U$D', true)).toBe('Consultar precio');
    for (const bad of [null, NaN, Infinity, -Infinity]) expect(formatPrice(bad as number, 'U$D')).toBe('');
  });

  it('un precio 0 o negativo NO se muestra como «U$D 0» / «U$D -100» (dato sin cargar)', () => {
    expect(formatPrice(0, 'U$D')).toBe('');
    expect(formatPrice(-100, 'U$D')).toBe('');
  });

  it('formatMetadataMoney y expensas: cero se omite, texto no numérico se conserva, vacío es vacío', () => {
    for (const seed of SEEDS(1500)) {
      const g = gen(seed);
      const n = g.int(1, 5_000_000);
      expect(formatMetadataMoney(String(n), 'AR$')).toBe(`AR$ ${grouped(n)}`);
      expect(formatExpenses(String(n), 'AR$')).toBe(`AR$ ${grouped(n)}`);
    }
    for (const z of ['0', '0.0', '0,00', ' 0 ']) {
      expect(isZeroExpensesValue(z)).toBe(true);
      expect(formatExpenses(z, 'AR$')).toBe('');
    }
    expect(formatMetadataMoney('a convenir', 'U$D')).toBe('U$D a convenir');
    expect(formatMetadataMoney('', 'U$D')).toBe('');
    expect(formatMetadataMoney(undefined, 'U$D')).toBe('');
  });

  it('compactText y formatPublicDetailValue no producen separadores colgantes ni valores basura', () => {
    for (const seed of SEEDS(1500)) {
      const g = gen(seed);
      const parts = Array.from({ length: g.int(0, 5) }, () => g.pick([null, undefined, '', '  ', g.str(10).replace(/[|]/g, 'x')]));
      const out = compactText(parts, ' | ');
      expect(out).not.toMatch(/^\s*\|/);
      expect(out).not.toMatch(/\|\s*$/);
      expect(out).not.toContain('|  |');
    }
    for (const junk of ['-', '--', 'N/A', 'null', 'undefined', 'Sin especificar', 'Sin información', 'OTHER', ' none ']) expect(formatPublicDetailValue(junk), junk).toBe('');
    expect(formatPublicDetailValue(true)).toBe('Sí');
    expect(formatPublicDetailValue(false)).toBe('No');
    expect(formatPublicDetailValue('3 ambientes')).toBe('3 ambientes');
  });

  it('isPublicPropertyStatus: solo ACTIVE (o sin estado) es público', () => {
    for (const ok of ['ACTIVE', 'active', ' Active ', '', null, undefined]) expect(isPublicPropertyStatus(ok as string), String(ok)).toBe(true);
    for (const no of ['INACTIVE', 'SOLD', 'RESERVED', 'DRAFT', 'ARCHIVED', 'x']) expect(isPublicPropertyStatus(no), no).toBe(false);
  });
});

// ───────────────────────────── metadatos ─────────────────────────────
describe('parsePublicMetadata (privacidad: propiedades + diferencial)', () => {
  const PUBLIC_KEYS = ['expensas', 'amount_room', 'amount_bedroom', 'orientation', 'floor', 'covered_area', 'total_area', 'garage', 'balcony', 'condition'];
  const INTERNAL_KEYS = ['private_note', 'partner_note', 'info_contact', 'internal_id', 'admin_note', 'owner_phone', 'propietario', 'comision', 'commission_pct', 'confidential', 'password', 'api_token', 'secret_key', 'PRIVATE_NOTE', ' Private_Note '];

  it('los valores de claves internas NUNCA llegan a la salida, en ninguna de las dos orientaciones de endpoint', () => {
    for (const seed of SEEDS(2000)) {
      const g = gen(seed);
      const items: { metaKey: string; metaValue: string; metaId: string }[] = [];
      const markers: string[] = [];
      for (let i = g.int(1, 8); i > 0; i--) {
        const internal = g.bool(0.5);
        const key = internal ? g.pick(INTERNAL_KEYS) : g.pick(PUBLIC_KEYS);
        const marker = `SECRETO_${seed}_${i}`;
        const id = String(g.int(100, 99999));
        const value = internal ? marker : `${g.int(1, 50)}`;
        if (internal) markers.push(marker);
        // detalle: metaKey semántico / metaId numérico; listado: al revés
        items.push(g.bool() ? { metaKey: key, metaValue: value, metaId: id } : { metaKey: id, metaValue: value, metaId: key });
      }
      const out = JSON.stringify(parsePublicMetadata(items));
      for (const m of markers) expect(out, `se filtró ${m}`).not.toContain(m);
    }
  });

  it('el resultado no depende de qué endpoint la devolvió (metaKey↔metaId intercambiados)', () => {
    for (const seed of SEEDS(2000)) {
      const g = gen(seed);
      const detail: { metaKey: string; metaValue: string; metaId: string }[] = [];
      const list: { metaKey: string; metaValue: string; metaId: string }[] = [];
      for (let i = g.int(1, 8); i > 0; i--) {
        const key = g.pick([...PUBLIC_KEYS, ...INTERNAL_KEYS, 'campo_nuevo_x']);
        const id = String(g.int(1000, 99999) + i);
        const value = String(g.int(1, 999));
        detail.push({ metaKey: key, metaValue: value, metaId: id });
        list.push({ metaKey: id, metaValue: value, metaId: key });
      }
      expect(parsePublicMetadata(list)).toEqual(parsePublicMetadata(detail));
    }
  });

  it('solo produce claves de la lista pública, y los enlaces de video/tour siempre son https públicos', () => {
    const ALLOWED = new Set(['title', 'description', 'rooms', 'bedrooms', 'bathrooms', 'toilettes', 'garages', 'garageType', 'expenses', 'expensesCurrency', 'floor', 'unit', 'disposition', 'orientation', 'coveredArea', 'semiCoveredArea', 'totalArea', 'landArea', 'balcony', 'balconyArea', 'condition', 'antiquity', 'constructionDate', 'deliveryDate', 'minPrice', 'maxPrice', 'minArea', 'maxArea', 'videoUrl', 'tourUrl']);
    for (const seed of SEEDS(2000)) {
      const g = gen(seed);
      const hosts = ['localhost', '127.0.0.5', '[::1]', '10.0.0.8', 'youtube.com', 'my.matterport.com', '169.254.169.254', 'intranet', 'x.localhost.'];
      const items = [
        { metaKey: 'video', metaValue: `https://${g.pick(hosts)}/${g.str(6).replace(/\W/g, 'a')}`, metaId: '1' },
        { metaKey: 'tour', metaValue: `https://${g.pick(hosts)}/t`, metaId: '2' },
        { metaKey: g.str(12), metaValue: g.str(30), metaId: g.str(5) },
      ];
      const out = parsePublicMetadata(items);
      for (const k of Object.keys(out)) expect(ALLOWED.has(k), `clave inesperada ${k}`).toBe(true);
      for (const url of [out.videoUrl, out.tourUrl]) {
        if (!url) continue;
        const u = new URL(url);
        expect(u.protocol).toBe('https:');
        expect(isBlockedHost(u.hostname), `dejó pasar ${u.hostname}`).toBe(false);
      }
    }
  });

  it('stripInternalDescriptionTags: quita [FABIANAGA-n] siempre, es idempotente y no toca otros corchetes', () => {
    for (const seed of SEEDS(2000)) {
      const g = gen(seed);
      const tag = `[FABIANAGA-${g.int(0, 999999)}]`;
      const body = g.pick(['Hermosa casa', 'Ver [nota editorial] al pie', g.str(80)]);
      const text = `${g.pick(['', '\n', '  '])}${tag}${g.pick(['\n\n', ' ', ''])}${body}${g.bool() ? ' ' + tag : ''}`;
      const out = stripInternalDescriptionTags(text);
      expect(out).not.toMatch(/\[FABIANAGA-\d+\]/);
      expect(stripInternalDescriptionTags(out)).toBe(out);
      if (body === 'Ver [nota editorial] al pie') expect(out).toContain('[nota editorial]');
    }
  });
});

// ────────────────────────────── adaptadores ──────────────────────────────
describe('adaptPublicProperty (lista blanca: nada interno en la salida pública)', () => {
  function rawProperty(seed: number) {
    const g = gen(seed);
    const M = (n: string) => `MARCA_${seed}_${n}`;
    return {
      raw: {
        propertyId: g.int(1, 999999),
        title: 'Casa de prueba',
        address: 'Calle 1',
        state: { name: 'Buenos Aires' },
        city: { name: 'Tigre' },
        price: g.pick([150000, 0, null]),
        currency: 'U$D',
        status: 'ACTIVE',
        // —— campos internos en el nivel superior ——
        info_contact: { email: M('info_contact') },
        agent: { name: M('agent'), phone: M('agent_phone') },
        realEstate: { name: M('realEstate') },
        private_note: M('private_note'),
        partner_note: M('partner_note'),
        report_note: M('report_note'),
        // —— campos internos DENTRO de objetos que se copian ——
        propertyType: { typeId: 1, name: 'Casa', appId: 'casa', group: 'g', interno: M('tipo') },
        amenities: [{ amenitieId: 1, name: 'Pileta', appId: 'p', type: 't', interno: M('amenity') }],
        images: [{ imageId: 'i1', url: 'https://cdn.example.com/a.jpg', thumbnailUrl: 'https://cdn.example.com/t.jpg', nota_interna: M('imagen') }],
        meta_data: [
          { metaKey: 'private_note', metaValue: M('meta_private'), metaId: '10' },
          { metaKey: 'owner_phone', metaValue: M('meta_owner'), metaId: '11' },
          { metaKey: 'amount_bedroom', metaValue: '3', metaId: '12' },
        ],
        developmentParent: { developmentId: 7, title: 'Desarrollo', status: { name: 'Activo', secreto: M('dev_status') }, meta_data: [{ secreto: M('dev_meta') }] },
      },
    };
  }

  it('ningún marcador de dato interno aparece en el JSON público (50 variantes)', () => {
    for (const seed of SEEDS(50)) {
      const { raw } = rawProperty(seed);
      const out = JSON.stringify(adaptPublicProperty(raw as never, 'AR'));
      const leaks = [...out.matchAll(/MARCA_\d+_\w+/g)].map((m) => m[0]);
      expect(leaks, `se filtró: ${leaks.join(', ')}`).toEqual([]);
    }
  });

  it('el dormitorio público de los metadatos sí pasa (la lista blanca no es demasiado estricta)', () => {
    const { raw } = rawProperty(1);
    const out = adaptPublicProperty(raw as never, 'AR');
    expect(out.amountBedroom).toBe(3);
    expect(out.propertyType?.name).toBe('Casa');
    expect(out.amenities[0].name).toBe('Pileta');
  });

  it('las imágenes solo salen con URLs https públicas (ni privadas ni de otros esquemas)', () => {
    const bad = ['http://cdn.example.com/a.jpg', 'https://127.0.0.9/a.jpg', 'https://[::1]/a.jpg', 'https://localhost./a.jpg', 'https://10.1.1.1/a.png', 'javascript:alert(1)', 'https://intranet/a.jpg', 'https://cdn.example.com/a.exe'];
    for (const seed of SEEDS(1000)) {
      const g = gen(seed);
      const images = Array.from({ length: g.int(0, 6) }, () => ({ imageId: g.str(4), url: g.pick([...bad, 'https://cdn.example.com/ok.jpg']), thumbnailUrl: g.pick([...bad, 'https://cdn.example.com/ok_t.jpg']), useVirtualized: g.bool(), virtualizedUrl: g.pick(bad) }));
      for (const img of adaptImages(images)) {
        for (const u of [img.url, img.thumbnailUrl, img.displayUrl, img.displayThumbnailUrl]) {
          if (!u) continue;
          expect(u.startsWith('https://cdn.example.com/'), `salió ${u}`).toBe(true);
        }
        expect(img.displayUrl).toBeTruthy();
      }
    }
  });

  it('un precio 0 no termina mostrándose como «U$D 0» en la card', () => {
    const out = adaptPublicProperty({ propertyId: 1, price: 0, currency: 'U$D', hidePrice: false, state: {}, city: {} } as never, 'AR');
    expect(formatPrice(out.price, out.currency, out.hidePrice)).toBe('');
  });
});
