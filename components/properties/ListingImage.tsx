'use client';

import Image from 'next/image';
import React from 'react';
import type { PublicImage } from '@/lib/2clics/types';

type ListingImageProps = {
  image: PublicImage | null | undefined;
  alt: string;
  className?: string;
  imageClassName?: string;
  preferThumbnail?: boolean;
  priority?: boolean;
  sizes?: string;
  unoptimized?: boolean;
};

export default function ListingImage({
  image,
  alt,
  className,
  imageClassName,
  preferThumbnail = false,
  priority = false,
  sizes = '(max-width: 680px) 100vw, (max-width: 1120px) 50vw, 33vw',
  unoptimized = true,
}: ListingImageProps) {
  const src = preferThumbnail ? image?.displayThumbnailUrl || image?.displayUrl : image?.displayUrl;
  const frameClassName = className ? `listing-image-frame ${className}` : 'listing-image-frame';
  const fallbackClassName = className ? `listing-image-fallback ${className}` : 'listing-image-fallback';

  if (!src) {
    return (
      <div className={fallbackClassName} aria-label="Sin imagen disponible">
        <span>Sin imagen</span>
      </div>
    );
  }

  return (
    <span className={frameClassName}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        unoptimized={unoptimized}
        className={imageClassName}
      />
    </span>
  );
}
