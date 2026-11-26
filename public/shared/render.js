// Gera o HTML do site a partir do conteúdo (content/default.json ou o que estiver salvo no painel).
// Módulo puro (sem Node, sem DOM): roda no build.mjs, nas Pages Functions e no navegador (prévia do painel).
//
//   renderSite(content, meta, { assetV, preview })
//     content — documento do site (ver content/default.json)
//     meta    — mapa "chave da imagem" → { w, h, lg, sm } (assets/img/meta.json + uploads do painel)
//     assetV  — sufixo ?v= para css/js (cache busting)
//     preview — true na prévia do painel (adiciona <base href="/"> e pula a abertura)

export const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ------------------------------------------------------------ sanitizers */
// The content comes from an authenticated editor, but it still ends up inside CSS, attributes
// and inline scripts, so every value is checked before it is written into the page.
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export const color = (v, d) => (typeof v === "string" && HEX.test(v.trim()) ? v.trim() : d);
export const num = (v, min, max, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
const bool = (v, d) => (typeof v === "boolean" ? v : d);
const fontName = (s) => String(s || "").replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 60);
const weights = (s) => (String(s || "").match(/\d{3}/g) || ["400", "700"]).filter((w, i, a) => a.indexOf(w) === i).sort().join(";");
// Links: http(s), mailto, or a relative path inside the site (assets/…, media/…)
export function safeUrl(u, d = "#") {
  const s = String(u || "").trim();
  if (/^(https?:\/\/|mailto:)[^\s"'<>`]+$/i.test(s)) return s;
  if (/^[\w\-./%]+$/.test(s) && !s.includes("..") && !s.startsWith("//")) return s;
  return d;
}
const cssUrl = (u) => safeUrl(u, "").replace(/[()"'\\]/g, "");
const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "x";
// JSON for an inline <script>: no "</script>" or "<!--" can break out of it
const jsonScript = (o) => JSON.stringify(o).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

/* --------------------------------------------------------------- defaults */
// Swapped for the site's address (https://…) by the server when the page is served
export const ORIGIN_PLACEHOLDER = "__ORIGIN__";
export const DEFAULT_COLORS ={ bg: "#2748D0", bgDeep: "#1A2F8F", surface: "#2140B8", tint: "#3A5BE0", ink: "#F5F3EE", accent: "#FF3B3B", sky: "#2FC9FF", sun: "#FFD23F" };
export const DEFAULT_MOTION = {
  enabled: true, speed: 1, loader: true,
  smoothScroll: true, scrollLerp: 0.1, anchorDuration: 1.4,
  revealDuration: 1100, revealStagger: 70, revealDistance: 48,
  marquee: true, marqueeSpeed: 0.45,
  burst: true, burstCount: 10,
  magnetic: true, magnetStrength: 0.3,
  carouselEntrance: true, floatBreathe: true,
};

export function cleanMotion(m = {}) {
  const D = DEFAULT_MOTION;
  return {
    enabled: bool(m.enabled, D.enabled), speed: num(m.speed, 0.25, 3, D.speed), loader: bool(m.loader, D.loader),
    smoothScroll: bool(m.smoothScroll, D.smoothScroll), scrollLerp: num(m.scrollLerp, 0.02, 1, D.scrollLerp),
    anchorDuration: num(m.anchorDuration, 0, 4, D.anchorDuration),
    revealDuration: num(m.revealDuration, 0, 4000, D.revealDuration), revealStagger: num(m.revealStagger, 0, 400, D.revealStagger),
    revealDistance: num(m.revealDistance, 0, 200, D.revealDistance),
    marquee: bool(m.marquee, D.marquee), marqueeSpeed: num(m.marqueeSpeed, 0, 2, D.marqueeSpeed),
    burst: bool(m.burst, D.burst), burstCount: Math.round(num(m.burstCount, 0, 40, D.burstCount)),
    magnetic: bool(m.magnetic, D.magnetic), magnetStrength: num(m.magnetStrength, 0, 1, D.magnetStrength),
    carouselEntrance: bool(m.carouselEntrance, D.carouselEntrance), floatBreathe: bool(m.floatBreathe, D.floatBreathe),
  };
}

/* ------------------------------------------------------------------ fonts */
// A font slot is { source: "google", family, weights } | { source: "file", family, files: [{ url, weight, style }] }
// | { source: "system", family } | { source: "same" } (display only: reuse the body font)
function fontCss(slot, fallbackFamily) {
  if (!slot || slot.source === "same") return { family: null, link: null, faces: "" };
  const family = fontName(slot.family) || fallbackFamily;
  if (slot.source === "google") {
    const fam = family.replace(/ /g, "+");
    return { family, link: `https://fonts.googleapis.com/css2?family=${fam}:wght@${weights(slot.weights)}&display=swap`, faces: "" };
  }
  if (slot.source === "file") {
    const faces = (slot.files || []).filter((f) => cssUrl(f.url)).map((f) => {
      const u = cssUrl(f.url), ext = (u.split(".").pop() || "").toLowerCase();
      const fmt = { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" }[ext] || "woff2";
      return `@font-face{font-family:"${family}";src:url("${u}") format("${fmt}");font-weight:${num(f.weight, 100, 900, 400)};font-style:${f.style === "italic" ? "italic" : "normal"};font-display:swap}`;
    }).join("");
    return { family, link: null, faces };
  }
  return { family, link: null, faces: "" }; // system font: just the name
}

export function themeCss(theme = {}) {
  const c = { ...DEFAULT_COLORS };
  for (const k of Object.keys(DEFAULT_COLORS)) c[k] = color(theme.colors && theme.colors[k], DEFAULT_COLORS[k]);
  const fonts = theme.fonts || {};
  const body = fontCss(fonts.body || { source: "google", family: "Plus Jakarta Sans", weights: "400;500;700;800" }, "Plus Jakarta Sans");
  const display = fontCss(fonts.display, body.family);
  const bodyFam = body.family || "Plus Jakarta Sans";
  const dispFam = display.family || bodyFam;
  const radius = num(theme.radius, 0, 40, 10);
  const css = `${body.faces}${display.faces}:root{--bg:${c.bg};--bg-deep:${c.bgDeep};--surface:${c.surface};--tint:${c.tint};--ink:${c.ink};`
    + `--ink-soft:color-mix(in srgb,${c.ink} 78%,transparent);--line:color-mix(in srgb,${c.ink} 26%,transparent);`
    + `--accent:${c.accent};--sky:${c.sky};--sun:${c.sun};--radius:${radius}px;`
    + `--sans:"${bodyFam}","Noto Sans JP",system-ui,sans-serif;--display:"${dispFam}",system-ui,sans-serif;`
    + `--pattern-opacity:${num(theme.patternOpacity, 0, 0.5, 0.07)};--pattern-duration:${num(theme.patternDuration, 4, 240, 36)}s}`;
  const links = [body.link, display.link].filter(Boolean);
  return { css, links, colors: c };
}

/* ----------------------------------------------------------------- images */
// root: "" on the live site (relative paths), "/" in the panel preview (srcdoc iframe)
const assetPath = (p, root = "") => (/^https?:/.test(p) ? p : root + (/^(media|assets)\//.test(p) ? p : "assets/img/" + p));
const rooted = (u, root) => (root && u && !/^(https?:|mailto:|#|\/)/.test(u) ? root + u : u);

export function makeImages(meta, root = "") {
  function info(file) {
    const m = meta[file];
    if (!m) return null;
    const s = Math.min(1, 1800 / m.w);
    return { ...m, lgW: Math.round(m.w * s), lgH: Math.round(m.h * s), ratio: m.w / m.h, lgSrc: assetPath(m.lg, root), smSrc: assetPath(m.sm || m.lg, root) };
  }
  function img(file, { alt = "", sizes = "100vw", lazy = true, priority = false, cls = "", style = "" } = {}) {
    const i = info(file);
    if (!i) return "";
    const srcset = i.w > 800 && i.sm ? `${i.smSrc} 800w, ${i.lgSrc} ${i.lgW}w` : `${i.lgSrc} ${i.lgW}w`;
    return `<img src="${i.lgW > 800 && i.sm ? i.smSrc : i.lgSrc}" srcset="${srcset}" sizes="${sizes}" width="${i.lgW}" height="${i.lgH}" alt="${esc(alt)}"`
      + (lazy ? ` loading="lazy" decoding="async"` : "") + (priority ? ` fetchpriority="high"` : "")
      + (cls ? ` class="${cls}"` : "") + (style ? ` style="${esc(style)}"` : "") + `>`;
  }
  return { info, img };
}

const zoomIcon = `<span class="zoom" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 3v12M3 9h12"/></svg></span>`;
const arrow = (d) => `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const nn = (i) => String(i + 1).padStart(2, "0");

/* -------------------------------------------------------------------- page */
export function renderSite(content, meta = {}, opts = {}) {
  const C = content || {};
  const S = C.site || {};
  const I = (C.i18n && C.i18n.pt) || {};
  const tr = (k, d = "") => esc(I[k] ?? d);
  const root = opts.preview ? "/" : "";
  const { info, img } = makeImages(meta, root);
  const v = esc(opts.assetV || "1");
  const theme = themeCss(C.theme);
  const motion = cleanMotion(C.motion);
  if (opts.preview) motion.loader = false;
  const ok = (list) => (Array.isArray(list) ? list : []).filter((x) => x && info(x.src));

  // Carousel following the modern-web-guidance carousel pattern
  function carousel({ group, label, items, layout = "peek-layout", ratioCss = "4/3", sizes, pos = "" }) {
    const n = items.length;
    const slides = items.map(({ src, alt }, i) =>
      `<figure class="slide" role="group" aria-roledescription="slide" aria-label="${i + 1} de ${n}" data-pos="${i + 1}">`
      + `<button type="button" data-lightbox="${group}" data-full="${info(src).lgSrc}" data-alt="${esc(alt)}" aria-label="Ampliar imagem: ${esc(alt)}" data-cursor="view">`
      + img(src, { alt, sizes }) + `</button>${zoomIcon}</figure>`).join("\n        ");
    return `<div class="carousel ${layout}${pos ? " pos-" + slug(pos) : ""}" role="region" aria-roledescription="carousel" aria-label="${esc(label)}" data-carousel>
      <div class="bar">
        <div class="arrows"><span class="count" aria-hidden="true"></span>
          <button type="button" class="prev" data-i18n-aria="ui.prev" aria-label="Anterior">${arrow("M11 3 5 9l6 6")}</button>
          <button type="button" class="next" data-i18n-aria="ui.next" aria-label="Próximo">${arrow("M7 3l6 6-6 6")}</button>
        </div>
        <nav class="markers" data-i18n-aria="ui.slides" aria-label="Imagens"></nav>
      </div>
      <div class="track" tabindex="0" style="--r:${ratioCss}">
        ${slides}
      </div>
      <p class="visually-hidden" role="status" aria-live="polite"></p>
    </div>`;
  }

  const worksList = (C.works || []).map((w) => ({ ...w, id: slug(w.id), images: ok(w.images) })).filter((w) => w.images.length);
  const filtersList = ["all", ...(C.filters || []).map(slug)];

  const cards = worksList.map((w, i) => {
    const cover = w.cover && info(w.cover) ? w.cover : w.images[0].src;
    const tags = (Array.isArray(w.tags) ? w.tags : String(w.tags || "").split(" ")).map(slug).join(" ");
    return `<li data-tags="${tags}"><a class="work-card${w.pos ? " pos-" + slug(w.pos) : ""}" href="#${w.id}" data-project="${w.id}" data-cursor="view">
          <span class="work-card-img">${img(cover, { alt: "", sizes: "(max-width: 600px) 92vw, (max-width: 1000px) 46vw, 31vw" })}</span>
          <span class="work-card-meta"><span class="work-index">${nn(i)}</span><strong>${esc(w.title)}</strong><span class="work-card-cat" data-i18n="${w.id}.cat">${tr(w.id + ".cat")}</span></span>
        </a></li>`;
  }).join("\n        ");
  const filters = filtersList.map((f) => `<li><button type="button" class="chip" data-filter="${f}" aria-pressed="${f === "all"}" data-i18n="filter.${f}">${tr("filter." + f)}</button></li>`).join("");

  const works = worksList.map((w, i) => `
    <article class="work" id="${w.id}" aria-labelledby="${w.id}-t">
      <div class="work-top" data-reveal="stagger">
        <div><span class="work-index">${nn(i)} / ${String(worksList.length).padStart(2, "0")}</span><h3 id="${w.id}-t">${esc(w.title)}</h3><p class="meta" data-i18n="${w.id}.cat">${tr(w.id + ".cat")}</p></div>
        <p data-i18n="${w.id}.desc">${tr(w.id + ".desc")}</p>
      </div>
      ${carousel({ group: w.id, label: w.title, items: w.images, pos: w.pos, sizes: "(max-width: 700px) 86vw, 78vw" })}
    </article>`).join("\n");

  const moreList = (C.more || []).map((p) => ({ ...p, id: slug(p.id), images: ok(p.images) })).filter((p) => p.images.length);
  const more = moreList.map((p) => `<li><button type="button" data-more="${p.id}" data-preview="${info(p.images[0].src).smSrc}" data-cursor="view">
          <strong>${esc(p.title)}</strong><span data-i18n="more.${p.id}">${tr("more." + p.id)}</span></button>
          <div hidden>${p.images.map(({ src, alt }) => `<span data-lightbox="more-${p.id}" data-full="${info(src).lgSrc}" data-alt="${esc(alt)}"></span>`).join("")}</div></li>`).join("\n        ");

  const gallery = ok(C.gallery).map(({ src, alt }) =>
    `<button type="button" data-lightbox="gallery" data-full="${info(src).lgSrc}" data-alt="${esc(alt)}" aria-label="Ampliar imagem: ${esc(alt)}" data-cursor="view">${img(src, { alt, sizes: "(max-width: 600px) 50vw, 25vw" })}</button>`
  ).join("\n        ");

  const video = S.video && /^https:\/\//.test(S.video.src || "") ? S.video : null;
  const skills = (C.skills || []).map((s) => ({ ...s, id: slug(s.id), images: ok(s.images), video: !!(s.video && video) }));
  const chips = skills.map((s) =>
    `<li><button type="button" class="chip" data-skill="${s.id}" aria-haspopup="dialog">${esc(s.name)}<span class="chip-n" aria-hidden="true">${s.images.length + (s.video ? 1 : 0)}</span></button></li>`).join("");
  const skillTemplates = skills.map((s) => `<template id="tpl-${s.id}" data-name="${esc(s.name)}" data-count="${s.images.length + (s.video ? 1 : 0)}">
  ${s.video ? `<div class="skill-video"><iframe data-src="${esc(safeUrl(video.src))}" title="${esc(video.title)}" allow="autoplay; fullscreen" loading="lazy"></iframe><p data-i18n="skill.video">${esc(video.title)}</p></div>` : ""}
  <div class="skill-grid">${s.images.map(({ src, alt }) =>
    `<button type="button" class="skill-item" data-lightbox="skill-${s.id}" data-full="${info(src).lgSrc}" data-alt="${esc(alt)}" aria-label="Ampliar imagem: ${esc(alt)}" data-cursor="view">${img(src, { alt, sizes: "(max-width: 700px) 45vw, 260px" })}</button>`).join("")}</div>
</template>`).join("\n");

  const pops = ok(C.hero && C.hero.floats).slice(0, 3).map(({ src }) => `<span class="pop">${img(src, { alt: "", sizes: "(max-width: 800px) 30vw, 200px", lazy: false })}</span>`).join("");
  const facts = (C.aboutFacts || ["1", "2", "4", "5", "3"]).map(slug).map((k) =>
    `<div><dt data-i18n="about.k${k}">${tr("about.k" + k)}</dt><dd data-i18n="about.v${k}">${tr("about.v" + k)}</dd></div>`).join("\n        ");

  const name = esc(S.name || "");
  const lines = (S.heroLines && S.heroLines.length ? S.heroLines : [S.name || ""]).map((l) => `<span class="line" aria-hidden="true">${esc(l)}</span>`).join("");
  const email = esc(S.email || "");
  const links = (S.links || []).filter((l) => l && l.label && l.url).map((l) =>
    `<a class="btn ghost" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">${esc(l.label)} <span class="arrow" aria-hidden="true">↗</span></a>`).join("\n          ");
  const logo = esc(rooted(safeUrl(S.logo, "assets/brand/logo.svg"), root));
  const mascot = esc(rooted(safeUrl(S.mascot, "assets/brand/mascote.svg"), root));
  // Share card (WhatsApp, LinkedIn…): these sites need an absolute URL, so the server swaps
  // ORIGIN_PLACEHOLDER for the site's address when it serves the page. Default: a 1200×630 JPG.
  const origin = opts.origin != null ? String(opts.origin).replace(/\/$/, "") : ORIGIN_PLACEHOLDER;
  const abs = (u) => (/^https?:\/\//i.test(u) ? u : origin + "/" + String(u).replace(/^\.?\//, ""));
  const ogPick = S.ogImage && info(S.ogImage);
  const og = esc(abs(ogPick ? ogPick.lgSrc : "assets/brand/og-cover.jpg"));
  const ogSize = ogPick ? (ogPick.lgW && ogPick.lgH ? [ogPick.lgW, ogPick.lgH] : null) : [1200, 630];
  const banner = C.banner && info(C.banner.src) ? C.banner : null;
  const portrait = C.portrait && info(C.portrait.src) ? C.portrait : null;
  const contactArt = C.contactArt && info(C.contactArt.src) ? C.contactArt : null;
  const T = C.theme || {};

  const config = {
    motion,
    colors: theme.colors,
    cv: { pt: rooted(safeUrl(S.cv && S.cv.pt, ""), root), en: rooted(safeUrl(S.cv && (S.cv.en || S.cv.pt), ""), root) },
    preview: !!opts.preview,
    lang: opts.lang || null,
  };
  const htmlClass = [T.pixelCursors === false ? "no-pixel-cursor" : "", T.pattern === false ? "no-pattern" : "", motion.floatBreathe ? "" : "no-breathe"].filter(Boolean).join(" ");

  return `<!doctype html>
<html lang="pt-BR"${htmlClass ? ` class="${htmlClass}"` : ""}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${opts.preview ? '<base href="/">\n<meta name="robots" content="noindex">\n' : ""}<title>${tr("doc.title", S.name)}</title>
<meta name="description" content="${tr("doc.description")}">
<meta name="theme-color" content="${theme.colors.bg}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${name}">
<meta property="og:locale" content="pt_BR">
<meta property="og:url" content="${esc(origin)}/">
<meta property="og:title" content="${tr("doc.title", S.name)}">
<meta property="og:description" content="${tr("doc.description")}">
<meta property="og:image" content="${og}">
${ogSize ? `<meta property="og:image:width" content="${ogSize[0]}">\n<meta property="og:image:height" content="${ogSize[1]}">\n` : ""}<meta property="og:image:alt" content="${name}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${og}">
<link rel="icon" href="${logo}"${/\.svg$/i.test(logo) ? ' type="image/svg+xml"' : ""}>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap">
${theme.links.map((l) => `<link rel="stylesheet" href="${esc(l)}">`).join("\n")}
<link rel="stylesheet" href="${root}css/style.css?v=${v}">
<style id="theme">${theme.css.replace(/</g, "")}</style>
<script>document.documentElement.classList.add("js");if(matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("reduced");</script>
</head>
<body>
<a class="skip" href="#main" data-i18n="skip">${tr("skip")}</a>

${motion.enabled && motion.loader ? `<div class="loader" aria-hidden="true">
  <img class="loader-logo" src="${logo}" alt="" width="84" height="84">
  <span class="loader-count">0</span>
</div>` : ""}
<div class="progress" aria-hidden="true"></div>
<div class="bg-pattern" aria-hidden="true"><div></div></div>
<div class="preview" aria-hidden="true"><img alt=""></div>

<header class="site-header">
  <a class="brand" href="#top" aria-label="${name} — início">
    <img class="brand-logo" src="${logo}" alt="" width="48" height="48">
    <span class="brand-name" lang="pt-BR" translate="no">${name}</span>
  </a>
  <nav class="nav" id="nav" aria-label="Principal">
    <ul>
      <li><a href="#sobre"><span class="roll" data-i18n="nav.about">${tr("nav.about")}</span></a></li>
      <li><a href="#trabalhos"><span class="roll" data-i18n="nav.works">${tr("nav.works")}</span></a></li>
      <li><a href="#ilustracoes"><span class="roll" data-i18n="nav.illus">${tr("nav.illus")}</span></a></li>
      <li><a href="#colagens"><span class="roll" data-i18n="nav.collage">${tr("nav.collage")}</span></a></li>
      <li><a href="#contato"><span class="roll" data-i18n="nav.contact">${tr("nav.contact")}</span></a></li>
    </ul>
  </nav>
  <div class="tools">
    <div class="lang" role="group" aria-label="Idioma / Language">
      <button type="button" data-lang="pt" aria-pressed="true">PT</button>
      <button type="button" data-lang="en" aria-pressed="false">EN</button>
      <button type="button" data-lang="ja" aria-pressed="false" lang="ja">JA</button>
    </div>
    <button type="button" class="burger" aria-expanded="false" aria-controls="nav" data-i18n-aria="nav.menu" aria-label="Menu"><span></span></button>
  </div>
</header>

<main id="main">
  <section class="hero" id="top" aria-labelledby="h1">
    <div class="hero-title">
      <h1 id="h1" lang="pt-BR" translate="no" aria-label="${name}">${lines}</h1>
      <div class="hero-stage">
        <div class="hero-pops" aria-hidden="true">${pops}</div>
        <button type="button" class="hero-mascot" data-i18n-aria="hero.mascot" aria-label="${tr("hero.mascot")}"><img src="${mascot}" alt="" width="368" height="328"></button>
      </div>
    </div>
    <div class="hero-row">
      <a class="btn" href="#trabalhos"><span data-i18n="hero.cta">${tr("hero.cta")}</span><span class="arrow" aria-hidden="true">→</span></a>
    </div>
    <span class="scroll-hint" aria-hidden="true"></span>
  </section>

  <div class="marquee" aria-hidden="true"><div class="marquee-track"></div></div>

${banner ? `  <section class="banner" aria-label="Ilustração em destaque">
    <figure data-reveal>${img(banner.src, { alt: banner.alt, sizes: "100vw", lazy: false, style: `object-position:${String(banner.pos || "50% 50%").replace(/[^\d.% a-z]/gi, "")}` })}</figure>
  </section>
` : ""}
  <section id="sobre" class="about" aria-labelledby="about-t">
    <div data-reveal>
      ${portrait ? `<figure class="portrait">${img(portrait.src, { alt: portrait.alt, sizes: "(max-width: 860px) 80vw, 36vw" })}</figure>` : ""}
    </div>
    <div>
      <h2 id="about-t" data-reveal="split" data-i18n="about.title">${tr("about.title")}</h2>
      <p class="years" data-reveal><strong data-i18n="about.yearsN">${tr("about.yearsN")}</strong><span data-i18n="about.years">${tr("about.years")}</span></p>
      <div class="body" data-reveal="stagger"><p data-i18n="about.p1">${tr("about.p1")}</p><p data-i18n="about.p2">${tr("about.p2")}</p></div>
      <p class="chips-hint" data-i18n="skill.hint">${tr("skill.hint")}</p>
      <ul class="chips" aria-label="Softwares" data-reveal="stagger">${chips}</ul>
      <dl data-reveal="stagger">
        ${facts}
      </dl>
      <div class="about-actions"><a class="btn ghost" data-cv download><span data-i18n="about.cv">${tr("about.cv")}</span><span class="arrow" aria-hidden="true">↓</span></a></div>
    </div>
  </section>

  <section id="trabalhos" class="surface" aria-labelledby="works-t">
    <div class="head"><h2 id="works-t" data-reveal="split"><span data-i18n="works.title">${tr("works.title")}</span><span class="n">(${String(worksList.length).padStart(2, "0")})</span></h2><p data-reveal data-i18n="works.intro">${tr("works.intro")}</p></div>
    <ul class="filters" data-i18n-aria="filter.label" aria-label="Filtrar projetos">${filters}</ul>
    <ul class="work-grid">
        ${cards}
    </ul>
    <p class="visually-hidden" role="status" aria-live="polite" data-filter-status></p>
    <!-- Full projects: shown inline without JS; with JS each one is moved into the project window -->
    <div class="work-store">
${works}
    </div>
${moreList.length ? `    <div class="more" data-reveal>
      <h3 data-i18n="more.title">${tr("more.title")}</h3>
      <ul>
        ${more}
      </ul>
    </div>
` : ""}  </section>

  <section id="ilustracoes" aria-labelledby="ill-t">
    <div class="head"><h2 id="ill-t" data-reveal="split" data-i18n="illus.title">${tr("illus.title")}</h2><p data-reveal data-i18n="illus.intro">${tr("illus.intro")}</p></div>
    ${ok(C.illus).length ? carousel({ group: "illus", label: I["illus.title"] || "Ilustrações", items: ok(C.illus), layout: "cards", ratioCss: "1/1", sizes: "(max-width: 700px) 86vw, 46vw" }) : ""}
    <h3 class="visually-hidden" data-i18n="illus.more">${tr("illus.more")}</h3>
    <div class="gallery" id="gallery" data-reveal="stagger">
        ${gallery}
    </div>
    ${ok(C.gallery).length > 6 ? `<button type="button" class="btn ghost gallery-toggle" aria-controls="gallery" aria-expanded="false"><span data-i18n="illus.showMore">${tr("illus.showMore")}</span><span class="arrow" aria-hidden="true">↓</span></button>` : ""}
  </section>

  <section id="colagens" class="surface" aria-labelledby="col-t">
    <div class="head"><h2 id="col-t" data-reveal="split" data-i18n="collage.title">${tr("collage.title")}</h2></div>
    ${ok(C.collage).length ? carousel({ group: "collage", label: I["collage.title"] || "Graphic Montages", items: ok(C.collage), layout: "cards", ratioCss: "1/1", sizes: "(max-width: 700px) 86vw, 46vw" }) : ""}
  </section>

  <section id="contato" class="dark contact" aria-labelledby="ct-t">
    <div class="contact-grid">
      <div>
        <p data-i18n="contact.kicker" style="opacity:.75">${tr("contact.kicker")}</p>
        <h2 id="ct-t" data-reveal="split" data-i18n="contact.title">${tr("contact.title")}</h2>
        <p data-reveal data-i18n="contact.text" style="max-width:44ch;margin-bottom:1.6rem">${tr("contact.text")}</p>
${email ? `        <div class="mail-row">
          <a class="mail" href="mailto:${email}">${email}</a>
          <button type="button" class="copy" data-copy="${email}" data-i18n="contact.copy">${tr("contact.copy")}</button>
        </div>
` : ""}        <div class="links">
          ${config.cv.pt ? `<a class="btn" data-cv download><span data-i18n="contact.cv">${tr("contact.cv")}</span><span class="arrow" aria-hidden="true">↓</span></a>` : ""}
          ${links}
        </div>
      </div>
      ${contactArt ? `<figure class="contact-art" data-reveal>${img(contactArt.src, { alt: contactArt.alt, sizes: "(max-width: 860px) 70vw, 420px" })}</figure>` : ""}
    </div>
    <div class="foot">
      <span>© <span data-year>2026</span> ${name}</span>
      <button type="button" class="to-top"><span data-i18n="top">${tr("top")}</span><img src="${mascot}" alt="" width="44" height="44"></button>
    </div>
  </section>
</main>

<dialog class="lightbox" aria-label="Imagem ampliada" closedby="any">
  <div class="lb-stage"><img alt=""></div>
  <p class="lb-caption"><b></b><span></span></p>
  <button type="button" class="lb-btn lb-close" data-i18n-aria="ui.close" aria-label="Fechar">${arrow("M4 4l10 10M14 4 4 14")}</button>
  <button type="button" class="lb-btn lb-prev" data-i18n-aria="ui.prev" aria-label="Anterior">${arrow("M11 3 5 9l6 6")}</button>
  <button type="button" class="lb-btn lb-next" data-i18n-aria="ui.next" aria-label="Próximo">${arrow("M7 3l6 6-6 6")}</button>
</dialog>
<dialog class="project-modal" closedby="any" data-lenis-prevent>
  <div class="pm-bar">
    <div class="pm-nav">
      <button type="button" class="lb-btn pm-prev" data-i18n-aria="work.prev" aria-label="Projeto anterior">${arrow("M11 3 5 9l6 6")}</button>
      <span class="pm-count" aria-hidden="true"></span>
      <button type="button" class="lb-btn pm-next" data-i18n-aria="work.next" aria-label="Próximo projeto">${arrow("M7 3l6 6-6 6")}</button>
    </div>
    <button type="button" class="lb-btn pm-close" data-i18n-aria="ui.close" aria-label="Fechar">${arrow("M4 4l10 10M14 4 4 14")}</button>
  </div>
  <div class="pm-body"></div>
</dialog>
<button type="button" class="fab-top" data-i18n-aria="top" aria-label="Voltar ao topo" hidden>${arrow("M9 15V3M3 9l6-6 6 6")}</button>
<dialog class="skill-modal" aria-labelledby="skill-t" closedby="any">
  <div class="skill-head">
    <div><p class="skill-kicker" data-i18n="skill.made">${tr("skill.made")}</p><h2 id="skill-t"></h2><p class="skill-count"></p></div>
    <button type="button" class="lb-btn skill-close" data-i18n-aria="ui.close" aria-label="Fechar">${arrow("M4 4l10 10M14 4 4 14")}</button>
  </div>
  <div class="skill-body"></div>
</dialog>
${skillTemplates}
<div class="toast" role="status" aria-live="polite"></div>

<script>window.I18N=${jsonScript(C.i18n || { pt: {} })};window.SITE_CONFIG=${jsonScript(config)};</script>
<script src="https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.umd.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer></script>
<script src="${root}js/main.js?v=${v}" defer></script>
</body>
</html>
`;
}
