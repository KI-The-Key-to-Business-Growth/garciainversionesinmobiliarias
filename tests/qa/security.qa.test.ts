// QA — pruebas de PROPIEDADES y DIFERENCIALES sobre la capa de seguridad.
// Propiedad = algo que debe cumplirse para cualquier entrada. Diferencial = comparar contra una
// implementación de referencia independiente.
import { BlockList, isIP } from 'node:net';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { escapeHtml, isValidEmail, isValidPhone, MAX_LENGTHS } from '@/lib/security/sanitize';
import { isPublicHttpsUrl, sanitizeImageUrl, sanitizeVideoUrl } from '@/lib/security/ssrf';
import { isBotRequest, isSpamContent, isTooFast } from '@/lib/security/antibot';
import { buildCsp, securityHeaders } from '@/lib/security/csp';
import { checkRate, _resetRateLimit } from '@/lib/security/ratelimit';
import { gen, SEEDS } from './_gen';

// ───────────────────────────── escapeHtml ─────────────────────────────
describe('escapeHtml (propiedades + diferencial)', () => {
  // Referencia independiente: decodificador de las 5 entidades que produce escapeHtml.
  const decode = (s: string) =>
    s.replace(/&(amp|lt|gt|quot|#039);/g, (_m, e) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#039': "'" })[e as string]!);

  it('nunca deja < > " \' en la salida y se puede revertir exactamente', () => {
    for (const seed of SEEDS(2000)) {
      const g = gen(seed);
      const input = g.bool(0.3) ? g.evil() : g.str(80);
      const out = escapeHtml(input);
      expect(out).not.toMatch(/[<>"']/);
      // todo & de la salida abre una de las 5 entidades
      expect(out.replace(/&(amp|lt|gt|quot|#039);/g, '')).not.toContain('&');
      expect(decode(out)).toBe(input);
    }
  });

  it('trata null/undefined/números sin lanzar', () => {
    for (const v of [null, undefined, 0, 1.5, NaN, true, {}, [], Symbol.iterator.toString()]) {
      expect(() => escapeHtml(v)).not.toThrow();
    }
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

// ─────────────────────────── validadores ───────────────────────────
describe('isValidEmail / isValidPhone (propiedades)', () => {
  it('rechaza todo lo que no tenga forma local@dominio.tld y acepta los válidos generados', () => {
    for (const seed of SEEDS(1500)) {
      const g = gen(seed);
      const local = g.pick(['ana', 'juan.perez', 'a+b', 'x_y-z', 'info123']);
      const dom = g.pick(['gmail.com', 'yahoo.com.ar', 'garcia.com.ar', 'a.co']);
      expect(isValidEmail(`${local}@${dom}`)).toBe(true);
      expect(isValidEmail(` ${local}@${dom} `)).toBe(true); // se recorta
      expect(isValidEmail(`${local}${dom}`)).toBe(false); // sin @
      expect(isValidEmail(`${local}@@${dom}`)).toBe(false);
      expect(isValidEmail(`${local}@ ${dom}`)).toBe(false);
      expect(isValidEmail(`${local}@dominio`)).toBe(false); // sin punto
    }
  });

  it('no sufre backtracking catastrófico (tiempo lineal) con entradas hostiles largas', () => {
    const nasty = ['a@' + 'b.'.repeat(50_000), 'a'.repeat(100_000) + '@', '@'.repeat(100_000), 'a@b' + '.'.repeat(100_000) + 'c'];
    for (const s of nasty) {
      const t0 = performance.now();
      isValidEmail(s);
      expect(performance.now() - t0).toBeLessThan(200);
    }
  });

  it('un teléfono válido debe tener dígitos de verdad (entre 6 y 15)', () => {
    // Propiedad: si el validador acepta, la cantidad de dígitos es razonable.
    for (const seed of SEEDS(3000)) {
      const g = gen(seed);
      const chars = '+0123456789 -().';
      let s = '';
      for (let i = g.int(0, 34); i > 0; i--) s += chars[g.int(0, chars.length - 1)];
      if (isValidPhone(s)) {
        const digits = s.replace(/\D/g, '').length;
        expect(digits, `aceptó "${s}" con ${digits} dígitos`).toBeGreaterThanOrEqual(6);
        expect(digits, `aceptó "${s}" con ${digits} dígitos`).toBeLessThanOrEqual(15);
      }
    }
  });

  it('acepta los formatos argentinos e internacionales habituales', () => {
    for (const ok of ['11 5555-5555', '+54 9 11 5555 5555', '(011) 4555-5555', '011 15 5555-5555', '+1 (305) 555-0100', '+5491155555555', '0351 155555555']) {
      expect(isValidPhone(ok), ok).toBe(true);
    }
    for (const bad of ['', '123', '------', '((((((', '++++++', '+()-() ()', 'abc12345', '1'.repeat(16), '12345 6789012345678']) {
      expect(isValidPhone(bad), bad).toBe(false);
    }
  });

  it('MAX_LENGTHS es coherente con los validadores', () => {
    expect(MAX_LENGTHS.email).toBe(254);
    expect(MAX_LENGTHS.phone).toBeGreaterThanOrEqual(15);
  });
});

// ───────────────────────────── anti-bot ─────────────────────────────
describe('antibot (propiedades)', () => {
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it('isTooFast: bloquea solo entre 0 y 3 s; ignora ausente, futuro, muy viejo o corrupto', () => {
    vi.useFakeTimers(); // reloj congelado: el tiempo transcurrido es exacto
    const now = Date.now();
    for (const seed of SEEDS(1500)) {
      const g = gen(seed);
      const elapsed = g.pick([g.int(0, 2999), g.int(3000, 7_200_000), g.int(7_200_001, 90_000_000), -g.int(1, 100_000)]);
      const res = isTooFast({ _form_loaded_at: String(now - elapsed) });
      expect(res).toBe(elapsed >= 0 && elapsed < 3000);
    }
    for (const bad of [undefined, '', 'abc', '0', '-5', 'NaN', 'Infinity', '1e999']) {
      expect(isTooFast({ _form_loaded_at: bad })).toBe(false);
    }
    vi.useRealTimers();
  });

  it('isBotRequest: solo el honeypot "website" con texto lo activa', () => {
    expect(isBotRequest({ website: 'x' })).toBe(true);
    expect(isBotRequest({ website: '' })).toBe(false);
    expect(isBotRequest({})).toBe(false);
    expect(isBotRequest({ website: 123 as unknown as string })).toBe(false);
  });

  it('isSpamContent: nunca lanza con cuerpos arbitrarios y un lead legítimo normal pasa', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
    for (const seed of SEEDS(1500)) {
      const g = gen(seed);
      const body = { nombre: g.str(20), apellido: g.str(20), email: g.str(30), telefono: g.str(15), message: g.bool() ? g.evil() : g.str(200) };
      expect(() => isSpamContent(body, ua)).not.toThrow();
    }
    expect(isSpamContent({ nombre: 'María', apellido: 'Gómez', email: 'maria@gmail.com', telefono: '11 5555-5555', message: 'Quiero invertir en Miami, ¿me pueden contar sobre Domus?' }, ua)).toBe(false);
  });

  it('isSpamContent: un inversor que menciona criptomonedas NO debe descartarse en silencio', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36';
    // Frases reales de leads de inversión inmobiliaria
    expect(isSpamContent({ nombre: 'Pablo', apellido: 'Díaz', message: 'Tengo fondos en crypto y quiero dolarizarme en Miami con un departamento' }, ua)).toBe(false);
  });
});

// ──────────────────────── anti-SSRF (diferencial) ────────────────────────
describe('anti-SSRF: isPublicHttpsUrl contra una referencia independiente (node:net)', () => {
  // Rangos que NUNCA debe aceptar un filtro de URLs "públicas".
  const privateV4 = new BlockList();
  for (const [net, prefix] of [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.168.0.0', 16],
  ] as const)
    privateV4.addSubnet(net, prefix, 'ipv4');

  function randIPv4(g: ReturnType<typeof gen>, inside: boolean) {
    const pickRange = g.pick([
      () => `10.${g.int(0, 255)}.${g.int(0, 255)}.${g.int(0, 255)}`,
      () => `127.${g.int(0, 255)}.${g.int(0, 255)}.${g.int(0, 255)}`,
      () => `0.${g.int(0, 255)}.${g.int(0, 255)}.${g.int(0, 255)}`,
      () => `100.${g.int(64, 127)}.${g.int(0, 255)}.${g.int(0, 255)}`,
      () => `169.254.${g.int(0, 255)}.${g.int(0, 255)}`,
      () => `172.${g.int(16, 31)}.${g.int(0, 255)}.${g.int(0, 255)}`,
      () => `192.168.${g.int(0, 255)}.${g.int(0, 255)}`,
    ]);
    if (inside) return pickRange();
    for (;;) {
      const ip = `${g.int(1, 223)}.${g.int(0, 255)}.${g.int(0, 255)}.${g.int(1, 254)}`;
      if (!privateV4.check(ip, 'ipv4')) return ip;
    }
  }

  it('rechaza TODA IPv4 privada/loopback/link-local/CGNAT/0.0.0.0 y acepta las públicas', () => {
    for (const seed of SEEDS(3000)) {
      const g = gen(seed);
      const priv = randIPv4(g, true);
      expect(isPublicHttpsUrl(`https://${priv}/foto.jpg`), `debería rechazar ${priv}`).toBe(false);
      expect(sanitizeVideoUrl(`https://${priv}/tour`), `video: debería rechazar ${priv}`).toBe('');
      const pub = randIPv4(g, false);
      expect(isPublicHttpsUrl(`https://${pub}/foto.jpg`), `debería aceptar ${pub}`).toBe(true);
    }
  });

  it('rechaza localhost en todas sus variantes y nombres internos', () => {
    for (const h of ['localhost', 'LOCALHOST', 'localhost.', 'foo.localhost', 'a.b.localhost.', 'metadata.google.internal', 'metadata.google.internal.', 'service.internal', 'printer.local']) {
      expect(isPublicHttpsUrl(`https://${h}/x.jpg`), h).toBe(false);
      expect(sanitizeVideoUrl(`https://${h}/x`), h).toBe('');
    }
  });

  it('rechaza IPv6 loopback, no especificada, ULA, link-local y IPv4 mapeada', () => {
    const v6 = ['[::1]', '[::]', '[0:0:0:0:0:0:0:1]', '[fc00::1]', '[fd12:3456:789a::1]', '[fe80::1]', '[febf::1]', '[::ffff:127.0.0.1]', '[::ffff:10.0.0.5]', '[::ffff:192.168.1.1]', '[::ffff:7f00:1]'];
    for (const h of v6) {
      expect(isPublicHttpsUrl(`https://${h}/x.jpg`), h).toBe(false);
      expect(sanitizeVideoUrl(`https://${h}/x`), h).toBe('');
    }
    // y una IPv6 pública sí
    expect(isPublicHttpsUrl('https://[2606:4700:4700::1111]/x.jpg')).toBe(true);
  });

  it('las formas alternativas de escribir 127.0.0.1 (decimal, hex, octal, abreviada) se normalizan y se rechazan', () => {
    for (const h of ['2130706433', '0x7f000001', '0x7f.1', '127.1', '0177.0.0.1', '017700000001']) {
      expect(isPublicHttpsUrl(`https://${h}/x.jpg`), h).toBe(false);
    }
  });

  it('exige https y rechaza usuario@host que disfraza el destino', () => {
    expect(isPublicHttpsUrl('http://example.com/x.jpg')).toBe(false);
    expect(isPublicHttpsUrl('ftp://example.com/x.jpg')).toBe(false);
    expect(isPublicHttpsUrl('javascript:alert(1)')).toBe(false);
    expect(isPublicHttpsUrl('https://example.com@127.0.0.1/x.jpg')).toBe(false);
    expect(isPublicHttpsUrl('https://127.0.0.1:8443@example.com/x.jpg')).toBe(true); // el host real es example.com
  });

  it('extensiones: solo imágenes (o sin extensión); nunca devuelve algo distinto a la entrada recortada', () => {
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.JPG', '']) expect(isPublicHttpsUrl(`https://cdn.example.com/a${ext}`), ext).toBe(true);
    for (const ext of ['.exe', '.php', '.svg', '.html', '.js']) expect(isPublicHttpsUrl(`https://cdn.example.com/a${ext}`), ext).toBe(false);
    for (const seed of SEEDS(800)) {
      const g = gen(seed);
      const u = `  https://cdn${g.int(1, 9)}.example.com/${g.int(1, 999)}.jpg  `;
      expect(sanitizeImageUrl(u)).toBe(u.trim());
    }
    for (const bad of [null, undefined, 42, {}, [], '', '   ']) {
      expect(isPublicHttpsUrl(bad)).toBe(false);
      expect(sanitizeImageUrl(bad)).toBe('');
      expect(sanitizeVideoUrl(bad)).toBe('');
    }
  });

  it('es consistente con la referencia para hosts generados al azar (diferencial)', () => {
    // La referencia clasifica por separado y de forma independiente.
    const refPrivate = (hostname: string): boolean => {
      let h = hostname.toLowerCase();
      if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
      h = h.replace(/\.$/, '');
      if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
      const kind = isIP(h);
      if (kind === 4) return privateV4.check(h, 'ipv4');
      if (kind === 6) {
        const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
        if (mapped) return privateV4.check(mapped[1], 'ipv4');
        const first = parseInt(h.split(':')[0] || '0', 16);
        if (/^(0:){0,7}0?$/.test(h) || h === '::' || h === '::1') return true;
        if ((first & 0xfe00) === 0xfc00) return true; // ULA
        if ((first & 0xffc0) === 0xfe80) return true; // link-local
        return false;
      }
      return false;
    };
    for (const seed of SEEDS(4000)) {
      const g = gen(seed);
      const host = g.pick([
        () => `${g.int(0, 255)}.${g.int(0, 255)}.${g.int(0, 255)}.${g.int(0, 255)}`,
        () => g.pick(['localhost', 'LocalHost.', 'x.localhost', 'api.internal', 'cdn.example.com', 'img.garcia.com.ar']),
        () => `[${g.pick(['::1', '::', 'fe80::1', 'fc00::2', '::ffff:10.1.2.3', '2001:db8::1', '2606:4700::1'])}]`,
      ])();
      const url = `https://${host}/x.jpg`;
      let parsedHost = '';
      try {
        parsedHost = new URL(url).hostname;
      } catch {
        continue;
      }
      const esperaPrivado = refPrivate(parsedHost);
      const acepta = isPublicHttpsUrl(url);
      // 2001:db8::/32 es de documentación (no privado en la referencia). Lo importante: nada privado debe pasar.
      if (esperaPrivado) expect(acepta, `aceptó el host privado ${parsedHost}`).toBe(false);
    }
  });
});

// ─────────────────────────────── CSP ───────────────────────────────
describe('CSP y headers de seguridad (propiedades)', () => {
  const parse = (csp: string) => {
    const out = new Map<string, string[]>();
    for (const part of csp.split(';').map((s) => s.trim()).filter(Boolean)) {
      const [name, ...vals] = part.split(/\s+/);
      expect(out.has(name), `directiva repetida: ${name}`).toBe(false);
      out.set(name, vals);
    }
    return out;
  };

  it('en producción no hay unsafe-eval; en desarrollo sí (HMR)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(buildCsp()).not.toContain('unsafe-eval');
    vi.stubEnv('NODE_ENV', 'development');
    expect(buildCsp()).toContain("'unsafe-eval'");
    vi.unstubAllEnvs();
  });

  it('cada fuente es una palabra clave válida o una URL https sin comodines ni duplicados', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const d = parse(buildCsp());
    for (const [name, vals] of d) {
      const seen = new Set<string>();
      for (const v of vals) {
        expect(seen.has(v), `${name}: fuente repetida ${v}`).toBe(false);
        seen.add(v);
        if (v.startsWith("'") || ['data:', 'blob:', 'https:'].includes(v)) continue;
        expect(v, `${name}: ${v}`).toMatch(/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}$/);
        expect(v).not.toContain('*');
      }
    }
    vi.unstubAllEnvs();
  });

  it('tiene las directivas que bloquean lo peligroso', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const d = parse(buildCsp());
    expect(d.get('default-src')).toEqual(["'self'"]);
    expect(d.get('object-src')).toEqual(["'none'"]);
    expect(d.get('base-uri')).toEqual(["'self'"]);
    expect(d.get('form-action')).toEqual(["'self'"]);
    for (const dir of ['script-src', 'connect-src', 'frame-src']) expect(d.get(dir)?.some((v) => v === '*' || v === 'http:'), dir).toBeFalsy();
    vi.unstubAllEnvs();
  });

  it('securityHeaders incluye todos los encabezados obligatorios con valores correctos', () => {
    const h = securityHeaders();
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(h['Strict-Transport-Security']).toMatch(/max-age=\d{8,}/);
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(h['Permissions-Policy']).toContain('camera=()');
    for (const [k, v] of Object.entries(h)) {
      expect(v, k).not.toMatch(/[\r\n]/); // sin inyección de cabeceras
      expect(v.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────── rate limit ───────────────────────────
describe('checkRate en memoria (propiedades con reloj simulado)', () => {
  beforeEach(() => {
    _resetRateLimit();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('nunca concede más de `max` pedidos por ventana, se reinicia al vencer y aísla claves', async () => {
    for (const seed of SEEDS(300)) {
      _resetRateLimit();
      const g = gen(seed);
      const max = g.int(1, 8);
      const win = g.pick([1000, 60_000, 900_000]);
      const ip = `ip-${g.int(1, 5)}`;
      let ok = 0;
      for (let i = 0; i < max + g.int(1, 6); i++) if (await checkRate(ip, 'k', max, win)) ok++;
      expect(ok).toBe(max);
      expect(await checkRate(ip, 'otra-clave', max, win)).toBe(true); // clave distinta: contador aparte
      expect(await checkRate('ip-distinta', 'k', max, win)).toBe(true); // IP distinta: contador aparte
      vi.advanceTimersByTime(win + 1);
      expect(await checkRate(ip, 'k', max, win)).toBe(true); // ventana nueva
    }
  });
});
