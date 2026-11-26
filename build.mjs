// Gera site/index.html a partir dos dados abaixo + assets/img/meta.json.
// Uso:  node build.mjs     (rode dentro da pasta site/)
// Para trocar imagens/projetos, edite DATA e rode de novo.
import fs from "node:fs";
import crypto from "node:crypto";

// Cache busting: each CSS/JS link gets ?v=<hash of the file>, so browsers (and GitHub Pages)
// fetch the new file whenever it changes. Re-run the build after editing css/ or js/.
const ver = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 8);

const meta = JSON.parse(fs.readFileSync("assets/img/meta.json", "utf8"));
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/* ------------------------------------------------------------------ DATA */
const DATA = {
  // Saem da cabeça do mascote no hero (esquerda, centro, direita)
  heroFloat: [
    ["trabalhos/trabalhos_32.png", "Mulher carregando ecobag verde com o selo da Quitanda Kanashiro"],
    ["trabalhos/trabalhos_06.png", "Pose da mascote LUMA"],
    ["trabalhos/trabalhos_24.png", "Símbolo floral da marca Rama Forte em branco sobre vermelho"],
  ],
  banner: { file: "ilustracoes/ilustracoes_04.png", pos: "30% 45%", alt: "Dragão oriental vermelho e dourado serpenteando entre nuvens estilizadas sobre fundo azul-petróleo" },
  portrait: { file: "home/sobre_mim.jpeg", alt: "Retrato de Guilherme Eccel Superti ao ar livre, de blazer marrom e camiseta preta" },
  // pos: "top" mostra o topo da imagem quando ela é cortada (telas de site)
  // tags: filtros da grade de projetos (ver FILTERS); cover: capa do card (padrão: 1ª imagem)
  works: [
    { id: "luma", title: "LUMA — Mascote IFSC Design", tags: "mascot", images: [
      ["trabalhos/trabalhos_06.png", "Pose da mascote LUMA"],
      ["trabalhos/trabalhos_11.png", "Cartaz da mascote LUMA aplicado em parede de tijolos"],
      ["trabalhos/trabalhos_08.png", "Camiseta com a mascote LUMA em mockup sobre parede roxa"],
      ["trabalhos/trabalhos_07.png", "Caneca personalizada com a mascote LUMA"],
      ["trabalhos/trabalhos_09.png", "Cartela de adesivos com sete poses e expressões da LUMA"],
      ["trabalhos/trabalhos_04.png", "LUMA de corpo inteiro sobre padrão gráfico roxo"],
    ]},
    { id: "rama", title: "Hortifruti Rama Forte", tags: "identity mascot", images: [
      ["trabalhos/trabalhos_24.png", "Símbolo floral da marca Rama Forte em branco sobre vermelho"],
      ["trabalhos/trabalhos_26.png", "Mascote caqui da Rama Forte fazendo joinha"],
      ["trabalhos/trabalhos_13.png", "Post anunciando a novidade Ameixa Rubimel com o mascote"],
      ["trabalhos/trabalhos_15.png", "Post promocional de caqui com textura de papel rasgado e mascote"],
      ["trabalhos/trabalhos_20.png", "Post de inauguração do novo sacolão Rama Forte na Vila Diva"],
      ["trabalhos/trabalhos_22.jpg", "Fachada da loja Hortifruti Rama Forte com o letreiro vermelho aplicado"],
    ]},
    { id: "dragao", title: "O Caminho do Dragão", tags: "packaging identity", images: [
      ["trabalhos/trabalhos_59.jpg", "Caixa, cartas, manual e tabuleiro do jogo O Caminho do Dragão expostos no SBGames"],
      ["trabalhos/trabalhos_61.jpg", "Detalhe do tabuleiro modular com peças de dragão e baralhos de cartas"],
      ["trabalhos/trabalhos_58.png", "Arte planificada da caixa do jogo com dragões vermelho e azul"],
      ["trabalhos/trabalhos_60.jpg", "Anúncio dos finalistas do SBoardGames com Caminho do Dragão na lista"],
    ]},
    { id: "c2e", title: "C2E — Engenharia Elétrica", tags: "identity mascot", images: [
      ["trabalhos/trabalhos_48.png", "Camiseta preta da C2E com o peru, raio e os valores da empresa"],
      ["trabalhos/trabalhos_46.png", "Camiseta C2E com o peru em estilo pôster e a palavra Energia"],
      ["trabalhos/trabalhos_47.png", "Logo C2E ao lado do mascote peru fazendo joinha"],
    ]},
    { id: "kanashiro", title: "Quitanda Kanashiro", tags: "identity", images: [
      ["trabalhos/trabalhos_32.png", "Mulher carregando ecobag verde com o selo da Quitanda Kanashiro"],
      ["trabalhos/trabalhos_31.png", "Ecobag verde Quitanda Kanashiro pendurada em banqueta preta"],
      ["trabalhos/trabalhos_29.png", "Selo circular verde da Quitanda Kanashiro com kanji central"],
      ["trabalhos/trabalhos_27.png", "Versão horizontal do logotipo Quitanda Kanashiro em branco sobre verde"],
    ]},
    { id: "techcare", title: "Tech&Care", tags: "identity", images: [
      ["trabalhos/trabalhos_54.png", "Cartões de visita Tech&Care com logo e padrão gráfico sobre fundo verde"],
      ["trabalhos/trabalhos_56.png", "Camisa polo verde-menta com logo bordado Tech&Care"],
      ["trabalhos/trabalhos_55.png", "Camisa polo branca com selo Tech&Care e mangas estampadas"],
      ["trabalhos/trabalhos_57.png", "Ícone do logotipo Tech&Care: coração-circuito e mão"],
    ]},
    { id: "cookie", title: "Cookie Haven", tags: "mascot packaging", images: [
      ["trabalhos/trabalhos_53.png", "Embalagem Cookie Haven com o mascote"],
      ["trabalhos/trabalhos_52.png", "Mockup de embalagem Cookie Haven"],
    ]},
    { id: "ejep", title: "EJEP", tags: "mascot", images: [
      ["trabalhos/trabalhos_50.png", "Pôster com o mascote pintinho da EJEP"],
    ]},
    { id: "tanac", title: "Tanac — UX/UI", tags: "ux", pos: "top", images: [
      ["trabalhos/tanac_1.png", "Site da Tanac: página Sobre com o propósito e a trajetória da empresa"],
      ["trabalhos/tanac_2.png", "Site da Tanac: Código de Conduta, canal de denúncias, newsletter e rodapé"],
      ["trabalhos/tanac_3.png", "Site da Tanac: blocos de Unidades de Negócios, Certificações e P&D"],
    ]},
    { id: "ipanema", title: "Ipanema Rider / E-⁠Commerce — UX/UI", tags: "ux", pos: "top", images: [
      ["trabalhos/ipanema_1.png", "Loja Grendene: página da Rider Kids com banner, faixa de ofertas, newsletter e rodapé"],
      ["trabalhos/ipanema_2.png", "Loja Grendene: página da Ipanema com banner Bebê e Infantil, vitrine Black Friday e descontos"],
      ["trabalhos/ipanema_3.png", "Loja Grendene: vitrine de sandálias Ipanema, carrossel de personagens e newsletter"],
    ]},
  ],
  more: [
    { id: "arra", title: "Grapa — ARRA Sweeties", images: [["trabalhos/trabalhos_43.png", "Personagem uva da campanha ARRA Sweeties"], ["trabalhos/trabalhos_42.png", "Personagens uva da campanha ARRA Cherry Crush"]] },
    { id: "alpha", title: "Alpha Educ", images: [["trabalhos/trabalhos_66.png", "Ilustração do cachorrinho Alpha Educ"], ["trabalhos/trabalhos_64.png", "Ilustração em preto e branco do cachorrinho"], ["trabalhos/trabalhos_65.png", "Ilustração do cachorrinho estudando"]] },
  ],
  illus: [
    ["ilustracoes/ilustracoes_11.png", "Quadríptico em estilo mangá com Lupin, Goemon, Fujiko e Jigen, cada um em uma cor chapada"],
    ["ilustracoes/ilustracoes_39.png", "Estrelinha Luma em 3D com pelagem amarela felpuda flutuando no céu estrelado"],
    ["ilustracoes/ilustracoes_13.png", "Treinador Pokémon Red com Pikachu no ombro sobre fundo vermelho"],
    ["ilustracoes/ilustracoes_37.png", "Três estatuetas 3D do Doraemon acenando sobre fundo preto com reflexo"],
    ["ilustracoes/ilustracoes_26.png", "Pintura digital no estilo Arcimboldo: rosto formado por frutas e legumes"],
    ["ilustracoes/ilustracoes_40.png", "Três Pikmins vermelhos em 3D caminhando e acenando"],
    ["ilustracoes/ilustracoes_17.jpg", "Pintura digital de cantor de rock cantando ao microfone"],
    ["ilustracoes/ilustracoes_09.png", "Kirby em 3D cercado de estrelas douradas sobre fundo salmão"],
    ["ilustracoes/ilustracoes_32.png", "Arale, Gatchan e Senbei em estilo adesivo sobre fundo verde"],
    ["ilustracoes/ilustracoes_15.png", "Personagem Apeach em 3D, sorridente e brilhante, sobre fundo lilás"],
    ["ilustracoes/ilustracoes_54.png", "Desenho a grafite de Kazuma Kiryu com dragão tatuado ao fundo"],
    ["ilustracoes/ilustracoes_59.png", "Retrato pintado de Goro Majima de perfil, com tapa-olho"],
  ],
  gallery: [
    ["ilustracoes/ilustracoes_05.png", "Colagem densa de personagens cartunescos em tinta preta com toques pastel"],
    ["ilustracoes/ilustracoes_27.png", "Asuka de Evangelion em aquarela sobre papel texturizado"],
    ["ilustracoes/ilustracoes_47.png", "Pikachu saltitante em traço de giz sobre fundo amarelo"],
    ["ilustracoes/ilustracoes_48.png", "Ayrton Senna em versão chibi aquarelada"],
    ["home/home_09.png", "Pintura digital estilo Arcimboldo com panela no lugar do chapéu"],
    ["ilustracoes/ilustracoes_21.png", "Retrato masculino em preto e branco com retícula"],
    ["ilustracoes/ilustracoes_45.png", "Gatinhos azuis em giz de cera brincando num escorregador"],
    ["ilustracoes/ilustracoes_46.png", "Mosaico em marcador de ícones dos games"],
    ["ilustracoes/ilustracoes_61.png", "Bávaro bigodudo brindando com cerveja"],
    ["ilustracoes/ilustracoes_64.jpg", "Desenho a traço de Brian May tocando guitarra"],
    ["ilustracoes/ilustracoes_34.png", "Garota de boina vermelha sorrindo em traço cartum"],
    ["ilustracoes/ilustracoes_57.png", "Amy Rose clássica sorrindo com corações"],
    ["ilustracoes/ilustracoes_36.png", "Menina de franja abraçando um gato laranja"],
  ],
  collage: [
    ["colagens/colagens_06.jpg", "Colagem com recortes de rostos sobre listras magenta e laranja e a frase Always look on the bright side of life"],
    ["colagens/colagens_17.jpg", "Colagem do The Who em cores chapadas sobre fundo azul com o alvo mod"],
    ["colagens/colagens_14.jpg", "Quatro retratos de John Lydon com as letras P, I e L desenhadas à mão"],
    ["colagens/colagens_07.jpg", "Retratos do Queen em quadrantes de cores saturadas"],
    ["colagens/colagens_16.jpg", "Colagem de Jimmy Cliff com capas de discos saindo da cabeça"],
    ["colagens/colagens_12.jpg", "Colagem psicodélica com Pete Townshend saltando ao redor do alvo mod"],
    ["colagens/colagens_20.jpg", "Pete Townshend sentado sobre fundo manuscrito, Let my love open the door"],
    ["colagens/colagens_05.jpg", "Quatro retratos pop art de Roger Daltrey"],
    ["colagens/colagens_04.jpg", "Retrato de Johnny Rotten com cabelo laranja e flores azuis"],
    ["colagens/colagens_18.jpg", "Capa de A Quick One, do The Who, cercada por recortes"],
  ],
  contactArt: "home/home_07.png",
  // Ferramenta → trabalhos (modal ao clicar no chip). ⚠ Mapeamento sugerido — confirmar com o cliente.
  video: { src: "https://drive.google.com/file/d/1NDBoIz5QNcsLOFcPBIgjz1-nHi4iXoUC/preview", title: "Vídeo de apresentação da LUMA" },
  skills: [
    { id: "illustrator", name: "Illustrator", files: [
      ["trabalhos/trabalhos_24.png", "Símbolo floral da Rama Forte"], ["trabalhos/trabalhos_29.png", "Selo da Quitanda Kanashiro"],
      ["trabalhos/trabalhos_27.png", "Logotipo horizontal Quitanda Kanashiro"], ["trabalhos/trabalhos_49.png", "Logo C2E Engenharia Elétrica"],
      ["trabalhos/trabalhos_57.png", "Ícone Tech&Care"], ["trabalhos/trabalhos_04.png", "LUMA de corpo inteiro"],
      ["trabalhos/trabalhos_26.png", "Mascote caqui Rama Forte"], ["trabalhos/trabalhos_47.png", "Logo C2E com mascote peru"]] },
    { id: "photoshop", name: "Photoshop", files: [
      ["trabalhos/trabalhos_11.png", "Cartaz da LUMA em parede de tijolos"], ["trabalhos/trabalhos_08.png", "Camiseta da LUMA"],
      ["trabalhos/trabalhos_07.png", "Caneca da LUMA"], ["trabalhos/trabalhos_22.jpg", "Fachada Rama Forte"],
      ["trabalhos/trabalhos_32.png", "Ecobag Quitanda Kanashiro"], ["trabalhos/trabalhos_31.png", "Ecobag na banqueta"],
      ["trabalhos/trabalhos_54.png", "Cartões Tech&Care"], ["trabalhos/trabalhos_56.png", "Camisa polo Tech&Care"],
      ["trabalhos/trabalhos_48.png", "Camiseta C2E"], ["trabalhos/trabalhos_53.png", "Embalagem Cookie Haven"]] },
    { id: "premiere", name: "Premiere Pro", video: true, files: [
      ["trabalhos/trabalhos_11.png", "Cartaz da LUMA"], ["trabalhos/trabalhos_09.png", "Adesivos da LUMA"]] },
    { id: "aftereffects", name: "After Effects", video: true, files: [
      ["trabalhos/trabalhos_09.png", "Poses e expressões da LUMA"], ["trabalhos/trabalhos_06.png", "Pose da LUMA"]] },
    { id: "affinity", name: "Affinity", files: [
      ["trabalhos/trabalhos_58.png", "Arte da caixa de O Caminho do Dragão"], ["trabalhos/trabalhos_61.jpg", "Tabuleiro e cartas de O Caminho do Dragão"],
      ["trabalhos/trabalhos_59.jpg", "O Caminho do Dragão no SBGames"]] },
    { id: "canva", name: "Canva", files: [
      ["trabalhos/trabalhos_13.png", "Post Ameixa Rubimel"], ["trabalhos/trabalhos_15.png", "Post promocional de caqui"],
      ["trabalhos/trabalhos_20.png", "Post de inauguração Rama Forte"]] },
    { id: "blender", name: "Blender", files: [
      ["ilustracoes/ilustracoes_39.png", "Estrelinha Luma em 3D"], ["ilustracoes/ilustracoes_37.png", "Doraemon em 3D"],
      ["ilustracoes/ilustracoes_40.png", "Pikmins em 3D"], ["ilustracoes/ilustracoes_09.png", "Kirby em 3D"], ["ilustracoes/ilustracoes_15.png", "Apeach em 3D"]] },
    { id: "clip", name: "Clip Studio Paint", files: [
      ["ilustracoes/ilustracoes_11.png", "Lupin III em estilo mangá"], ["ilustracoes/ilustracoes_13.png", "Red e Pikachu"],
      ["ilustracoes/ilustracoes_26.png", "Rosto de frutas estilo Arcimboldo"], ["ilustracoes/ilustracoes_17.jpg", "Cantor de rock"],
      ["ilustracoes/ilustracoes_59.png", "Goro Majima"], ["ilustracoes/ilustracoes_32.png", "Arale e amigos"], ["home/home_09.png", "Pintura Arcimboldo com panela"]] },
  ],
};

/* --------------------------------------------------------------- helpers */
function info(file) {
  const m = meta[file];
  if (!m) throw new Error("Imagem sem meta: " + file);
  const s = Math.min(1, 1800 / m.w);
  return { ...m, lgW: Math.round(m.w * s), lgH: Math.round(m.h * s), ratio: m.w / m.h, lgSrc: "assets/img/" + m.lg, smSrc: "assets/img/" + m.sm };
}
function img(file, { alt = "", sizes = "100vw", lazy = true, priority = false, cls = "", style = "" } = {}) {
  const i = info(file);
  const srcset = i.w > 800 ? `${i.smSrc} 800w, ${i.lgSrc} ${i.lgW}w` : `${i.lgSrc} ${i.lgW}w`;
  return `<img src="${i.lgW > 800 ? i.smSrc : i.lgSrc}" srcset="${srcset}" sizes="${sizes}" width="${i.lgW}" height="${i.lgH}" alt="${esc(alt)}"`
    + (lazy ? ` loading="lazy" decoding="async"` : "") + (priority ? ` fetchpriority="high"` : "")
    + (cls ? ` class="${cls}"` : "") + (style ? ` style="${style}"` : "") + `>`;
}
const zoomIcon = `<span class="zoom" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 3v12M3 9h12"/></svg></span>`;
const arrow = (d) => `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

// Carousel following the modern-web-guidance carousel pattern
function carousel({ group, label, items, layout = "peek-layout", ratioCss = "4/3", sizes, pos = "" }) {
  const n = items.length;
  // Every image fills its frame (object-fit: cover): nothing shrinks inside the box
  const slides = items.map(([file, alt], i) => {
    return `<figure class="slide" role="group" aria-roledescription="slide" aria-label="${i + 1} de ${n}" data-pos="${i + 1}">`
      + `<button type="button" data-lightbox="${group}" data-full="${info(file).lgSrc}" data-alt="${esc(alt)}" aria-label="Ampliar imagem: ${esc(alt)}" data-cursor="view">`
      + img(file, { alt, sizes }) + `</button>${zoomIcon}</figure>`;
  }).join("\n        ");
  return `<div class="carousel ${layout}${pos ? " pos-" + pos : ""}" role="region" aria-roledescription="carousel" aria-label="${esc(label)}" data-carousel>
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

/* ------------------------------------------------------------------ page */
// Project grid filters: key → i18n label (key "all" shows everything)
const FILTERS = ["all", "identity", "mascot", "ux", "packaging"];
const nn = (i) => String(i + 1).padStart(2, "0");

// Grid of cards. Each card links to its full project (#id), which JS opens in a window;
// without JS the link simply jumps to the article further down.
const cards = DATA.works.map((w, i) => {
  const [file, alt] = w.cover ? [w.cover, ""] : w.images[0];
  return `<li data-tags="${w.tags || ""}"><a class="work-card${w.pos ? " pos-" + w.pos : ""}" href="#${w.id}" data-project="${w.id}" data-cursor="view">
          <span class="work-card-img">${img(file, { alt: "", sizes: "(max-width: 600px) 92vw, (max-width: 1000px) 46vw, 31vw" })}</span>
          <span class="work-card-meta"><span class="work-index">${nn(i)}</span><strong>${esc(w.title)}</strong><span class="work-card-cat" data-i18n="${w.id}.cat"></span></span>
        </a></li>`;
}).join("\n        ");
const filters = FILTERS.map((f) => `<li><button type="button" class="chip" data-filter="${f}" aria-pressed="${f === "all"}" data-i18n="filter.${f}"></button></li>`).join("");

const works = DATA.works.map((w, i) => `
    <article class="work" id="${w.id}" aria-labelledby="${w.id}-t">
      <div class="work-top" data-reveal="stagger">
        <div><span class="work-index">${String(i + 1).padStart(2, "0")} / ${String(DATA.works.length).padStart(2, "0")}</span><h3 id="${w.id}-t">${esc(w.title)}</h3><p class="meta" data-i18n="${w.id}.cat"></p></div>
        <p data-i18n="${w.id}.desc"></p>
      </div>
      ${carousel({ group: w.id, label: w.title, items: w.images, pos: w.pos, sizes: "(max-width: 700px) 86vw, 78vw" })}
    </article>`).join("\n");

const more = DATA.more.map((p) => {
  const [file, alt] = p.images[0];
  return `<li><button type="button" data-more="${p.id}" data-preview="${info(file).smSrc}" data-cursor="view">
          <strong>${esc(p.title)}</strong><span data-i18n="more.${p.id}"></span></button>
          <div hidden>${p.images.map(([f, a]) => `<span data-lightbox="more-${p.id}" data-full="${info(f).lgSrc}" data-alt="${esc(a)}"></span>`).join("")}</div></li>`;
}).join("\n        ");

const gallery = DATA.gallery.map(([file, alt]) =>
  `<button type="button" data-lightbox="gallery" data-full="${info(file).lgSrc}" data-alt="${esc(alt)}" aria-label="Ampliar imagem: ${esc(alt)}" data-cursor="view">${img(file, { alt, sizes: "(max-width: 600px) 50vw, 25vw" })}</button>`
).join("\n        ");

const chips = DATA.skills.map((s) =>
  `<li><button type="button" class="chip" data-skill="${s.id}" aria-haspopup="dialog">${esc(s.name)}<span class="chip-n" aria-hidden="true">${s.files.length + (s.video ? 1 : 0)}</span></button></li>`).join("");

const skillTemplates = DATA.skills.map((s) => `<template id="tpl-${s.id}" data-name="${esc(s.name)}" data-count="${s.files.length + (s.video ? 1 : 0)}">
  ${s.video ? `<div class="skill-video"><iframe data-src="${DATA.video.src}" title="${esc(DATA.video.title)}" allow="autoplay; fullscreen" loading="lazy"></iframe><p data-i18n="skill.video">${esc(DATA.video.title)}</p></div>` : ""}
  <div class="skill-grid">${s.files.map(([file, alt]) =>
    `<button type="button" class="skill-item" data-lightbox="skill-${s.id}" data-full="${info(file).lgSrc}" data-alt="${esc(alt)}" aria-label="Ampliar imagem: ${esc(alt)}" data-cursor="view">${img(file, { alt, sizes: "(max-width: 700px) 45vw, 260px" })}</button>`).join("")}</div>
</template>`).join("\n");
// Works that pop out of the mascot's head (decorative: the same images are in the works section)
const pops = DATA.heroFloat.map(([f]) => `<span class="pop">${img(f, { alt: "", sizes: "(max-width: 800px) 30vw, 200px", lazy: false })}</span>`).join("");

// Background pattern tile: the two heads (logo + mascot) in a 2×2 checker, turned into
// light silhouettes (white parts stay, the dark-blue parts drop out). CSS slides it diagonally.
{
  const b64 = (f) => fs.readFileSync(f).toString("base64");
  const logo = `data:image/svg+xml;base64,${b64("assets/brand/logo.svg")}`;
  const mascot = `data:image/svg+xml;base64,${b64("assets/brand/mascote.svg")}`;
  const T = 320, q = T / 2;
  const at = (href, w, h, cx, cy, rot) =>
    `<image href="${href}" width="${w}" height="${h}" x="${cx - w / 2}" y="${cy - h / 2}" transform="rotate(${rot} ${cx} ${cy})" preserveAspectRatio="xMidYMid meet"/>`;
  const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}">
<filter id="ink" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.96  0 0 0 0 0.95  0 0 0 0 0.93  0.42 1.42 0.14 0 -0.4"/></filter>
<g filter="url(#ink)">
${at(logo, 74, 72, q / 2, q / 2, -12)}
${at(mascot, 80, 71, q + q / 2, q / 2, -6)}
${at(logo, 70, 68, q / 2, q + q / 2, 8)}
${at(mascot, 84, 75, q + q / 2, q + q / 2, 10)}
</g></svg>`;
  fs.writeFileSync("assets/brand/pattern.svg", tile);
}

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Guilherme Eccel Superti — Designer</title>
<meta name="description" content="Portfólio de Guilherme Eccel Superti: designer, ilustrador, artista 3D e editor de vídeo em Florianópolis.">
<meta name="theme-color" content="#2748D0">
<meta property="og:title" content="Guilherme Eccel Superti — Designer">
<meta property="og:description" content="Identidade visual, mascotes, UX/UI, ilustração, 3D e graphic montages.">
<meta property="og:image" content="assets/img/logos/logo_superti_design.webp">
<link rel="icon" href="assets/brand/logo.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&family=Noto+Sans+JP:wght@400;700;900&display=swap">
<link rel="stylesheet" href="css/style.css?v=${ver("css/style.css")}">
<script>document.documentElement.classList.add("js");if(matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("reduced");</script>
</head>
<body>
<a class="skip" href="#main" data-i18n="skip">Pular para o conteúdo</a>

<div class="loader" aria-hidden="true">
  <img class="loader-logo" src="assets/brand/logo.svg" alt="" width="84" height="84">
  <span class="loader-count">0</span>
</div>
<div class="progress" aria-hidden="true"></div>
<div class="bg-pattern" aria-hidden="true"><div></div></div>
<div class="preview" aria-hidden="true"><img alt=""></div>

<header class="site-header">
  <a class="brand" href="#top" aria-label="Guilherme Eccel Superti — início">
    <img class="brand-logo" src="assets/brand/logo.svg" alt="" width="48" height="48">
    <span class="brand-name" lang="pt-BR" translate="no">Guilherme Eccel Superti</span>
  </a>
  <nav class="nav" id="nav" aria-label="Principal">
    <ul>
      <li><a href="#sobre"><span class="roll" data-i18n="nav.about">Quem sou eu</span></a></li>
      <li><a href="#trabalhos"><span class="roll" data-i18n="nav.works">Trabalhos</span></a></li>
      <li><a href="#ilustracoes"><span class="roll" data-i18n="nav.illus">Ilustrações</span></a></li>
      <li><a href="#colagens"><span class="roll" data-i18n="nav.collage">Graphic Montages</span></a></li>
      <li><a href="#contato"><span class="roll" data-i18n="nav.contact">Contato</span></a></li>
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
      <h1 id="h1" lang="pt-BR" translate="no" aria-label="Guilherme Eccel Superti"><span class="line" aria-hidden="true">Guilherme</span><span class="line" aria-hidden="true">Eccel</span><span class="line" aria-hidden="true">Superti</span></h1>
      <div class="hero-stage">
        <div class="hero-pops" aria-hidden="true">${pops}</div>
        <button type="button" class="hero-mascot" data-i18n-aria="hero.mascot" aria-label="Dar um oi para o mascote"><img src="assets/brand/mascote.svg" alt="" width="368" height="328"></button>
      </div>
    </div>
    <div class="hero-row">
      <a class="btn" href="#trabalhos"><span data-i18n="hero.cta">Ver trabalhos</span><span class="arrow" aria-hidden="true">→</span></a>
    </div>
    <span class="scroll-hint" aria-hidden="true"></span>
  </section>

  <div class="marquee" aria-hidden="true"><div class="marquee-track"></div></div>

  <section class="banner" aria-label="Ilustração em destaque">
    <figure data-reveal>${img(DATA.banner.file, { alt: DATA.banner.alt, sizes: "100vw", lazy: false, style: `object-position:${DATA.banner.pos}` })}</figure>
  </section>

  <section id="sobre" class="about" aria-labelledby="about-t">
    <div data-reveal>
      <figure class="portrait">${img(DATA.portrait.file, { alt: DATA.portrait.alt, sizes: "(max-width: 860px) 80vw, 36vw" })}</figure>
    </div>
    <div>
      <h2 id="about-t" data-reveal="split" data-i18n="about.title">Quem sou eu</h2>
      <p class="years" data-reveal><strong data-i18n="about.yearsN">5+</strong><span data-i18n="about.years">anos de experiência em design</span></p>
      <div class="body" data-reveal="stagger"><p data-i18n="about.p1"></p><p data-i18n="about.p2"></p></div>
      <p class="chips-hint" data-i18n="skill.hint">Clique numa ferramenta para ver trabalhos feitos com ela.</p>
      <ul class="chips" aria-label="Softwares" data-reveal="stagger">${chips}</ul>
      <dl data-reveal="stagger">
        <div><dt data-i18n="about.k1"></dt><dd data-i18n="about.v1"></dd></div>
        <div><dt data-i18n="about.k2"></dt><dd data-i18n="about.v2"></dd></div>
        <div><dt data-i18n="about.k4"></dt><dd data-i18n="about.v4"></dd></div>
        <div><dt data-i18n="about.k5"></dt><dd data-i18n="about.v5"></dd></div>
        <div><dt data-i18n="about.k3"></dt><dd data-i18n="about.v3"></dd></div>
      </dl>
      <div class="about-actions"><a class="btn ghost" data-cv download><span data-i18n="about.cv">Baixar currículo (PDF)</span><span class="arrow" aria-hidden="true">↓</span></a></div>
    </div>
  </section>

  <section id="trabalhos" class="surface" aria-labelledby="works-t">
    <div class="head"><h2 id="works-t" data-reveal="split"><span data-i18n="works.title">Trabalhos</span><span class="n">(${String(DATA.works.length).padStart(2, "0")})</span></h2><p data-reveal data-i18n="works.intro"></p></div>
    <ul class="filters" data-i18n-aria="filter.label" aria-label="Filtrar projetos">${filters}</ul>
    <ul class="work-grid">
        ${cards}
    </ul>
    <p class="visually-hidden" role="status" aria-live="polite" data-filter-status></p>
    <!-- Full projects: shown inline without JS; with JS each one is moved into the project window -->
    <div class="work-store">
${works}
    </div>
    <div class="more" data-reveal>
      <h3 data-i18n="more.title">Outros projetos</h3>
      <ul>
        ${more}
      </ul>
    </div>
  </section>

  <section id="ilustracoes" aria-labelledby="ill-t">
    <div class="head"><h2 id="ill-t" data-reveal="split" data-i18n="illus.title">Ilustrações</h2><p data-reveal data-i18n="illus.intro"></p></div>
    ${carousel({ group: "illus", label: "Ilustrações", items: DATA.illus, layout: "cards", ratioCss: "1/1", sizes: "(max-width: 700px) 86vw, 46vw" })}
    <h3 class="visually-hidden" data-i18n="illus.more">Mais ilustrações</h3>
    <div class="gallery" id="gallery" data-reveal="stagger">
        ${gallery}
    </div>
    <button type="button" class="btn ghost gallery-toggle" aria-controls="gallery" aria-expanded="false"><span data-i18n="illus.showMore">Ver mais ilustrações</span><span class="arrow" aria-hidden="true">↓</span></button>
  </section>

  <section id="colagens" class="surface" aria-labelledby="col-t">
    <div class="head"><h2 id="col-t" data-reveal="split" data-i18n="collage.title">Graphic Montages</h2></div>
    ${carousel({ group: "collage", label: "Graphic Montages", items: DATA.collage, layout: "cards", ratioCss: "1/1", sizes: "(max-width: 700px) 86vw, 46vw" })}
  </section>

  <section id="contato" class="dark contact" aria-labelledby="ct-t">
    <div class="contact-grid">
      <div>
        <p data-i18n="contact.kicker" style="opacity:.75">Vamos conversar?</p>
        <h2 id="ct-t" data-reveal="split" data-i18n="contact.title">Contato</h2>
        <p data-reveal data-i18n="contact.text" style="max-width:44ch;margin-bottom:1.6rem"></p>
        <div class="mail-row">
          <a class="mail" href="mailto:guisuperti@gmail.com">guisuperti@gmail.com</a>
          <button type="button" class="copy" data-copy="guisuperti@gmail.com" data-i18n="contact.copy">Copiar</button>
        </div>
        <div class="links">
          <a class="btn" data-cv download><span data-i18n="contact.cv">Currículo (PDF)</span><span class="arrow" aria-hidden="true">↓</span></a>
          <a class="btn ghost" href="https://www.behance.net/guisuperti" target="_blank" rel="noopener">Behance <span class="arrow" aria-hidden="true">↗</span></a>
          <a class="btn ghost" href="https://www.linkedin.com/in/guilherme-eccel-superti" target="_blank" rel="noopener">LinkedIn <span class="arrow" aria-hidden="true">↗</span></a>
        </div>
      </div>
      <figure class="contact-art" data-reveal>${img(DATA.contactArt, { alt: "", sizes: "(max-width: 860px) 70vw, 420px" })}</figure>
    </div>
    <div class="foot">
      <span>© <span data-year>2026</span> Guilherme Eccel Superti</span>
      <button type="button" class="to-top"><span data-i18n="top">Voltar ao topo</span><img src="assets/brand/mascote.svg" alt="" width="44" height="44"></button>
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
    <div><p class="skill-kicker" data-i18n="skill.made">Feito com</p><h2 id="skill-t"></h2><p class="skill-count"></p></div>
    <button type="button" class="lb-btn skill-close" data-i18n-aria="ui.close" aria-label="Fechar">${arrow("M4 4l10 10M14 4 4 14")}</button>
  </div>
  <div class="skill-body"></div>
</dialog>
${skillTemplates}
<div class="toast" role="status" aria-live="polite"></div>

<script src="https://cdn.jsdelivr.net/npm/animejs@4.0.2/lib/anime.umd.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js" defer></script>
<script src="js/i18n.js?v=${ver("js/i18n.js")}" defer></script>
<script src="js/main.js?v=${ver("js/main.js")}" defer></script>
</body>
</html>
`;
fs.writeFileSync("index.html", html);
console.log("index.html gerado:", (html.length / 1024).toFixed(1), "KB");
