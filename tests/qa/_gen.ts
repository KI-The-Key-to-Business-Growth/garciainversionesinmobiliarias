// Utilidades de generación aleatoria REPRODUCIBLE para las pruebas de propiedades y diferenciales.
// Una semilla fija hace que cualquier fallo se pueda repetir exactamente.

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type G = ReturnType<typeof gen>;

export function gen(seed: number) {
  const r = rng(seed);
  const g = {
    r,
    int: (a: number, b: number) => a + Math.floor(r() * (b - a + 1)),
    bool: (p = 0.5) => r() < p,
    pick: <T,>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)],
    float: (a: number, b: number) => a + r() * (b - a),
    bytes: (n: number) => Uint8Array.from({ length: n }, () => Math.floor(r() * 256)),
    str: (max = 40) => {
      const pool = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 áéíóúñÑüÜ¿¡-_.,:;/\\?&=%+#@!$*()[]{}<>"\'`~|^\u0000\u0007\u001f\u007f​ 😀日本'.match(/[\s\S]/gu)!; // por caracteres completos: sin sustitutos sueltos que rompan encodeURIComponent
      const n = g.int(0, max);
      let s = '';
      for (let i = 0; i < n; i++) s += g.pick(pool);
      return s;
    },
    // Cadena "peligrosa" (marcado, comillas, inyección) para pruebas de escapes
    evil: () =>
      g.pick([
        '<script>alert(1)</script>',
        '"><img src=x onerror=alert(1)>',
        "'; DROP TABLE leads;--",
        '</style><script>1</script>',
        '{{7*7}}',
        '${process.env.SECRET}',
        '%00%0d%0aSet-Cookie: x=1',
        '\r\nBcc: x@evil.com',
        'a&b&amp;c&#39;d',
        '‮evil',
        'javascript:alert(1)',
        'x'.repeat(5000),
      ]),
  };
  return g;
}

export const SEEDS = (n: number, base = 1) => Array.from({ length: n }, (_, i) => base + i);
