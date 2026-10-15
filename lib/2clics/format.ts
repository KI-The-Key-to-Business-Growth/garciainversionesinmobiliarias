import type {
  PublicDevelopment,
  PublicDevelopmentUnit,
  PublicLocation,
  PublicProperty,
  TwoclicsOperationType,
  TwoclicsRegion,
} from '@/lib/2clics/types';

const PUBLIC_LOCATION_SEPARATOR = ` ${String.fromCharCode(0x00b7)} `;

export function compactText(parts: Array<string | null | undefined>, separator = PUBLIC_LOCATION_SEPARATOR): string {
  return parts.map((part) => String(part || '').trim()).filter(Boolean).join(separator);
}

function normalizeComparableText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function uniqueLocationParts(parts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const part of parts) {
    const clean = String(part || '').trim();
    const key = normalizeComparableText(clean);
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    unique.push(clean);
  }

  return unique;
}

export function formatLocation(location: PublicLocation): string {
  return compactText(
    uniqueLocationParts([location.neighborhood?.name, location.city?.name, location.state?.name]),
    PUBLIC_LOCATION_SEPARATOR,
  );
}

export function formatPublicLocation(
  location: PublicLocation,
  region: TwoclicsRegion,
): string {
  if (region === 'AR') {
    return compactText(
      uniqueLocationParts([location.neighborhood?.name, location.city?.name, 'Argentina']),
      PUBLIC_LOCATION_SEPARATOR,
    );
  }

  return compactText(
    uniqueLocationParts([location.neighborhood?.name, location.city?.name, location.state?.name]),
    PUBLIC_LOCATION_SEPARATOR,
  );
}

export function formatLocationMarketLabel(location: PublicLocation): string {
  const state = location.state?.name || '';
  const city = location.city?.name || '';
  const neighborhood = location.neighborhood?.name || '';
  const normalizedState = normalizeComparableText(state);

  if (normalizedState === 'estados unidos' || normalizedState === 'argentina') {
    return neighborhood || city || state;
  }

  return state || city || neighborhood;
}

export function formatOperation(operationType: TwoclicsOperationType | string): string {
  const normalized = String(operationType || '').trim().toUpperCase();
  const labels: Record<string, string> = {
    VENTA: 'Venta',
    ALQUILER: 'Alquiler',
    ALQUILER_PERMANENTE: 'Alquiler',
    ALQUILER_TEMPORARIO: 'Alquiler temporario',
  };
  if (labels[normalized]) return labels[normalized];
  return normalized
    ? normalized
        .toLowerCase()
        .split('_')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : '';
}

export function operationFilterToApi(value: string): TwoclicsOperationType | undefined {
  const map: Record<string, TwoclicsOperationType> = {
    venta: 'VENTA',
    alquiler: 'ALQUILER_PERMANENTE',
    temporario: 'ALQUILER_TEMPORARIO',
  };
  return map[value];
}

export function formatPrice(
  price: number | null,
  currency: string,
  hidePrice = false,
): string {
  if (hidePrice) return 'Consultar precio';
  if (price === null || !Number.isFinite(price)) return '';
  const formatted = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(price);
  return compactText([currency, formatted], ' ');
}

export function formatMetadataMoney(value: string | undefined, currency: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const numeric = Number(raw);
  const formatted = Number.isFinite(numeric)
    ? new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(numeric)
    : raw;
  return compactText([currency, formatted], ' ');
}

// Expensas en cero no es una señal de "sin expensas": 2Clics no distingue ese caso de un dato
// no cargado, así que se omite el campo en vez de afirmar algo que no podemos confirmar.
// Específico de expensas — no generalizar a otros montos (precio, superficie, etc.).
export function isZeroExpensesValue(value: string | undefined): boolean {
  const raw = String(value || '').trim();
  if (!raw) return false;
  const numeric = Number(raw.replace(',', '.'));
  return Number.isFinite(numeric) && numeric === 0;
}

export function formatExpenses(value: string | undefined, currency: string): string {
  if (isZeroExpensesValue(value)) return '';
  return formatMetadataMoney(value, currency);
}

// OVERRIDE EXPLÍCITO de moneda de expensas (2026-10-15) — 2Clics no expone `expenses_currency`
// para estos registros; García confirmó que sus expensas (AR$ 490.000) están en pesos. Solo
// corrige la MONEDA de presentación: el monto sigue saliendo de 2Clics. Si 2Clics empieza a
// devolver `expenses_currency` para estos ids, la fuente tiene prioridad y la entrada puede
// borrarse. No hay inferencia por país ni herencia de la moneda del precio (antes Remeros se
// mostraba como "U$D 490.000").
const EXPENSES_CURRENCY_OVERRIDES: Record<number, string> = {
  237445: 'AR$', // Remeros Beach Sky 2 — alquiler
  237447: 'AR$', // Remeros Beach Sky 2 — venta
};

export function resolveExpensesCurrency(
  expensesCurrency: string | undefined,
  propertyId: number | null,
): string {
  const explicit = String(expensesCurrency || '').trim();
  if (explicit) return explicit;
  return (propertyId !== null && EXPENSES_CURRENCY_OVERRIDES[propertyId]) || '';
}

// Sin moneda confirmada (fuente u override) las expensas no se publican: un monto sin moneda
// sería ambiguo.
export function formatPropertyExpenses(
  value: string | undefined,
  expensesCurrency: string | undefined,
  propertyId: number | null,
): string {
  const currency = resolveExpensesCurrency(expensesCurrency, propertyId);
  return currency ? formatExpenses(value, currency) : '';
}

// Solo los registros ACTIVOS de 2Clics son públicos. Un registro sin `status` (fixtures, payloads
// parciales) no se descarta: la fuente de verdad sigue siendo lo que la API decide devolver.
export function isPublicPropertyStatus(status: string | null | undefined): boolean {
  const normalized = String(status || '').trim().toUpperCase();
  return !normalized || normalized === 'ACTIVE';
}

const NON_PUBLIC_DETAIL_VALUES = new Set([
  '-',
  '--',
  '---',
  'n/a',
  'na',
  'none',
  'null',
  'other',
  'undefined',
  'sin especificar',
  'sin informacion',
  'sin información',
]);

export function formatPublicDetailValue(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  const clean = String(value).trim();
  if (!clean) return '';
  const normalized = normalizeComparableText(clean);
  if (NON_PUBLIC_DETAIL_VALUES.has(normalized)) return '';
  return clean;
}

const PRESERVE_CASE_VALUES = new Set(['AR$', 'ARS', 'CABA', 'EE.UU.', 'U$D', 'USD']);

function sentenceCase(value: string): string {
  const lower = value.toLocaleLowerCase('es-AR');
  return lower.replace(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/, (char) => char.toLocaleUpperCase('es-AR'));
}

export function formatPublicDisplayValue(
  value: string | number | boolean | null | undefined,
): string {
  const clean = formatPublicDetailValue(value);
  if (!clean) return '';

  const upper = clean.toLocaleUpperCase('es-AR');
  if (PRESERVE_CASE_VALUES.has(upper)) return clean;
  if (/[0-9$]/.test(clean)) return clean;
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(clean)) return clean;
  if (/^[A-ZÁÉÍÓÚÜÑ\s/.-]+$/.test(clean)) return sentenceCase(clean);

  return clean;
}

export function formatArea(value: number | null): string {
  if (value === null || !Number.isFinite(value) || value <= 0) return '';
  return `${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(value)} m²`;
}

export function numberValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

// Compartido entre la ficha (Información básica/franja esencial) y las cards del catálogo — un
// valor <= 0 no es un dato real publicable (mismo criterio que el resto del catálogo: no mostrar
// "0 dorm."/"0 baños"/"0 cocheras"/"0 amb." cuando el cero representa ausencia/no aplicación).
export function formatCount(
  value: string | number | null | undefined,
  singular: string,
  plural: string,
): string {
  const parsed = numberValue(value);
  if (parsed === null || parsed <= 0) return '';
  const formatted = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(parsed);
  return `${formatted} ${parsed === 1 ? singular : plural}`;
}

// Terreno/Lote y Oficina no deben tratarse como vivienda estándar (ficha: `isLandType`/
// `isOfficeType`; cards: mismo criterio, ver `docs/ai/PROPERTY_UX_DECISIONS.md`). Clasifica por
// nombre público del tipo (no por typeId interno de 2Clics) para no depender de IDs que puedan
// cambiar entre cuentas/regiones.
export function isLandPropertyType(typeName: string | undefined): boolean {
  const normalized = normalizeComparableText(typeName);
  return normalized.includes('terreno') || normalized.includes('lote');
}

export function isOfficePropertyType(typeName: string | undefined): boolean {
  return normalizeComparableText(typeName).includes('oficina');
}

export function propertyHref(property: PublicProperty): string {
  return property.propertyId ? `/propiedades/${property.propertyId}` : '/propiedades';
}

export function developmentHref(development: PublicDevelopment): string {
  return development.developmentId ? `/desarrollos/${development.developmentId}` : '/propiedades';
}

export function developmentUnitHref(unit: PublicDevelopmentUnit): string {
  return unit.propertyId ? `/propiedades/${encodeURIComponent(unit.propertyId)}` : '/propiedades';
}

export function marketPublicLabel(region: PublicProperty['region'] | PublicDevelopment['region']): string {
  return region === 'US' ? 'Estados Unidos / Miami' : 'Argentina / Buenos Aires';
}
