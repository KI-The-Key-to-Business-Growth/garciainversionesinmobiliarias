# Fuentes autoalojadas (next/font/local)

Cargadas en `app/layout.tsx`. Reemplazan a `next/font/google`, que consultaba a Google en cada build y fallaba
de forma intermitente (`loader.js: /\.(woff|woff2|…)$/.exec(url)[1]` sobre una URL sin extensión), rompiendo el CI.

| Archivo | Familia | Estilo | Pesos | Subconjunto | SHA-256 |
|---|---|---|---|---|---|
| `Jost-latin-variable.woff2` | Jost | normal | 300–600 | latin | `235d8f8964bfdf105fc0c3e4c77b5e70f31bee1dad611d59318b5f2a5cb64d90` |
| `CormorantGaramond-latin-normal-variable.woff2` | Cormorant Garamond | normal | 300–600 | latin | `5d618c462b7a5b74f442e1548880086af71764d9cc7d35c16ab45353da934621` |
| `CormorantGaramond-latin-italic-variable.woff2` | Cormorant Garamond | cursiva | 300–600 | latin | `e6d6d1d73858aa9b66f3a3539f9dec22faab2276e61ad1d813bc04dd59c9c122` |

**Procedencia:** son exactamente los archivos que la web de producción servía con `next/font/google` (mismos hashes de
contenido en `/_next/static/media/`: `9dd75fad…`, `7b89a4fd…`, `e18f83c7…`), es decir, fuentes variables de Google Fonts.
Se tomaron de `https://www.garciainversionesinmobiliarias.com.ar/` el 2026-11-11, de modo que el texto se renderiza igual.

**Licencia:** SIL Open Font License 1.1, que permite autoalojar y redistribuir con el aviso de copyright y la licencia
incluidos: `OFL-Jost.txt` (The Jost Project Authors) y `OFL-CormorantGaramond.txt` (The Cormorant Project Authors).

**Alcance:** solo el subconjunto `latin` (lo que Next precargaba). Los únicos caracteres del sitio fuera de ese
subconjunto son símbolos (→ ☰ ✓ ▾ ↗) que estas familias nunca cubrieron y caen a la fuente del sistema, igual que antes.

**Para actualizar una fuente:** reemplazar el archivo, actualizar el hash de esta tabla y repetir la comparación de
posiciones de texto contra producción antes de integrar.
