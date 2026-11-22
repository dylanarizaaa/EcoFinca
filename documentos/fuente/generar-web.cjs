/**
 * Genera documentos/informe-web.html (versión web del informe) a partir de contenido.cjs.
 * Las imágenes se referencian como capturas/*.jpg (relativas a documentos/).
 * Uso:  node documentos/fuente/generar-web.cjs
 */

const fs = require('node:fs')
const path = require('node:path')
const { meta, sections } = require('./contenido.cjs')

const OUT = path.resolve(__dirname, '..', 'informe-web.html')

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(text) {
  return esc(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(«])_([^_]+)_/g, '$1<em>$2</em>')
    .replace(/(https?:\/\/[^\s)]+[^\s).,])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
}

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function block(b) {
  switch (b.t) {
    case 'p':
      return `<p>${inline(b.text)}</p>`
    case 'h2':
      return `<h3 id="${slug(b.text)}">${esc(b.text)}</h3>`
    case 'h3':
      return `<h4>${esc(b.text)}</h4>`
    case 'ul':
      return `<ul>${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`
    case 'ol':
      return `<ol>${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ol>`
    case 'table': {
      const narrow = (i) => b.widths[i] <= 8
      return `<div class="table-wrap"><table><thead><tr>${b.head
        .map((h, i) => `<th${narrow(i) ? ' class="c"' : ''}>${inline(h)}</th>`)
        .join('')}</tr></thead><tbody>${b.rows
        .map((r) => `<tr>${r.map((c, i) => `<td${narrow(i) ? ' class="c"' : ''}>${inline(c) || '&nbsp;'}</td>`).join('')}</tr>`)
        .join('')}</tbody></table></div>`
    }
    case 'note': {
      const pend = b.kind === 'pendiente'
      return `<aside class="note ${pend ? 'note--pend' : 'note--info'}"><span class="note__tag">${pend ? 'Pendiente' : 'Nota'}</span><p>${inline(
        b.text.replace(/^Pendiente:\s*/, ''),
      )}</p></aside>`
    }
    case 'formula':
      return `<pre class="formula">${b.lines.map(esc).join('\n')}</pre>`
    case 'img': {
      const narrow = b.width && b.width < 4
      return `<figure class="${narrow ? 'fig fig--narrow' : 'fig'}"><img src="${b.src}" alt="${esc(b.caption.replace(/^Figura \d+\.\s*/, ''))}" loading="lazy" decoding="async"><figcaption>${inline(b.caption)}</figcaption></figure>`
    }
    case 'refs':
      return `<ul class="refs">${b.items.map((i) => `<li>${inline(i)}</li>`).join('')}</ul>`
    default:
      throw new Error(`Bloque desconocido: ${b.t}`)
  }
}

const checklist = [
  ['ok', 'Investigación: problema, causas, impactos y soluciones', 'Capítulo 2'],
  ['ok', 'Diseño: elementos del ecosistema, requerimientos e interfaz', 'Capítulo 3'],
  ['ok', 'Desarrollo: herramientas, arquitectura, reglas y algoritmos', 'Capítulo 4'],
  ['ok', 'Pruebas técnicas, experimento y errores corregidos', 'Secciones 5.1 a 5.4'],
  ['pend', 'Aplicar el cuestionario a usuarios reales y registrar resultados', 'Sección 5.5 y Anexo A'],
  ['pend', 'Completar portada: nombre, ID, docente y ciudad', 'Portada del Word'],
  ['pend', 'Publicar el simulador o dar acceso al repositorio al docente', 'Capítulo 9'],
  ['pend', 'Verificar cifras de la FNC y formato APA de las referencias', 'Sección 2.1 y Referencias'],
]

const nav = sections
  .map((s) => {
    const subs = s.blocks.filter((b) => b.t === 'h2')
    return `<li><a href="#${s.id}">${esc(s.title)}</a>${
      subs.length ? `<ul>${subs.map((h) => `<li><a href="#${slug(h.text)}">${esc(h.text)}</a></li>`).join('')}</ul>` : ''
    }</li>`
  })
  .join('')

const body = sections
  .map((s) => `<section id="${s.id}" class="chapter"><h2>${esc(s.title)}</h2>${s.blocks.map(block).join('\n')}</section>`)
  .join('\n')

const html = `<title>Informe EcoFinca</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="${esc(meta.subtitulo)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Nunito:wght@700;800;900&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
/* Diseño: informe académico con la identidad del simulador. Banda de portada verde bosque,
   índice lateral fijo en pantallas anchas y una columna de lectura de ~70 caracteres. */
:root {
  --bg: #f7f8f4;
  --surface: #ffffff;
  --ink: #1c2a21;
  --muted: #5a665c;
  --line: #dde2d4;
  --accent: #2f6b3c;
  --accent-soft: #e6efdf;
  --hero: #234d35;
  --hero-ink: #f4f7f1;
  --hero-muted: #bcd6bd;
  --earth: #79563a;
  --zebra: #f3f6ef;
  --code: #eef1e9;
  --pend-bg: #fdf3dc;
  --pend-line: #c98a17;
  --pend-ink: #6b4a06;
  --info-bg: #eaf3f8;
  --info-line: #3f82a6;
  --info-ink: #24546e;
  --ok: #2f6b3c;
  --font-display: 'Nunito', 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-body: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SFMono-Regular', Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #111814; --surface: #18221c; --ink: #e6ebe3; --muted: #a2ada3; --line: #2b3a30;
    --accent: #8fc49a; --accent-soft: #1f3326; --hero: #183324; --hero-ink: #eef3ec; --hero-muted: #a8c9ad;
    --earth: #c9a27f; --zebra: #1c2820; --code: #1d2a22;
    --pend-bg: #2d2413; --pend-line: #d9a23a; --pend-ink: #f0d39a;
    --info-bg: #14262f; --info-line: #5aa3c7; --info-ink: #a9d3e8; --ok: #8fc49a;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #111814; --surface: #18221c; --ink: #e6ebe3; --muted: #a2ada3; --line: #2b3a30;
  --accent: #8fc49a; --accent-soft: #1f3326; --hero: #183324; --hero-ink: #eef3ec; --hero-muted: #a8c9ad;
  --earth: #c9a27f; --zebra: #1c2820; --code: #1d2a22;
  --pend-bg: #2d2413; --pend-line: #d9a23a; --pend-ink: #f0d39a;
  --info-bg: #14262f; --info-line: #5aa3c7; --info-ink: #a9d3e8; --ok: #8fc49a;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
body {
  background: var(--bg); color: var(--ink); font-family: var(--font-body);
  font-size: 16px; line-height: 1.65; -webkit-font-smoothing: antialiased;
}
a { color: var(--accent); text-underline-offset: 3px; }
a:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
.gutter { padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }

/* Portada */
.hero { background: var(--hero); color: var(--hero-ink); }
.hero__inner { max-width: 1180px; margin: 0 auto; padding-block: 48px 40px; display: grid; gap: 32px; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); align-items: center; }
.eyebrow { font-size: 12.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--hero-muted); font-weight: 600; margin: 0 0 14px; }
.hero h1 { font-family: var(--font-display); font-weight: 900; font-size: clamp(44px, 7vw, 76px); line-height: 1; margin: 0 0 14px; letter-spacing: -.02em; }
.hero h1 span { color: #a8c58b; }
.hero__sub { font-size: 18px; line-height: 1.5; color: var(--hero-ink); opacity: .92; margin: 0 0 22px; max-width: 34em; text-wrap: balance; }
.people { display: flex; flex-wrap: wrap; gap: 8px 22px; font-size: 14px; color: var(--hero-muted); margin: 0; padding: 0; list-style: none; }
.people b { color: var(--hero-ink); font-weight: 600; }
.hero figure { margin: 0; }
.hero img { width: 100%; border-radius: 14px; border: 3px solid rgba(255,255,255,.85); box-shadow: 0 18px 40px -18px rgba(0,0,0,.5); display: block; }
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 26px; }
.stat { border: 1px solid rgba(255,255,255,.16); border-radius: 12px; padding: 12px 14px; }
.stat b { display: block; font-family: var(--font-display); font-size: 26px; font-weight: 900; line-height: 1.1; color: #fff; }
.stat span { display: block; font-size: 12.5px; line-height: 1.35; color: var(--hero-muted); margin-top: 4px; }

/* Lista de revisión */
.review { max-width: 1180px; margin: 0 auto; padding-block: 28px 8px; }
.review__card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 20px 22px; }
.review h2 { font-family: var(--font-display); font-size: 20px; margin: 0 0 4px; }
.review p.lead { margin: 0 0 14px; color: var(--muted); font-size: 14.5px; }
.checks { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 22px; }
.checks li { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: start; font-size: 14.5px; line-height: 1.45; padding: 8px 0; border-top: 1px solid var(--line); }
.checks small { display: block; color: var(--muted); font-size: 12.5px; }
.pill { font-size: 11.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; border-radius: 999px; padding: 3px 9px; white-space: nowrap; margin-top: 1px; }
.pill--ok { background: var(--accent-soft); color: var(--ok); }
.pill--pend { background: var(--pend-bg); color: var(--pend-ink); box-shadow: inset 0 0 0 1px var(--pend-line); }

/* Cuerpo */
.layout { max-width: 1180px; margin: 0 auto; padding-block: 24px 80px; display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 48px; align-items: start; }
.toc { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 20px); max-height: calc(100vh - 40px); overflow-y: auto; font-size: 13.5px; padding-right: 6px; }
.toc summary { font-family: var(--font-display); font-weight: 800; font-size: 15px; cursor: pointer; list-style: none; margin-bottom: 8px; }
.toc summary::-webkit-details-marker { display: none; }
.toc ul { list-style: none; margin: 0; padding: 0; }
.toc > details > ul > li { margin: 2px 0 6px; }
.toc a { color: var(--muted); text-decoration: none; display: block; padding: 3px 8px; border-radius: 6px; line-height: 1.35; }
.toc > details > ul > li > a { color: var(--ink); font-weight: 600; }
.toc ul ul a { padding-left: 18px; font-size: 13px; }
.toc a:hover { background: var(--accent-soft); color: var(--ink); }
.toc a.is-active { background: var(--accent-soft); color: var(--accent); }
article { min-width: 0; max-width: 46rem; }
.chapter { padding-top: 8px; margin-bottom: 44px; scroll-margin-top: 16px; }
.chapter h2 { font-family: var(--font-display); font-weight: 900; font-size: clamp(26px, 3.2vw, 32px); line-height: 1.15; letter-spacing: -.01em; margin: 0 0 18px; padding-bottom: 12px; border-bottom: 2px solid var(--line); text-wrap: balance; }
h3 { font-family: var(--font-display); font-weight: 800; font-size: 21px; line-height: 1.25; margin: 30px 0 10px; scroll-margin-top: 16px; text-wrap: balance; }
h4 { font-size: 16px; font-weight: 700; margin: 22px 0 8px; color: var(--accent); }
p { margin: 0 0 14px; }
ul, ol { margin: 0 0 16px; padding-left: 1.3em; }
li { margin: 4px 0; }
li::marker { color: var(--accent); }
strong { font-weight: 650; }
.table-wrap { overflow-x: auto; margin: 6px 0 22px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
table { border-collapse: collapse; width: 100%; font-size: 14px; line-height: 1.45; font-variant-numeric: tabular-nums; }
th { text-align: left; font-weight: 600; font-size: 12.5px; letter-spacing: .02em; color: var(--muted); background: var(--zebra); padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: bottom; }
td { padding: 9px 12px; border-top: 1px solid var(--line); vertical-align: top; }
tbody tr:first-child td { border-top: 0; }
th.c, td.c { text-align: center; }
.note { border-radius: 12px; padding: 12px 16px; margin: 6px 0 18px; display: grid; gap: 4px; border-left: 4px solid; }
.note p { margin: 0; font-size: 14.5px; }
.note__tag { font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.note--pend { background: var(--pend-bg); border-color: var(--pend-line); color: var(--pend-ink); }
.note--info { background: var(--info-bg); border-color: var(--info-line); color: var(--info-ink); }
.formula { font-family: var(--font-mono); font-size: 13.5px; line-height: 1.7; background: var(--code); border-radius: 12px; padding: 14px 16px; overflow-x: auto; margin: 6px 0 16px; white-space: pre; }
.fig { margin: 18px 0 26px; }
.fig img { display: block; width: 100%; height: auto; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); }
.fig--narrow img { max-width: 300px; margin: 0 auto; }
figcaption { font-size: 13px; color: var(--muted); margin-top: 8px; text-align: center; }
.refs { list-style: none; padding: 0; }
.refs li { padding-left: 2em; text-indent: -2em; margin: 0 0 10px; font-size: 14.5px; }
.refs a { word-break: break-all; }
footer.site { border-top: 1px solid var(--line); color: var(--muted); font-size: 13px; }
footer.site div { max-width: 1180px; margin: 0 auto; padding-block: 22px; }

@media (max-width: 980px) {
  .hero__inner { grid-template-columns: minmax(0, 1fr); padding-block: 36px 32px; }
  .layout { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .toc { position: static; max-height: none; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; }
  article { max-width: none; }
}
@media (max-width: 640px) {
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .checks { grid-template-columns: minmax(0, 1fr); }
  .hero__sub { font-size: 16.5px; }
  table { font-size: 13px; }
}
</style>

<header class="hero">
  <div class="hero__inner gutter">
    <div>
      <p class="eyebrow">UNIMINUTO · ${esc(meta.curso)} · Proyecto final, tercer corte</p>
      <h1>Eco<span>Finca</span></h1>
      <p class="hero__sub">${esc(meta.subtitulo)}.</p>
      <ul class="people">
        <li>Estudiante: <b>${esc(meta.estudiante)}</b></li>
        <li>Docente: <b>${esc(meta.docente)}</b></li>
        <li>${esc(meta.periodo)}</li>
      </ul>
      <div class="stats" role="list">
        <div class="stat" role="listitem"><b>122</b><span>pruebas automatizadas</span></div>
        <div class="stat" role="listitem"><b>3</b><span>escenarios jugables</span></div>
        <div class="stat" role="listitem"><b>11</b><span>eventos con decisiones</span></div>
        <div class="stat" role="listitem"><b>92 vs 64</b><span>puntaje sostenible vs convencional</span></div>
      </div>
    </div>
    <figure><img src="capturas/04-mapa-general.jpg" alt="Pantalla principal de EcoFinca con el mapa de la finca y el panel de la parcela"></figure>
  </div>
</header>

<section class="review gutter" aria-labelledby="revision">
  <div class="review__card">
    <h2 id="revision">Lista de revisión antes de entregar</h2>
    <p class="lead">El simulador y el informe cubren los cuatro puntos de la actividad. Estos son los elementos que dependen de ti.</p>
    <ul class="checks">
      ${checklist
        .map(
          ([s, text, where]) =>
            `<li><span class="pill ${s === 'ok' ? 'pill--ok' : 'pill--pend'}">${s === 'ok' ? 'Listo' : 'Pendiente'}</span><span>${esc(text)}<small>${esc(where)}</small></span></li>`,
        )
        .join('')}
    </ul>
  </div>
</section>

<div class="layout gutter">
  <nav class="toc" aria-label="Contenido del informe">
    <details open id="toc-details"><summary>Contenido</summary><ul>${nav}</ul></details>
  </nav>
  <article>
${body}
  </article>
</div>

<footer class="site"><div class="gutter">EcoFinca · Informe final · ${esc(meta.curso)} · ${esc(meta.fecha)}. Modelo educativo simplificado: coeficientes y precios de referencia hipotéticos.</div></footer>

<script>
(function () {
  var details = document.getElementById('toc-details');
  var mq = window.matchMedia('(max-width: 980px)');
  function sync() { if (mq.matches) details.removeAttribute('open'); else details.setAttribute('open', ''); }
  sync();
  if (mq.addEventListener) mq.addEventListener('change', sync);
  details.addEventListener('click', function (e) {
    if (e.target.tagName === 'A' && mq.matches) details.removeAttribute('open');
  });
  if (!('IntersectionObserver' in window)) return;
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
  var targets = Array.prototype.slice.call(document.querySelectorAll('.chapter, .chapter h3[id]'));
  var current = null;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting && byId[en.target.id]) {
        if (current) current.classList.remove('is-active');
        current = byId[en.target.id];
        current.classList.add('is-active');
      }
    });
  }, { rootMargin: '0px 0px -75% 0px' });
  targets.forEach(function (t) { io.observe(t); });
})();
</script>
`

fs.writeFileSync(OUT, html)
console.log(`Generado: ${OUT} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`)
