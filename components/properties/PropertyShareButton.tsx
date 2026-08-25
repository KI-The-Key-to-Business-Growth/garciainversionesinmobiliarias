'use client';

import React, { useEffect, useRef, useState } from 'react';

type PropertyShareButtonProps = {
  title: string;
  variant?: 'pill' | 'icon';
  label?: string;
  className?: string;
};

function fallbackCopyToClipboard(value: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}

export default function PropertyShareButton({
  title,
  variant = 'pill',
  label = 'Compartir',
  className = '',
}: PropertyShareButtonProps) {
  const [status, setStatus] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function showStatus(message: string) {
    setStatus(message);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus(''), 2400);
  }

  async function copyUrl(url: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else if (!fallbackCopyToClipboard(url)) {
      throw new Error('copy_failed');
    }
    showStatus('Enlace copiado');
  }

  async function handleShare() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      await copyUrl(url);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;

      try {
        await copyUrl(url);
      } catch {
        showStatus('No pudimos copiar el enlace');
      }
    }
  }

  return (
    <div className={`twoclics-share twoclics-share--${variant}${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="twoclics-share-button"
        onClick={handleShare}
        aria-label={label}
        title={label}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M18 16.1c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.22.09-.45.09-.7s-.04-.48-.09-.7l7.05-4.11A2.99 2.99 0 1 0 15 5c0 .25.04.48.09.7L8.04 9.81A3 3 0 1 0 8.04 14.2l7.12 4.18c-.04.2-.06.41-.06.62a2.9 2.9 0 1 0 2.9-2.9Z" />
        </svg>
        <span className="twoclics-share-label">{label}</span>
      </button>
      {status ? (
        <span className="twoclics-share-status" role="status">
          {status}
        </span>
      ) : null}
    </div>
  );
}
