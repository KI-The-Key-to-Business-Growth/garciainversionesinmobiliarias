// QA de FLUJO COMPLETO contra el sitio publicado (solo lectura).
//   node scripts/qa-prod-flow.mjs [https://www.garciainversionesinmobiliarias.com.ar]
// No envía formularios válidos, no acepta cookies y no hace clic en botones que registren datos:
// no genera leads ni contamina las estadísticas. Imprime un resumen y escribe qa-prod-report.json.
import { createRequire } from 'node:module';
import fs from 'node:fs';
// Playwright global (navegadores en %LOCALAPPDATA%\ms-playwright); si no está, el del proyecto.
let chromium;
try { ({ chromium } = createRequire('file:///C:/Users/lucia/AppData/Roaming/npm/node_modules/')('playwright')); }
catch { ({ chromium } = createRequire(import.meta.url)('@playwright/test')); }

const BASE = (process.argv[2] || 'https://www.garciainversionesinmobiliarias.com.ar').replace(/\/$/, '');
const HOST = new URL(BASE).host;
const TRACKERS = /googletagmanager\.com|google-analytics\.com|doubleclick\.net|facebook\.(com|net)\/(tr|signals|en_US)|connect\.facebook\.net|googleadservices\.com/;
const hallazgos = [];
const add = (nivel, area, msg, extra) => hallazgos.push({ nivel, area, msg, ...(extra ? { extra } : {}) });
const ok = (c, nivel, area, msg, extra) => { if (!c) add(nivel, area, msg, extra); return c; };
const get = async (url, opts = {}) => { try { return await fetch(url, { redirect: 'manual', ...opts }); } catch (e) { return { status: 0, error: String(e), headers: new Headers() }; } };

/* ───────────── 1. robots, sitemap, redirecciones, 404, headers ───────────── */
const robots = await get(`${BASE}/robots.txt`);
ok(robots.status === 200, 'alto', 'seo', `robots.txt responde ${robots.status}`);
const robotsTxt = robots.status === 200 ? await robots.text() : '';
ok(/Sitemap:/i.test(robotsTxt), 'medio', 'seo', 'robots.txt no declara el sitemap');
const sm = await get(`${BASE}/sitemap.xml`);
ok(sm.status === 200, 'alto', 'seo', `sitemap.xml responde ${sm.status}`);
const smXml = sm.status === 200 ? await sm.text() : '';
const urls = [...smXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
const mismoHost = urls.filter((u) => new URL(u).host === HOST);
ok(urls.length === mismoHost.length, 'medio', 'seo', 'el sitemap lista URLs de otro dominio', urls.filter((u) => new URL(u).host !== HOST).slice(0, 5));
ok(new Set(urls).size === urls.length, 'bajo', 'seo', 'el sitemap tiene URLs repetidas');

const redirs = [
  [`http://${HOST}/`, 'http→https'],
  [`https://${HOST.replace(/^www\./, '')}/`, 'apex→www'],
  [`${BASE}/index.html`, '/index.html→/'],
  [`${BASE}/contacto.html`, '/contacto.html→/contacto'],
  [`${BASE}/propiedades`, '/propiedades→/comprar'],
];
const redirInfo = {};
for (const [u, label] of redirs) {
  const r = await get(u);
  const loc = r.headers.get?.('location') || '';
  redirInfo[label] = `${r.status} ${loc}`;
  ok([301, 308, 302, 307].includes(r.status) || r.status === 200, 'medio', 'redirecciones', `${label}: ${r.status} ${loc}`);
  if (label === 'http→https') ok(/^https:/.test(loc), 'alto', 'seguridad', 'http no redirige a https', loc);
}
const nf = await get(`${BASE}/esta-pagina-no-existe-${Date.now()}`);
ok(nf.status === 404, 'alto', 'errores', `una URL inexistente responde ${nf.status} en vez de 404 (soft-404)`);

const home = await get(BASE + '/');
const H = Object.fromEntries([...home.headers.entries()].map(([k, v]) => [k.toLowerCase(), v]));
for (const [h, re] of [['strict-transport-security', /max-age=\d{7,}/], ['x-content-type-options', /nosniff/], ['x-frame-options', /(SAMEORIGIN|DENY)/i], ['referrer-policy', /./], ['content-security-policy', /default-src/], ['permissions-policy', /./]])
  ok(H[h] && re.test(H[h]), 'alto', 'headers', `falta o es inválido el header ${h}`, H[h]);
ok(!H['x-powered-by'], 'bajo', 'headers', 'expone X-Powered-By', H['x-powered-by']);
ok(!/unsafe-eval/.test(H['content-security-policy'] || ''), 'alto', 'headers', 'la CSP de producción permite unsafe-eval');
const api = await get(`${BASE}/api/2clics/webhook`, { method: 'GET', headers: { Origin: 'https://evil.example' } });
ok(api.status === 403, 'alto', 'cors', `/api con Origin ajeno responde ${api.status} (se esperaba 403)`);
const apiNoOrigin = await get(`${BASE}/api/maintenance/retention`);
ok([401, 403, 404, 405].includes(apiNoOrigin.status), 'alto', 'seguridad', `/api/maintenance/retention sin credenciales responde ${apiNoOrigin.status}`);

/* ───────────── 2. recorrido de páginas con navegador real ───────────── */
const browser = await chromium.launch();
const paginas = [...new Set([BASE + '/', ...mismoHost])].slice(0, 60);
const enlacesInternos = new Set();
const resumenPaginas = [];

async function auditarPagina(ctx, url, movil) {
  const page = await ctx.newPage();
  const errs = [], fallidas = [], trackers = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  page.on('requestfailed', (r) => { if (!/analytics|doubleclick|facebook|googletag/.test(r.url())) fallidas.push(r.url().slice(0, 120) + ' ' + (r.failure()?.errorText || '')); });
  page.on('response', (r) => { if (r.status() >= 400 && new URL(r.url()).host.endsWith(HOST.replace(/^www\./, ''))) fallidas.push(`${r.status()} ${r.url().slice(0, 120)}`); });
  page.on('request', (r) => { if (TRACKERS.test(r.url())) trackers.push(r.url().slice(0, 100)); });
  let status = 0;
  try { const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 }); status = resp?.status() ?? 0; } catch (e) { errs.push('navegación: ' + String(e).slice(0, 150)); }
  await page.waitForTimeout(800);
  const d = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const imgs = [...document.images];
    const interactivos = [...document.querySelectorAll('button, a[href], input, select, textarea')];
    const sinNombre = interactivos.filter((el) => {
      if (el.type === 'hidden' || el.closest('[aria-hidden="true"]')) return false;
      const t = (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent || el.getAttribute('title') || el.getAttribute('placeholder') || el.getAttribute('alt') || el.value || '').trim();
      const hasImgAlt = el.querySelector?.('img[alt]:not([alt=""]), svg title');
      const lbl = el.id && document.querySelector(`label[for="${el.id}"]`);
      const vis = el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden';
      return vis && !t && !hasImgAlt && !lbl && !el.closest('label');
    }).length;
    return {
      title: document.title, lang: document.documentElement.lang,
      desc: q('meta[name="description"]')?.content || '', canonical: q('link[rel="canonical"]')?.href || '',
      ogTitle: !!q('meta[property="og:title"]'), ogImage: q('meta[property="og:image"]')?.content || '',
      robots: q('meta[name="robots"]')?.content || '', h1: document.querySelectorAll('h1').length,
      imgsRotas: imgs.filter((i) => i.complete && i.naturalWidth === 0 && i.currentSrc && !i.closest('[hidden]') && getComputedStyle(i).display !== 'none').map((i) => i.currentSrc.slice(0, 100)),
      imgsSinAlt: imgs.filter((i) => !i.hasAttribute('alt')).length,
      sinNombre, desborde: document.documentElement.scrollWidth - window.innerWidth,
      blank: [...document.querySelectorAll('a[target="_blank"]')].filter((a) => !/noopener/.test(a.rel)).map((a) => a.href).slice(0, 5),
      hrefs: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')),
      wa: [...document.querySelectorAll('a[href*="wa.me"], a[href*="whatsapp.com"]')].map((a) => a.href),
      texto: document.body.innerText.length,
      errorUI: /Application error|Internal Server Error|\bundefined\b|\bNaN\b|\[object Object\]|unconfigured/.test(document.body.innerText),
      h1Texto: q('h1')?.innerText?.slice(0, 80) || '',
    };
  });
  await page.close();
  return { url, status, movil, errs, fallidas, trackers, ...d };
}

for (const movil of [false, true]) {
  const ctx = await browser.newContext(movil ? { viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' } : { viewport: { width: 1280, height: 900 } });
  for (const u of paginas) {
    if (movil && paginas.indexOf(u) > 24) break; // móvil: las primeras 25
    const r = await auditarPagina(ctx, u, movil);
    resumenPaginas.push({ url: r.url, movil, status: r.status, h1: r.h1Texto, trackers: r.trackers.length });
    const tag = `${movil ? '[móvil] ' : ''}${new URL(u).pathname}`;
    ok(r.status === 200, 'alto', 'paginas', `${tag} responde ${r.status}`);
    ok(r.errs.length === 0, 'medio', 'consola', `${tag}: errores de consola/JS`, r.errs.slice(0, 3));
    ok(r.fallidas.length === 0, 'medio', 'red', `${tag}: recursos propios que fallan`, r.fallidas.slice(0, 3));
    ok(r.trackers.length === 0, 'alto', 'privacidad', `${tag}: carga trackers ANTES de dar consentimiento`, r.trackers.slice(0, 3));
    ok(r.title && r.title.length >= 10 && r.title.length <= 70, 'bajo', 'seo', `${tag}: título ${r.title ? `de ${r.title.length} caracteres` : 'vacío'}`, r.title);
    ok(r.desc.length >= 50 && r.desc.length <= 170, 'bajo', 'seo', `${tag}: meta description ${r.desc ? `de ${r.desc.length} caracteres` : 'ausente'}`);
    ok(!!r.canonical, 'medio', 'seo', `${tag}: sin canonical`);
    ok(r.lang === 'es' || /^es-/.test(r.lang), 'bajo', 'accesibilidad', `${tag}: lang="${r.lang}"`);
    ok(r.h1 === 1, 'bajo', 'seo', `${tag}: ${r.h1} etiquetas h1 (debería haber 1)`);
    ok(r.imgsRotas.length === 0, 'alto', 'imagenes', `${tag}: imágenes rotas`, r.imgsRotas.slice(0, 3));
    ok(r.imgsSinAlt === 0, 'bajo', 'accesibilidad', `${tag}: ${r.imgsSinAlt} imágenes sin atributo alt`);
    ok(r.sinNombre === 0, 'medio', 'accesibilidad', `${tag}: ${r.sinNombre} controles sin nombre accesible`);
    ok(r.desborde <= 1, 'medio', 'responsive', `${tag}: desborde horizontal de ${r.desborde}px`);
    ok(r.blank.length === 0, 'bajo', 'seguridad', `${tag}: enlaces target=_blank sin rel=noopener`, r.blank);
    ok(!r.errorUI, 'alto', 'contenido', `${tag}: el texto de la página contiene un mensaje de error/valor roto`);
    ok(r.texto > 200, 'alto', 'contenido', `${tag}: la página casi no tiene texto (${r.texto})`);
    for (const w of r.wa) ok(/wa\.me\/5491167240353/.test(w), 'medio', 'whatsapp', `${tag}: enlace de WhatsApp con otro número`, w);
    if (!movil) for (const h of r.hrefs) { if (h && h.startsWith('/') && !h.startsWith('//')) enlacesInternos.add(h.split('#')[0].split('?')[0]); }
  }
  await ctx.close();
}

/* ───────────── 3. enlaces internos ───────────── */
const rotos = [];
for (const path of [...enlacesInternos].filter(Boolean)) {
  if (/^\/(api|_next)\//.test(path)) continue;
  const r = await get(BASE + path);
  if (![200, 301, 302, 307, 308].includes(r.status)) rotos.push(`${r.status} ${path}`);
}
ok(rotos.length === 0, 'alto', 'enlaces', `${rotos.length} enlace(s) interno(s) roto(s)`, rotos.slice(0, 10));

/* ───────────── 4. formulario de contacto (sin enviar datos válidos) ───────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const trackers = [];
  page.on('request', (r) => { if (TRACKERS.test(r.url())) trackers.push(r.url()); });
  await page.goto(BASE + '/contacto', { waitUntil: 'networkidle' });
  const f = await page.evaluate(() => {
    const form = document.querySelector('form');
    const hp = form?.querySelector('input[name="website"]');
    return {
      hay: !!form, campos: [...(form?.querySelectorAll('input,textarea,select') || [])].map((i) => i.name || i.id).filter(Boolean),
      honeypotOculto: hp ? (getComputedStyle(hp).display === 'none' || hp.closest('[aria-hidden="true"]') !== null || hp.getBoundingClientRect().width === 0 || hp.tabIndex === -1) : null,
      turnstile: !!document.querySelector('iframe[src*="challenges.cloudflare.com"], .cf-turnstile, [data-sitekey]'),
      loadedAt: !!form?.querySelector('input[name="_form_loaded_at"]'),
      requeridos: [...(form?.querySelectorAll('[required]') || [])].length,
    };
  });
  ok(f.hay, 'alto', 'formulario', '/contacto no tiene formulario');
  ok(f.honeypotOculto !== false, 'alto', 'formulario', 'el campo trampa (honeypot) es visible para personas');
  ok(f.turnstile, 'alto', 'formulario', 'no se encontró el widget de verificación (Turnstile)');
  ok(trackers.length === 0, 'alto', 'privacidad', '/contacto: trackers antes del consentimiento', trackers.slice(0, 3));
  // Enviar vacío: debe frenar en el navegador (campos requeridos) y NO llegar al servidor.
  let posts = 0;
  page.on('request', (r) => { if (r.method() === 'POST') posts++; });
  const boton = page.locator('form button[type="submit"], form input[type="submit"]').first();
  if (await boton.count()) { await boton.click({ trial: false }).catch(() => {}); await page.waitForTimeout(800); }
  ok(posts === 0, 'alto', 'formulario', 'enviar el formulario vacío hizo una petición POST al servidor');
  const banner = await page.evaluate(() => /cookies|consentimiento|privacidad/i.test(document.body.innerText) && !!document.querySelector('[role="dialog"], [class*="consent"], [class*="cookie"]'));
  ok(banner, 'medio', 'consentimiento', 'no se ve el aviso de cookies/consentimiento al primer ingreso');
  add('info', 'formulario', 'Campos del formulario', f.campos);
  await ctx.close();
}

/* ───────────── 5. rendimiento básico de la home ───────────── */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, isMobile: true });
  const page = await ctx.newPage();
  const pesos = [];
  page.on('response', async (r) => { try { const len = +(r.headers()['content-length'] || 0); if (len) pesos.push([r.url(), len, r.request().resourceType()]); } catch {} });
  await page.addInitScript(() => { window.__lcp = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const m = await page.evaluate(() => ({ lcp: Math.round(window.__lcp), dcl: Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd) }));
  const total = pesos.reduce((a, p) => a + p[1], 0);
  const grandes = pesos.filter((p) => p[2] === 'image' && p[1] > 400_000).map((p) => `${Math.round(p[1] / 1024)} KB ${p[0].slice(0, 90)}`);
  ok(m.lcp < 4000, 'medio', 'rendimiento', `LCP de la home en móvil: ${m.lcp} ms (objetivo < 2500; tope aceptable 4000)`);
  ok(grandes.length === 0, 'bajo', 'rendimiento', `${grandes.length} imagen(es) de más de 400 KB en la home`, grandes.slice(0, 5));
  add('info', 'rendimiento', `Home móvil: LCP ${m.lcp} ms, DOMContentLoaded ${m.dcl} ms, ${Math.round(total / 1024)} KB declarados`);
  await ctx.close();
}
await browser.close();

/* ───────────── resumen ───────────── */
const orden = { alto: 0, medio: 1, bajo: 2, info: 3 };
hallazgos.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
const cuenta = (n) => hallazgos.filter((h) => h.nivel === n).length;
fs.writeFileSync('qa-prod-report.json', JSON.stringify({ base: BASE, fecha: new Date().toISOString(), redirInfo, paginas: resumenPaginas.length, hallazgos }, null, 1));
console.log(`\nPáginas auditadas: ${new Set(resumenPaginas.map((p) => p.url)).size} (${resumenPaginas.length} cargas) · alto: ${cuenta('alto')} · medio: ${cuenta('medio')} · bajo: ${cuenta('bajo')}`);
console.log('Redirecciones:', JSON.stringify(redirInfo));
const seen = new Set();
for (const h of hallazgos) { const k = h.nivel + h.area + h.msg.replace(/^\[móvil\] /, '').replace(/^\/[^:]*: /, ''); const line = `[${h.nivel.toUpperCase()}] ${h.area}: ${h.msg}${h.extra ? ' → ' + JSON.stringify(h.extra).slice(0, 220) : ''}`; if (seen.has(line)) continue; seen.add(line); console.log(line); }
