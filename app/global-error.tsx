'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Captura errores de renderizado de React (App Router) y los reporta a Sentry.
// Reemplaza el layout raíz cuando hay un error global, por eso lleva estilos inline.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0c2948',
          color: '#f2ede4',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <h1 style={{ fontWeight: 400, fontSize: '28px', margin: '0 0 12px' }}>
          Algo salió mal.
        </h1>
        <p style={{ color: '#7793ab', margin: '0 0 28px', maxWidth: 420 }}>
          Tuvimos un problema inesperado. Ya fuimos notificados. Probá recargar la página o volver al
          inicio.
        </p>
        <a
          href="/"
          style={{
            background: '#cda04f',
            color: '#0c2948',
            padding: '12px 28px',
            borderRadius: 24,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Volver al inicio
        </a>
      </body>
    </html>
  );
}
