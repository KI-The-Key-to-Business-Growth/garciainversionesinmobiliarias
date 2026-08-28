'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ListingLocationOption } from '@/lib/2clics/listings';

type LocationPickerProps = {
  name: string;
  options: ListingLocationOption[];
  defaultValue: string;
};

// Mismo par mercado→nombre público ya usado en Footer.tsx/Trayectoria.tsx ("Argentina/Buenos
// Aires", "Estados Unidos/Miami") — no es un dato nuevo derivado de 2Clics, es el nombre
// comercial fijo de los dos únicos mercados de García. Lo que SÍ es 100% dinámico (nunca
// hardcodeado) son las ubicaciones concretas listadas debajo de cada mercado — ver `groupOptions`.
const MARKET_LABELS: Record<ListingLocationOption['region'], string> = {
  AR: 'Buenos Aires',
  US: 'Miami',
};

const MARKET_ORDER: ListingLocationOption['region'][] = ['AR', 'US'];

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export type LocationGroup = {
  region: ListingLocationOption['region'];
  marketLabel: string;
  options: ListingLocationOption[];
};

// Agrupa por mercado (AR/US) y muestra solo ciudad/barrio — el nivel "state" (Mercado técnico,
// ej. "Argentina"/"Bs.As. G.B.A. Norte") ya está representado por el propio encabezado de grupo,
// mostrarlo también como opción sería repetir la estructura técnica que esta UI reemplaza. 100%
// derivado de `options` (las location facets reales ya resueltas server-side) — nunca una lista
// fija de barrios/localidades.
export function groupOptions(options: ListingLocationOption[]): LocationGroup[] {
  const byRegion = new Map<ListingLocationOption['region'], ListingLocationOption[]>();
  for (const option of options) {
    if (option.kind === 'state') continue;
    const list = byRegion.get(option.region) || [];
    list.push(option);
    byRegion.set(option.region, list);
  }
  return MARKET_ORDER.filter((region) => byRegion.has(region)).map((region) => ({
    region,
    marketLabel: MARKET_LABELS[region],
    options: (byRegion.get(region) || [])
      .slice()
      .sort((a, b) => normalize(a.shortLabel).localeCompare(normalize(b.shortLabel))),
  }));
}

export default function LocationPicker({ name, options, defaultValue }: LocationPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();
  const listboxId = `${baseId}-listbox`;

  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  // Resuelve el label visible para CUALQUIER value técnico ya activo (incluido "state:" o un id
  // que ya no exista entre las facets reales) — el picker interactivo solo ofrece ciudad/barrio,
  // pero el trigger cerrado debe poder mostrar algo razonable para cualquier filtro ya aplicado
  // (ej. llegado por URL manual), sin depender de que ese value esté en la lista clickeable.
  const labelByValue = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of options) map.set(option.value, option.shortLabel);
    return map;
  }, [options]);

  const groups = useMemo(() => groupOptions(options), [options]);

  const normalizedQuery = normalize(query);
  const filteredGroups = useMemo(() => {
    if (!normalizedQuery) return groups;
    return groups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => normalize(option.shortLabel).includes(normalizedQuery)),
      }))
      .filter((group) => group.options.length > 0);
  }, [groups, normalizedQuery]);

  // Lista plana en el mismo orden visual — "Todas las ubicaciones" siempre primero — para que
  // ArrowUp/ArrowDown/Enter naveguen con un único índice sin importar de qué grupo viene cada ítem.
  const flatOptions = useMemo(
    () => [
      { value: 'all', shortLabel: 'Todas las ubicaciones' },
      ...filteredGroups.flatMap((group) => group.options),
    ],
    [filteredGroups],
  );

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      searchRef.current?.focus();
    } else {
      setQuery('');
    }
  }, [open]);

  function selectValue(nextValue: string) {
    setValue(nextValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (flatOptions.length ? (index + 1) % flatOptions.length : 0));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (flatOptions.length ? (index - 1 + flatOptions.length) % flatOptions.length : 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const active = flatOptions[activeIndex];
      if (active) selectValue(active.value);
    }
  }

  // Enter/Espacio ya abren vía el onClick nativo del <button> (comportamiento de activación
  // estándar) — acá solo hace falta ArrowDown, que no es una tecla de activación nativa.
  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' && !open) {
      event.preventDefault();
      setOpen(true);
    }
  }

  const triggerLabel = value === 'all' ? 'Todas las ubicaciones' : labelByValue.get(value) || 'Ubicación seleccionada';
  const activeValue = flatOptions[activeIndex]?.value;

  return (
    <div className="location-picker" ref={rootRef}>
      <label htmlFor={`${baseId}-trigger`}>Ubicación</label>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        id={`${baseId}-trigger`}
        ref={triggerRef}
        className="location-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((isOpen) => !isOpen)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="location-picker-trigger-label">{triggerLabel}</span>
        <span className="location-picker-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div className="location-picker-popover">
          <input
            ref={searchRef}
            type="text"
            className="location-picker-search"
            placeholder="Buscar ubicación…"
            aria-label="Buscar ubicación"
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={activeValue ? `${baseId}-opt-${activeValue}` : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
          <ul className="location-picker-listbox" role="listbox" id={listboxId} aria-label="Ubicación">
            <li
              id={`${baseId}-opt-all`}
              role="option"
              aria-selected={value === 'all'}
              className={`location-picker-option${activeValue === 'all' ? ' is-active' : ''}${value === 'all' ? ' is-selected' : ''}`}
              onMouseEnter={() => setActiveIndex(0)}
              onClick={() => selectValue('all')}
            >
              Todas las ubicaciones
            </li>
            {filteredGroups.map((group) => (
              <li key={group.region} role="presentation" className="location-picker-group">
                <span className="location-picker-group-label" aria-hidden="true">
                  {group.marketLabel}
                </span>
                <ul role="group" aria-label={group.marketLabel} className="location-picker-group-options">
                  {group.options.map((option) => (
                    <li
                      key={option.value}
                      id={`${baseId}-opt-${option.value}`}
                      role="option"
                      aria-selected={value === option.value}
                      className={`location-picker-option${activeValue === option.value ? ' is-active' : ''}${value === option.value ? ' is-selected' : ''}`}
                      onMouseEnter={() => setActiveIndex(flatOptions.findIndex((item) => item.value === option.value))}
                      onClick={() => selectValue(option.value)}
                    >
                      {option.shortLabel}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {filteredGroups.length === 0 && normalizedQuery ? (
              <li className="location-picker-empty" role="presentation">
                Sin resultados para &quot;{query}&quot;.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
