'use client';

import React, { useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

export type DesarrollosMarketTab = {
  id: string;
  label: string;
  content: ReactNode;
};

type DesarrollosMarketTabsProps = {
  tabs: DesarrollosMarketTab[];
  defaultTabId: string;
};

// Selector de mercado de /desarrollos (decimonovena pasada) — tabs editoriales (no botones grandes
// de CTA), Estados Unidos/Argentina. Cada `tab.content` ya viene RENDERIZADO desde el Server
// Component padre (`app/desarrollos/page.tsx`) — este componente cliente nunca recibe ni maneja
// `curation`/`source` crudos, solo el JSX ya resuelto y las dos etiquetas de tab. Cambiar de
// mercado es un toggle de estado local (sin fetch, sin reload) — ambos paneles ya están resueltos
// server-side, se alterna cuál se muestra con `hidden`.
//
// Patrón ARIA tabs estándar: `role="tablist"`/`"tab"`/`"tabpanel"`, `aria-selected`,
// `aria-controls`/`aria-labelledby`, roving tabindex (solo el tab activo es tabbable) y flechas
// izquierda/derecha para moverse entre tabs sin soltar el foco.
export default function DesarrollosMarketTabs({ tabs, defaultTabId }: DesarrollosMarketTabsProps) {
  const [activeId, setActiveId] = useState(defaultTabId);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function focusAndActivate(id: string) {
    setActiveId(id);
    tabRefs.current[id]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const nextIndex = event.key === 'ArrowRight' ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
    focusAndActivate(tabs[nextIndex].id);
  }

  return (
    <div className="desarrollos-market-tabs">
      <div className="desarrollos-market-tablist" role="tablist" aria-label="Mercado">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`desarrollos-market-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`desarrollos-market-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`desarrollos-market-tab${isActive ? ' desarrollos-market-tab--active' : ''}`}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`desarrollos-market-panel-${tab.id}`}
          aria-labelledby={`desarrollos-market-tab-${tab.id}`}
          hidden={tab.id !== activeId}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
