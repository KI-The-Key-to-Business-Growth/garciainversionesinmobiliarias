import { TRACKING_HOSTS } from '@/lib/tracking-hosts';

// Contenedor de Google Tag Manager de García (confirmado). Los tags de Meta Pixel y GA4 viven
// DENTRO de este contenedor, así que si GTM no carga, ninguno de los dos se ejecuta.
export const GTM_ID = 'GTM-MBNKBBSW';

// Snippet de arranque de GTM (mismo que entrega Google) con una guarda de hostname: se ejecuta en
// el navegador y NO inserta gtm.js ni inicializa `dataLayer` si el host no es de producción. Por
// eso corre igual en páginas prerenderizadas/estáticas, donde el host real solo se conoce en el
// cliente (el HTML de un build sirve para todos los hosts).
export function buildGtmBootstrap(
  gtmId: string = GTM_ID,
  hosts: readonly string[] = TRACKING_HOSTS,
): string {
  return (
    `(function(w,d,s,l,i,a){` +
    `var h=String((w.location&&w.location.hostname)||'').toLowerCase().replace(/\\.$/,'');` +
    `if(a.indexOf(h)===-1)return;` +
    `w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});` +
    `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';` +
    `j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;` +
    `f.parentNode.insertBefore(j,f);` +
    `})(window,document,'script','dataLayer',${JSON.stringify(gtmId)},${JSON.stringify(hosts)});`
  );
}

// El <noscript> con el iframe de GTM no puede comprobar el host en runtime. Se renderiza solo en
// builds de producción de Vercel (VERCEL_ENV=production en build time): ni localhost ni previews
// lo incluyen. Cubre únicamente a usuarios sin JavaScript.
export function shouldRenderGtmNoscript(env: Record<string, string | undefined> = process.env): boolean {
  return env.VERCEL_ENV === 'production';
}
