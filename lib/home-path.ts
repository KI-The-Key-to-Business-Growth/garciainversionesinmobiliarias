// ¿Esta ruta es la home real? Se usa para decidir el modo del Header (flotante/transparente solo en la home).
//
// En producción (Vercel) la página `/` se sirve prerenderizada con revalidación (ISR) y su payload de Next
// trae la ruta canónica `/index` en lugar de `/`, de modo que `usePathname()` devuelve `/index` en la carga
// completa de la home (en las demás páginas, y en la navegación interna a `/`, devuelve la ruta normal).
// Solo `/` y `/index` cuentan como home: cualquier otra ruta (`/index.html`, `/indexador`, `/x/index`)
// NO es la home.
export function isHomePathname(pathname: string | null | undefined): boolean {
  return pathname === '/' || pathname === '/index';
}
