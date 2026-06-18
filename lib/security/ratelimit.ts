// ── Rate limiter simple en memoria ───────────────────────────────────────────
// Portado de legacy/server.js:59-73. NOTA: en serverless el estado es por-instancia
// (misma limitación que el server.js original). Futuro: migrar a KV/Upstash.

type RateRecord = { n: number; until: number };

const _rlMap = new Map<string, RateRecord>();

export function checkRate(ip: string, key: string, max = 10, windowMs = 60_000): boolean {
  const id = `${ip}:${key}`;
  const now = Date.now();
  const rec = _rlMap.get(id) || { n: 0, until: now + windowMs };
  if (now > rec.until) {
    rec.n = 0;
    rec.until = now + windowMs;
  }
  rec.n++;
  _rlMap.set(id, rec);
  return rec.n <= max;
}

// Limpieza de entradas expiradas — sólo en runtime Node de larga vida.
// (En edge/serverless cada invocación es efímera; el GC del Map ocurre solo.)
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of _rlMap) {
      if (now > v.until) _rlMap.delete(k);
    }
  }, 600_000);
  // No mantener vivo el proceso sólo por este timer.
  if (typeof timer === 'object' && timer && 'unref' in timer) {
    (timer as { unref: () => void }).unref();
  }
}

// Sólo para tests: resetea el estado interno entre casos.
export function _resetRateLimit(): void {
  _rlMap.clear();
}
