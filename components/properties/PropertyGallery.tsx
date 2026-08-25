'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ListingImage from '@/components/properties/ListingImage';
import type { PublicImage } from '@/lib/2clics/types';

type PropertyGalleryProps = {
  images: PublicImage[];
  title: string;
  plans?: PublicImage[];
};

const SWIPE_THRESHOLD = 44;

function wrapIndex(index: number, length: number): number {
  if (!length) return 0;
  return (index + length) % length;
}

function imageKey(image: PublicImage, index: number): string {
  return `${image.id || 'image'}-${index}`;
}

export default function PropertyGallery({ images, title, plans = [] }: PropertyGalleryProps) {
  const gallery = useMemo(() => images.filter(Boolean), [images]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const hasImages = gallery.length > 0;
  const activeImage = hasImages ? gallery[wrapIndex(activeIndex, gallery.length)] : undefined;
  const counter = hasImages ? `${wrapIndex(activeIndex, gallery.length) + 1} / ${gallery.length}` : '';

  const goTo = useCallback(
    (index: number) => {
      if (!gallery.length) return;
      setActiveIndex(wrapIndex(index, gallery.length));
    },
    [gallery.length],
  );

  const goPrevious = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);
  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);

  useEffect(() => {
    if (activeIndex >= gallery.length) setActiveIndex(0);
  }, [activeIndex, gallery.length]);

  useEffect(() => {
    if (!lightboxOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen]);

  useEffect(() => {
    if (!lightboxOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowLeft' && gallery.length > 1) goPrevious();
      if (event.key === 'ArrowRight' && gallery.length > 1) goNext();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gallery.length, goNext, goPrevious, lightboxOpen]);

  function handleTouchStart(event: React.TouchEvent) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null || gallery.length < 2) return;

    const endX = event.changedTouches[0]?.clientX ?? startX;
    const distance = endX - startX;
    if (Math.abs(distance) < SWIPE_THRESHOLD) return;
    if (distance > 0) goPrevious();
    else goNext();
  }

  return (
    <div className="twoclics-gallery">
      <div
        className="twoclics-gallery-main"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          className="twoclics-gallery-main-button"
          onClick={() => hasImages && setLightboxOpen(true)}
          disabled={!hasImages}
          aria-label={hasImages ? `Ampliar imagen de ${title}` : 'Sin imagen disponible'}
        >
          <ListingImage
            image={activeImage}
            alt={title}
            priority
            sizes="(max-width: 820px) 100vw, 920px"
          />
          {counter ? <span className="twoclics-gallery-count">{counter}</span> : null}
        </button>

        {gallery.length > 1 ? (
          <>
            <button
              type="button"
              className="twoclics-gallery-all"
              onClick={() => setLightboxOpen(true)}
            >
              Ver las {gallery.length} fotos
            </button>
            <button
              type="button"
              className="twoclics-gallery-nav twoclics-gallery-nav--prev"
              onClick={goPrevious}
              aria-label="Imagen anterior"
            >
              <span aria-hidden="true">&lsaquo;</span>
            </button>
            <button
              type="button"
              className="twoclics-gallery-nav twoclics-gallery-nav--next"
              onClick={goNext}
              aria-label="Imagen siguiente"
            >
              <span aria-hidden="true">&rsaquo;</span>
            </button>
          </>
        ) : null}
      </div>

      {gallery.length > 1 ? (
        <div className="twoclics-gallery-thumbs" aria-label="Galería de imágenes" role="list">
          {gallery.map((image, index) => {
            const selected = index === wrapIndex(activeIndex, gallery.length);
            return (
              <button
                key={imageKey(image, index)}
                type="button"
                className="twoclics-gallery-thumb"
                onClick={() => goTo(index)}
                aria-current={selected ? 'true' : undefined}
                aria-label={`Ver imagen ${index + 1} de ${gallery.length}`}
                role="listitem"
              >
                <ListingImage
                  image={image}
                  alt={`${title} imagen ${index + 1}`}
                  preferThumbnail
                  sizes="(max-width: 680px) 29vw, 150px"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      {plans.length ? (
        <div className="twoclics-plans">
          <h2>Planos</h2>
          <div className="twoclics-gallery-thumbs twoclics-gallery-thumbs--plans">
            {plans.map((plan, index) => (
              <span key={plan.id} className="twoclics-plan-thumb">
                <ListingImage
                  image={plan}
                  alt={`${title} plano ${index + 1}`}
                  preferThumbnail
                  sizes="(max-width: 680px) 50vw, 220px"
                />
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {lightboxOpen && activeImage ? (
        <div
          className="twoclics-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={`Galería de ${title}`}
          onClick={() => setLightboxOpen(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            className="twoclics-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="Cerrar galería"
          >
            <span aria-hidden="true">&times;</span>
          </button>

          {gallery.length > 1 ? (
            <button
              type="button"
              className="twoclics-lightbox-nav twoclics-lightbox-nav--prev"
              onClick={(event) => {
                event.stopPropagation();
                goPrevious();
              }}
              aria-label="Imagen anterior"
            >
              <span aria-hidden="true">&lsaquo;</span>
            </button>
          ) : null}

          <div className="twoclics-lightbox-stage" onClick={(event) => event.stopPropagation()}>
            <ListingImage
              image={activeImage}
              alt={`${title} imagen ampliada`}
              priority
              sizes="100vw"
            />
          </div>

          {gallery.length > 1 ? (
            <button
              type="button"
              className="twoclics-lightbox-nav twoclics-lightbox-nav--next"
              onClick={(event) => {
                event.stopPropagation();
                goNext();
              }}
              aria-label="Imagen siguiente"
            >
              <span aria-hidden="true">&rsaquo;</span>
            </button>
          ) : null}

          <span className="twoclics-lightbox-count">{counter}</span>
        </div>
      ) : null}
    </div>
  );
}
