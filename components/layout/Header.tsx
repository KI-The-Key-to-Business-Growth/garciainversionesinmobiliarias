'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Header transparente (home) que se oscurece al scrollear + menú mobile.
// Porta el comportamiento de legacy/public/assets/js/site.js (menú + is-scrolled).
//
// WEB GARCÍA V2 (tercera pasada) — bug sistémico corregido: `body[data-page-type="home"]` está
// hardcodeado en `app/layout.tsx` para TODAS las rutas (nunca cambia; los otros valores de
// data-page-type en globals.css — property_detail/property_listing/thank_you — son restos de la
// migración desde el sitio legacy y no están cableados a ningún lado, código muerto). Como la
// regla `body[data-page-type='home'] .site-header { position: fixed }` quedaba siempre activa,
// el Header flotaba SIN reservar sus 92px de alto sobre CUALQUIER página, tapando el H1 del hero
// interior de Comprar/Alquilar/Desarrollos/Invertir/Vender/Nosotros/Servicios — nunca era un
// problema en el Home real porque su Hero ocupa el viewport completo a propósito. La solución
// sistémica: el propio Header decide su modo según la ruta actual (`usePathname`, ya evaluada
// correctamente en el primer render server-side, sin flash), no según un atributo que nunca
// cambia. Solo el Home real (`/`) usa el header flotante/transparente; toda página interior usa
// `position: sticky` (default de `.site-header`), que SIEMPRE reserva su espacio — ningún H1
// interior puede quedar tapado, sin tocar un solo componente de hero.
function isActiveNavLink(pathname: string, href: string): boolean {
  if (href.startsWith('/#')) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// WEB GARCÍA V2 (docs/ai/WEB_GARCIA_V2.md): navegación principal por intención. `/propiedades`
// sigue existiendo como catálogo maestro pero deja de ser un ítem de primer nivel del Header —
// se llega a él desde Comprar/Alquilar (o directo por URL). "Nosotros" apunta a la página real
// `/nosotros` (segunda pasada V2) — ya no al ancla `/#nosotros` del Home.
//
// Cuarta pasada (Home): el botón de la derecha ya no muestra el teléfono — es "Contacto".
// Quinta pasada: Contacto dejó de ser una sección del Home y pasó a ser landing propia
// (`/contacto`), así que este botón (y el mismo destino que usa "Hablar con un asesor" del Hero)
// apunta ahí en vez de a `/#contacto`. El teléfono sigue visible en Contacto y en el Footer, no
// desapareció de la web.
const NAV_LINKS = [
  { href: '/comprar', label: 'Comprar' },
  { href: '/alquilar', label: 'Alquilar' },
  { href: '/desarrollos', label: 'Desarrollos' },
  { href: '/invertir', label: 'Invertir' },
  { href: '/vender', label: 'Vender' },
  { href: '/nosotros', label: 'Nosotros' },
];

const MOBILE_LINKS = [
  { href: '/#inicio', label: 'Inicio' },
  ...NAV_LINKS,
  { href: '/contacto', label: 'Contacto' },
];

export default function Header() {
  const pathname = usePathname() || '/';
  const isHome = pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('menu-open');
    };
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <>
      <header
        className={`site-header${isHome ? ' site-header--floating' : ''}${scrolled ? ' is-scrolled' : ''}`}
        id="siteHeader"
      >
        <button
          className="menu-toggle"
          id="menuToggle"
          aria-label="Abrir menú"
          onClick={() => setMenuOpen(true)}
        >
          <span className="menu-icon">☰</span>
        </button>
        <Link href="/" className="hdr-brand" aria-label="García Inversiones Inmobiliarias">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/logos/Garcia-simple.svg"
            alt="García Inversiones Inmobiliarias"
            width={800}
            height={200}
            decoding="async"
          />
        </Link>
        <nav className="hdr-nav" aria-label="Navegación principal">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={isActiveNavLink(pathname, l.href) ? 'hdr-active' : undefined}
              aria-current={isActiveNavLink(pathname, l.href) ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/contacto" className="hdr-contact-link">
          Contacto
        </Link>
      </header>

      <aside
        className={`mobile-menu${menuOpen ? ' active' : ''}`}
        id="mobileMenu"
        aria-hidden={!menuOpen}
      >
        <div className="mobile-menu-backdrop" id="mobileBackdrop" onClick={close} />
        <div className="mobile-menu-inner">
          <div className="mobile-top">
            <Link href="/" className="mobile-logo" aria-label="Ir al inicio" onClick={close}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/logos/Garcia-simple.svg"
                alt="Logo García Inversiones Inmobiliarias"
                width={800}
                height={200}
                decoding="async"
              />
            </Link>
            <button className="menu-close" aria-label="Cerrar menú" onClick={close}>
              ×
            </button>
          </div>
          <nav className="mobile-links" aria-label="Navegación móvil">
            {MOBILE_LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={close}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
