import React from 'react';
import Link from 'next/link';
import LocationPicker from '@/components/properties/LocationPicker';
import {
  BEDROOM_ROOM_FILTER_OPTIONS,
  removeFilterHref,
  type ListingLocationOption,
  type ListingOperationFilter,
  type PriceFacet,
  type PropertyListingFilters,
  type RemovableFilterKey,
  type ResolvedPriceFilter,
} from '@/lib/2clics/listings';
import type { TwoclicsPropertyType } from '@/lib/2clics/types';

function formatChipPrice(currency: string, min: number, max: number): string {
  const format = (value: number) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(value);
  return `${currency} ${format(min)} – ${format(max)}`.trim();
}

type PropertyFiltersProps = {
  filters: PropertyListingFilters;
  propertyTypes: TwoclicsPropertyType[];
  availableLocations: ListingLocationOption[];
  availableOperations: ListingOperationFilter[];
  priceFacet: PriceFacet;
  resolvedPrice: ResolvedPriceFilter;
  // WEB GARCÍA V2 (/comprar, /alquilar) — ambos opcionales, sin valor por defecto se comportan
  // EXACTAMENTE como hasta ahora (/propiedades no pasa ninguno de los dos).
  // `actionPath`: a dónde postea el form GET — /comprar y /alquilar necesitan quedarse en su
  // propia URL en vez de terminar siempre en /propiedades.
  // `lockedOperation`: cuando se pasa, oculta el <select> de Operación (queda implícita por la
  // página) y la manda como campo oculto — evita un control que, si el usuario lo cambiara,
  // igual no tendría efecto (la operación real se fuerza server-side en /comprar y /alquilar).
  actionPath?: string;
  lockedOperation?: 'venta' | 'alquiler';
};

const OPERATION_LABELS: Record<ListingOperationFilter, string> = {
  all: 'Todas',
  venta: 'Venta',
  alquiler: 'Alquiler',
  temporario: 'Alquiler temporario',
};

const LOCATION_KIND_LABELS: Record<ListingLocationOption['kind'], string> = {
  state: 'Mercado',
  city: 'Ciudad / localidad',
  neighborhood: 'Barrio',
};

function uniquePropertyTypes(types: TwoclicsPropertyType[]): TwoclicsPropertyType[] {
  const seen = new Set<number | string>();
  return types.filter((type) => {
    const key = type.typeId ?? type.appId ?? type.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Precio se ve y se completa SIEMPRE — Moneda/Desde/Hasta visibles desde el primer render, incluso
// con Operación="Todas" o con una faceta vacía — para que Operación+Precio se apliquen juntos en
// un solo submit (pasada UX 2026-08-24) y para que el usuario NUNCA pierda lo que ya escribió
// (bug real confirmado 2026-08-26: una combinación como Ubicación=Estados Unidos +
// Operación=Alquiler, que hoy no tiene ningún Alquiler en ese mercado, dejaba la faceta vacía y
// el bloque entero se reemplazaba por "Sin datos de precio", perdiendo moneda/rango ya escritos —
// searchParams/raw filters son la fuente del estado visual, la faceta solo informa monedas
// válidas/mínimos/máximos reales/placeholders, nunca debe borrar un filtro activo). La
// arquitectura de fondo no cambió: sigue sin permitir un rango ambiguo (Venta+Alquiler o U$D+AR$
// mezclados) — `resolvePriceFilter`/`priceApiFilters` deciden qué es seguro mandar a 2Clics; acá
// solo se decide qué mostrar y qué mensaje agregar.
type PriceMessage = { text: string; tone: 'error' | 'hint' };

function priceValidationMessage(resolvedPrice: ResolvedPriceFilter): PriceMessage | null {
  if (resolvedPrice.status === 'invalid-range') {
    return { text: 'El precio mínimo no puede ser mayor que el máximo.', tone: 'error' };
  }

  if (resolvedPrice.status === 'empty-facet') {
    const hasRawValue =
      Boolean(resolvedPrice.rawCurrency) || resolvedPrice.rawMin !== null || resolvedPrice.rawMax !== null;
    // Solo se muestra si NO hay nada que preservar — con un filtro activo, el control editable ya
    // comunica todo lo necesario, y el catálogo (0 resultados) explica el resto.
    return hasRawValue ? null : { text: 'No hay datos de precio para esta combinación de filtros.', tone: 'hint' };
  }

  const hasRangeAttempt =
    (resolvedPrice.status === 'no-operation' || resolvedPrice.status === 'needs-currency') &&
    (resolvedPrice.rawMin !== null || resolvedPrice.rawMax !== null);
  if (!hasRangeAttempt) return null;
  return {
    text:
      resolvedPrice.status === 'no-operation'
        ? 'Elegí Venta o Alquiler para filtrar por precio.'
        : 'Elegí una moneda para filtrar alquileres por precio.',
    tone: 'error',
  };
}

function PriceFilterGroup({
  priceFacet,
  resolvedPrice,
}: {
  priceFacet: PriceFacet;
  resolvedPrice: ResolvedPriceFilter;
}) {
  const isResolved = resolvedPrice.status === 'ready' || resolvedPrice.status === 'invalid-range';
  const currencyLabel = isResolved ? ` · ${resolvedPrice.currency}` : '';
  const currencyOptions =
    resolvedPrice.status === 'no-operation' || resolvedPrice.status === 'needs-currency'
      ? resolvedPrice.currencies
      : isResolved
        ? priceFacet.currencies
        : [];
  const selectedCurrency = isResolved
    ? resolvedPrice.currency
    : resolvedPrice.status === 'no-operation' || resolvedPrice.status === 'empty-facet'
      ? resolvedPrice.rawCurrency
      : '';
  // Nunca dejar que el <select> mienta: si la moneda activa no está entre las opciones derivadas
  // de la faceta (ej. faceta vacía, o una URL manual con una moneda que la faceta actual no
  // reconoce), se agrega igual como opción — de lo contrario el navegador cae al primer <option>
  // ("Automática") aunque el filtro real siga siendo la moneda elegida (mismo bug de fondo que
  // "Ubicación" con `locationFacetRequest`, confirmado 2026-08-26).
  const renderedCurrencyOptions =
    selectedCurrency && !currencyOptions.includes(selectedCurrency)
      ? [selectedCurrency, ...currencyOptions]
      : currencyOptions;
  // Sin operación/moneda/faceta resuelta no hay un único rango real de referencia — placeholder
  // neutral en vez de inventar un mínimo/máximo (nunca combinar escalas de Venta y Alquiler, ni
  // mostrar el rango de una moneda que todavía no es la elegida).
  const minPlaceholder = isResolved ? String(resolvedPrice.facetRange.min) : 'Desde';
  const maxPlaceholder = isResolved ? String(resolvedPrice.facetRange.max) : 'Hasta';
  const message = priceValidationMessage(resolvedPrice);

  return (
    <fieldset className="twoclics-filter-group twoclics-filter-group--price">
      <legend>{`Precio${currencyLabel}`}</legend>

      <div className="twoclics-filter-price-controls">
        <div className="twoclics-filter-price-currency">
          <label htmlFor="moneda">Moneda</label>
          <select id="moneda" name="moneda" defaultValue={selectedCurrency}>
            <option value="">Automática</option>
            {renderedCurrencyOptions.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>

        <div className="twoclics-filter-price-range">
          <div>
            <label htmlFor="precioMin">Desde</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              id="precioMin"
              name="precioMin"
              placeholder={minPlaceholder}
              defaultValue={resolvedPrice.rawMin ?? ''}
            />
          </div>
          <div>
            <label htmlFor="precioMax">Hasta</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              id="precioMax"
              name="precioMax"
              placeholder={maxPlaceholder}
              defaultValue={resolvedPrice.rawMax ?? ''}
            />
          </div>
        </div>
      </div>

      {message ? (
        <p
          className={message.tone === 'error' ? 'twoclics-filter-price-error' : 'twoclics-filter-price-hint'}
          role={message.tone === 'error' ? 'alert' : undefined}
        >
          {message.text}
        </p>
      ) : null}
    </fieldset>
  );
}

// Dormitorios/Ambientes — grupo de radios reales presentados como pills ("segmented control").
// Reemplaza el <select> nativo (Fase 2): en mobile, un <select> con solo 5 opciones cortas igual
// dispara el picker nativo del navegador/SO a pantalla completa, algo que no se puede achicar de
// forma confiable con CSS porque ese chrome no es del documento. Radios reales (ocultos solo
// visualmente, nunca con display:none) + <label> como superficie clickeable: mismo <form> GET, sin
// JS, con navegación por Tab/flechas de radiogroup nativa del navegador y foco visible real.
// "Todos" es un radio más con value="" — reutiliza la misma semántica que ya tenía la opción vacía
// del <select> (parsePropertyListingFilters ya trata "" como ausencia de filtro).
function SegmentedFilterGroup({
  legend,
  name,
  idPrefix,
  value,
}: {
  legend: string;
  name: string;
  idPrefix: string;
  value: number | null;
}) {
  return (
    <fieldset className="twoclics-filter-group twoclics-filter-group--segmented">
      <legend>{legend}</legend>
      <div className="twoclics-segmented" role="radiogroup" aria-label={legend}>
        <input
          type="radio"
          className="twoclics-segmented-input"
          id={`${idPrefix}-todos`}
          name={name}
          value=""
          defaultChecked={value === null}
        />
        <label className="twoclics-segmented-label" htmlFor={`${idPrefix}-todos`}>
          Todos
        </label>
        {BEDROOM_ROOM_FILTER_OPTIONS.map((n) => (
          <React.Fragment key={n}>
            <input
              type="radio"
              className="twoclics-segmented-input"
              id={`${idPrefix}-${n}`}
              name={name}
              value={n}
              defaultChecked={value === n}
            />
            <label className="twoclics-segmented-label" htmlFor={`${idPrefix}-${n}`}>
              {n}
            </label>
          </React.Fragment>
        ))}
      </div>
    </fieldset>
  );
}

// Apto crédito (Fase 2, sin cambios) + Dormitorios/Ambientes (Fase 2, actualizado a segmented
// control más arriba). <details>/<summary> nativo: sin Client Component, sin JS, sin drawer —
// colapsado por defecto y abierto solo cuando el GET que llegó ya trae alguno de los tres activo
// (para que el usuario vea el filtro aplicado sin tener que reabrir el bloque a mano).
function MoreFiltersSection({ filters }: { filters: PropertyListingFilters }) {
  const hasSecondaryFilters =
    filters.bedrooms !== null || filters.rooms !== null || filters.aptoCredito;

  return (
    <details className="twoclics-filter-more" open={hasSecondaryFilters || undefined}>
      <summary>Más filtros</summary>
      <div className="twoclics-filter-more-grid">
        <SegmentedFilterGroup
          legend="Dormitorios"
          name="dormitorios"
          idPrefix="dormitorios"
          value={filters.bedrooms}
        />

        <SegmentedFilterGroup
          legend="Ambientes"
          name="ambientes"
          idPrefix="ambientes"
          value={filters.rooms}
        />

        <div className="twoclics-filter-group twoclics-filter-group--checkbox">
          {/* Spacer del mismo alto que el <legend> de Dormitorios/Ambientes — sin esto, Apto
              crédito (que no tiene legend propio) queda desalineado respecto de la fila de
              controles de los otros dos grupos. */}
          <span className="twoclics-filter-checkbox-spacer" aria-hidden="true" />
          <label htmlFor="aptoCredito">
            <input
              type="checkbox"
              id="aptoCredito"
              name="aptoCredito"
              value="1"
              defaultChecked={filters.aptoCredito}
            />
            Apto crédito
          </label>
        </div>
      </div>
    </details>
  );
}

export default function PropertyFilters({
  filters,
  propertyTypes,
  availableLocations,
  availableOperations,
  priceFacet,
  resolvedPrice,
  actionPath = '/propiedades',
  lockedOperation,
}: PropertyFiltersProps) {
  const operations = new Set<ListingOperationFilter>(['all', 'venta', 'alquiler']);
  for (const operation of availableOperations) operations.add(operation);
  if (filters.operation === 'temporario') operations.add('temporario');
  const hasActiveFilters =
    filters.location !== 'all' ||
    (!lockedOperation && filters.operation !== 'all') ||
    filters.propertyTypeId !== null ||
    filters.bedrooms !== null ||
    filters.rooms !== null ||
    filters.aptoCredito ||
    Boolean(filters.price.currency) ||
    filters.price.min !== null ||
    filters.price.max !== null;

  // Nunca dejar que el <select> mienta: un <select> solo puede reflejar como seleccionado un
  // value que exista entre sus <option> — si la ubicación activa no está en `availableLocations`
  // (ej. una URL manual con un id de ubicación inexistente/desactualizado), el navegador cae
  // silenciosamente al primer <option> ("Todas") aunque el filtro real siga siendo el otro. Se
  // agrega una <option> de respaldo en ese caso puntual (bug real de fondo ya corregido en
  // `locationFacetRequest`, que ahora siempre expone el universo completo de ubicaciones — esto es
  // una segunda barrera defensiva, mismo criterio que ya se aplica a Moneda en Precio).
  const hasCurrentLocationOption =
    filters.location === 'all' || availableLocations.some((option) => option.value === filters.location);

  // Mismo criterio defensivo que Ubicación: `propertyTypes` ahora sale del inventario público
  // REAL (2026-08-27, `buildAvailablePropertyTypes` en lib/2clics/listings.ts) en vez del catálogo
  // general de la cuenta — un tipo puede dejar de tener propiedades publicadas de un día para el
  // otro. Si la URL trae un `?tipo=` que ya no está entre los tipos con inventario público, el
  // <select> no puede reflejarlo como seleccionado (no hay <option> con ese value) y el navegador
  // caería silenciosamente en "Todos" aunque el filtro real siga activo. Se agrega una <option> de
  // respaldo para ese caso puntual — la URL sigue siendo la fuente de verdad.
  const currentPropertyTypeId = filters.propertyTypeId != null ? String(filters.propertyTypeId) : '';
  const hasCurrentPropertyTypeOption =
    !currentPropertyTypeId || propertyTypes.some((type) => String(type.typeId) === currentPropertyTypeId);

  // Bug real confirmado 2026-08-26: "Limpiar filtros" navega a /propiedades vía un <Link> de
  // Next.js — una navegación CLIENTE (soft nav), a diferencia de "Aplicar filtros" (submit nativo
  // de un <form method="get">, que siempre recarga el documento entero). En una soft nav, React
  // reconcilia el <form> como "el mismo" elemento (misma posición/tipo en el árbol) y reutiliza su
  // DOM — pero `defaultValue`/`defaultChecked` solo se aplican en el MONTAJE inicial, nunca de
  // nuevo en un re-render. Resultado: los <select>/radios/checkbox no controlados (Ubicación,
  // Operación, Tipo, Moneda, Desde, Hasta, Dormitorios, Ambientes, Apto crédito) quedaban
  // mostrando visualmente el valor de la búsqueda anterior aunque los resultados/contador/URL ya
  // reflejaran correctamente el estado limpio — la fuente de verdad (searchParams → filters)
  // siempre fue correcta, era la reconciliación de React la que no se enteraba. La solución más
  // simple y menos invasiva dentro de la arquitectura sin JS: una `key` derivada de los valores
  // de `filters` en el <form> — cuando la key cambia, React desmonta y vuelve a montar TODO el
  // subárbol del form en vez de reutilizarlo, así que `defaultValue`/`defaultChecked` se vuelven a
  // aplicar frescos con los valores nuevos. Sin useState, sin Client Component, sin borrar campos
  // a mano — la ausencia de searchParams ya alcanza para reconstruir el formulario inicial.
  const formKey = [
    filters.location,
    filters.operation,
    filters.propertyTypeId ?? '',
    filters.bedrooms ?? '',
    filters.rooms ?? '',
    filters.aptoCredito ? '1' : '0',
    filters.price.currency,
    filters.price.min ?? '',
    filters.price.max ?? '',
  ].join('|');

  // WEB GARCÍA V2 (Comprar/Alquilar, sexta pasada) — cuando `lockedOperation` está activo, el
  // <select> de Operación no se renderiza (no solo se oculta), así que el grid de 5 columnas
  // pensado para Ubicación/Operación/Tipo/Precio/Acciones (`.twoclics-filters`, 3×1fr + 1.7fr +
  // auto) recibía un ítem menos y el auto-placement de CSS Grid corría Precio a la 3ª columna
  // (1fr, angosta) y Acciones a la 4ª (1.7fr, dejando el botón estirado en una columna pensada
  // para Precio) — el bug real detrás de "Precio se ve fragmentado"/"Aplicar filtros con
  // demasiado protagonismo" reportado en la revisión visual. Este modifier redefine el grid a 4
  // columnas (2×1fr + 1.7fr + auto) solo cuando corresponde — /propiedades (sin lockedOperation)
  // no la recibe y no cambia.
  const filtersClassName = lockedOperation ? 'twoclics-filters twoclics-filters--locked' : 'twoclics-filters';
  // WEB GARCÍA V2 (Comprar/Alquilar, séptima pasada) — el LocationPicker (popover accesible,
  // agrupado por mercado) reemplaza al <select> nativo SOLO acá. `/propiedades` (sin
  // lockedOperation) sigue con el <select> nativo tal cual, sin ningún cambio — pedido explícito
  // de no introducir regresión visual en el catálogo maestro. Mismo `name="ubicacion"` en ambos
  // casos: el contrato de searchParams que recibe `getPropertyCatalog` no cambia.
  const isMarketPage = Boolean(lockedOperation);

  // Filtros activos (Comprar/Alquilar, sección 15 del pedido) — chips informativos que también
  // remueven ESE filtro puntual vía una navegación GET real a `removeFilterHref` (mismo
  // searchParams, sin JS, sin segundo estado). No incluye Operación (forzada, no removible).
  const activeChips: Array<{ key: RemovableFilterKey; label: string }> = [];
  if (isMarketPage) {
    if (filters.location !== 'all') {
      const match = availableLocations.find((option) => option.value === filters.location);
      activeChips.push({ key: 'ubicacion', label: match?.shortLabel || 'Ubicación seleccionada' });
    }
    if (filters.propertyTypeId) {
      const match = propertyTypes.find((type) => type.typeId === filters.propertyTypeId);
      activeChips.push({ key: 'tipo', label: match?.name || 'Tipo seleccionado' });
    }
    if (resolvedPrice.status === 'ready' && resolvedPrice.appliedMin !== null && resolvedPrice.appliedMax !== null) {
      activeChips.push({
        key: 'precio',
        label: formatChipPrice(resolvedPrice.currency, resolvedPrice.appliedMin, resolvedPrice.appliedMax),
      });
    }
    if (filters.bedrooms !== null) {
      activeChips.push({ key: 'dormitorios', label: `${filters.bedrooms} dormitorio${filters.bedrooms === 1 ? '' : 's'}` });
    }
    if (filters.rooms !== null) {
      activeChips.push({ key: 'ambientes', label: `${filters.rooms} ambiente${filters.rooms === 1 ? '' : 's'}` });
    }
    if (filters.aptoCredito) {
      activeChips.push({ key: 'aptoCredito', label: 'Apto crédito' });
    }
  }

  return (
    <>
    <form key={formKey} className={filtersClassName} action={actionPath}>
      <input type="hidden" name="limit" value={filters.limit} />
      {lockedOperation ? <input type="hidden" name="operacion" value={lockedOperation} /> : null}
      {isMarketPage ? (
        <div className="twoclics-filter-group twoclics-filter-group--location">
          <LocationPicker name="ubicacion" options={availableLocations} defaultValue={filters.location} />
        </div>
      ) : (
        <div className="twoclics-filter-group twoclics-filter-group--location">
          <label htmlFor="ubicacion">Ubicación</label>
          <select id="ubicacion" name="ubicacion" defaultValue={filters.location}>
            <option value="all">Todas</option>
            {!hasCurrentLocationOption ? (
              <option value={filters.location}>Ubicación seleccionada</option>
            ) : null}
            {(['state', 'city', 'neighborhood'] as const).map((kind) => {
              const options = availableLocations.filter((option) => option.kind === kind);
              if (!options.length) return null;
              return (
                <optgroup key={kind} label={LOCATION_KIND_LABELS[kind]}>
                  {options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
      )}

      {!lockedOperation ? (
        <div className="twoclics-filter-group">
          <label htmlFor="operacion">Operación</label>
          <select id="operacion" name="operacion" defaultValue={filters.operation}>
            {Array.from(operations).map((operation) => (
              <option key={operation} value={operation}>
                {OPERATION_LABELS[operation]}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="twoclics-filter-group">
        <label htmlFor="tipo">Tipo de propiedad</label>
        <select id="tipo" name="tipo" defaultValue={filters.propertyTypeId || ''}>
          <option value="">Todos</option>
          {!hasCurrentPropertyTypeOption ? (
            <option value={currentPropertyTypeId}>Tipo seleccionado</option>
          ) : null}
          {uniquePropertyTypes(propertyTypes).map((type) =>
            type.typeId ? (
              <option key={type.typeId} value={type.typeId}>
                {type.name || `Tipo ${type.typeId}`}
              </option>
            ) : null,
          )}
        </select>
      </div>

      <PriceFilterGroup priceFacet={priceFacet} resolvedPrice={resolvedPrice} />

      <MoreFiltersSection filters={filters} />

      <div className="twoclics-filter-actions">
        {/* Comprar/Alquilar (isMarketPage): CTA principal reutiliza .btn-primary (gold/navy, mismo
            botón ya aprobado en Hero/CTAs del sitio) con copy "Buscar propiedades" — más cercano a
            una acción de búsqueda que a un formulario. /propiedades mantiene "Aplicar filtros" en
            navy (.btn-dark) sin cambios. */}
        <button className={isMarketPage ? 'btn btn-primary' : 'btn btn-dark'} type="submit">
          {isMarketPage ? 'Buscar propiedades' : 'Aplicar filtros'}
        </button>
        {hasActiveFilters ? (
          <Link className="twoclics-filters-clear" href={actionPath}>
            Limpiar filtros
          </Link>
        ) : null}
      </div>
    </form>

    {activeChips.length ? (
      <ul className="twoclics-active-filters" aria-label="Filtros activos">
        {activeChips.map((chip) => (
          <li key={chip.key}>
            <Link className="twoclics-active-filter-chip" href={removeFilterHref(filters, actionPath, chip.key)}>
              {chip.label}
              <span aria-hidden="true">×</span>
              <span className="sr-only">Quitar filtro</span>
            </Link>
          </li>
        ))}
      </ul>
    ) : null}
    </>
  );
}
