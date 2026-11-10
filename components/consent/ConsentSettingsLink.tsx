'use client';

import React from 'react';
import { CONSENT_OPEN_EVENT } from '@/lib/consent';

// Reabre el panel de preferencias de cookies (footer y /privacidad).
export default function ConsentSettingsLink({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className ?? 'footer-privacy-link consent-settings-link'}
      onClick={() => window.dispatchEvent(new Event(CONSENT_OPEN_EVENT))}
    >
      Preferencias de cookies
    </button>
  );
}
