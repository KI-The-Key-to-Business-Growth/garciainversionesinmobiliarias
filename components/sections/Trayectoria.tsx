import React from 'react';

// TRAYECTORIA — bloque breve después del Hero (WEB GARCÍA V2, cuarta pasada). Construye confianza
// antes de mostrar inventario (principio de jerarquía tomado de sitios inmobiliarios bien
// resueltos, no su diseño). Las tres cifras y su intro son las MISMAS que ya están aprobadas en
// `Why.tsx` (/nosotros, sección "why-stats") — número/label reutilizados tal cual, sin
// reinterpretar qué significan ni inventar ninguno nuevo. Es un componente propio (no importa
// Why.tsx) para no acoplar este bloque del Home a la sección congelada de /nosotros.
export default function Trayectoria() {
  return (
    <section className="section-sm trayectoria">
      <div className="container">
        <div className="trayectoria-intro reveal">
          <span className="eyebrow">Trayectoria</span>
          <p>Comprar, vender o invertir en real estate requiere criterio, no solo catálogo.</p>
        </div>
        <div className="trayectoria-stats reveal">
          <div className="trayectoria-stat">
            <span className="trayectoria-stat-number">+500</span>
            <span className="trayectoria-stat-label">Operaciones realizadas</span>
          </div>
          <div className="trayectoria-stat">
            <span className="trayectoria-stat-number">+20 años</span>
            <span className="trayectoria-stat-label">En la industria del real estate</span>
          </div>
          <div className="trayectoria-stat">
            <span className="trayectoria-stat-number trayectoria-stat-number--market">Buenos Aires + Miami</span>
            <span className="trayectoria-stat-label">Mercados activos</span>
          </div>
        </div>
      </div>
    </section>
  );
}
