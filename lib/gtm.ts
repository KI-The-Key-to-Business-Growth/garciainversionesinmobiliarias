import { CONSENT_COOKIE, CONSENT_VERSION } from '@/lib/consent';
import { TRACKING_HOSTS } from '@/lib/tracking-hosts';

// Contenedor de Google Tag Manager de García (confirmado). Los tags de Meta Pixel y GA4 viven
// DENTRO de este contenedor, así que si GTM no carga, ninguno de los dos se ejecuta.
export const GTM_ID = 'GTM-MBNKBBSW';

// Snippet de arranque de GTM con DOS guardas:
//  1) hostname: solo corre en los hosts de producción (lib/tracking-hosts.ts). En cualquier otro
//     host (localhost, previews) NO inicializa `dataLayer` ni inserta gtm.js.
//  2) consentimiento: Google Consent Mode v2 se inicializa en "denied" ANTES que cualquier etiqueta;
//     gtm.js (y con él GA4, Meta Pixel y Google Ads) solo se inserta si el visitante YA aceptó
//     alguna categoría (cookie `gi_consent`) o cuando acepta en el banner (`window.__giLoadGtm`).
//     Rechazo o sin elección = GTM no carga. El rechazo y el retiro posterior se respetan.
// Se ejecuta en el navegador (el HTML de un build sirve para todos los hosts).
export function buildGtmBootstrap(
  gtmId: string = GTM_ID,
  hosts: readonly string[] = TRACKING_HOSTS,
): string {
  return (
    `(function(w,d,s,l,i,a,c){` +
    `var h=String((w.location&&w.location.hostname)||'').toLowerCase().replace(/\\.$/,'');` +
    `if(a.indexOf(h)===-1)return;` +
    `w[l]=w[l]||[];` +
    `function g(){w[l].push(arguments)}` +
    `g('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});` +
    `function rc(){var m=null;try{var r=(d.cookie||'').split(';');for(var k=0;k<r.length;k++){var p=r[k].split('=');if(p[0].trim()===c){m=new URLSearchParams(decodeURIComponent(p.slice(1).join('=').trim()));break}}}catch(e){}` +
    `var ok=!!m&&m.get('v')==='${CONSENT_VERSION}'&&(m.get('a')==='1'||m.get('a')==='0')&&(m.get('m')==='1'||m.get('m')==='0');` +
    `return{an:ok&&m.get('a')==='1',mk:ok&&m.get('m')==='1',ok:ok}}` +
    `var s0=rc();` +
    `if(s0.ok)g('consent','update',{analytics_storage:s0.an?'granted':'denied',ad_storage:s0.mk?'granted':'denied',ad_user_data:s0.mk?'granted':'denied',ad_personalization:s0.mk?'granted':'denied'});` +
    // Defensa en profundidad: el contenedor GTM publicado carga el Meta Pixel con etiquetas HTML sin
    // condición de consentimiento. Si el visitante NO aceptó publicidad, se predefine un `fbq` nulo:
    // el snippet oficial del Pixel (`b.fbq||...`) no descarga fbevents.js y todas sus llamadas son
    // no-ops. Si luego acepta publicidad, se recarga la página (ver applyConsent).
    `w.__giLoadGtm=function(){if(w.__giGtmLoaded)return;w.__giGtmLoaded=true;` +
    `var cur=rc();` +
    `if(!cur.mk&&!w.fbq){var n=function(){};n.loaded=true;n.version='2.0';n.queue=[];n.push=n;w.fbq=n;w._fbq=n;w.__giFbqBlocked=true}` +
    `w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});` +
    `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';` +
    `j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;` +
    `f.parentNode.insertBefore(j,f)};` +
    `if(s0.an||s0.mk)w.__giLoadGtm();` +
    `})(window,document,'script','dataLayer',${JSON.stringify(gtmId)},${JSON.stringify(hosts)},${JSON.stringify(CONSENT_COOKIE)});`
  );
}
