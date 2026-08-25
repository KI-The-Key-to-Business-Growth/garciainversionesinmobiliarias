'use client';

import React, { useEffect, useId, useRef, useState } from 'react';

type PropertyDescriptionProps = {
  text: string;
};

export function descriptionToggleLabel(expanded: boolean): string {
  return expanded ? 'Ver menos ↑' : 'Ver descripción completa ↓';
}

type DescriptionToggleButtonProps = {
  expanded: boolean;
  contentId: string;
  onToggle?: () => void;
};

// Extraído como componente propio (en vez de inline) para poder probar el
// contrato accesible (aria-expanded + label por estado) sin simular un click
// real — este proyecto no tiene jsdom/testing-library, solo SSR estático.
export function DescriptionToggleButton({ expanded, contentId, onToggle }: DescriptionToggleButtonProps) {
  return (
    <button
      type="button"
      className="twoclics-description-toggle"
      aria-expanded={expanded}
      aria-controls={contentId}
      onClick={onToggle}
    >
      {descriptionToggleLabel(expanded)}
    </button>
  );
}

export default function PropertyDescription({ text }: PropertyDescriptionProps) {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const contentId = useId();

  // Mide el recorte real aplicado por el clamp CSS — solo mostramos el
  // control si efectivamente hay contenido oculto (si no, "Ver más" no haría nada).
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    setTruncated(el.scrollHeight - el.clientHeight > 2);
  }, [text]);

  return (
    <>
      <p
        ref={textRef}
        id={contentId}
        className={
          expanded
            ? 'twoclics-rich-text twoclics-rich-text--editorial'
            : 'twoclics-rich-text twoclics-rich-text--editorial twoclics-description-clamp'
        }
      >
        {text}
      </p>
      {truncated ? (
        <DescriptionToggleButton
          expanded={expanded}
          contentId={contentId}
          onToggle={() => setExpanded((value) => !value)}
        />
      ) : null}
    </>
  );
}
