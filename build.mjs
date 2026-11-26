// Gera public/index.html a partir de content/default.json (o mesmo renderizador do painel).
// Uso:  node build.mjs
//
// O site publicado pelo painel (/admin) vem do banco D1 e é gerado pelas Pages Functions com o
// mesmo public/shared/render.js. Este build serve para: (1) a versão estática de reserva, usada
// enquanto nada foi publicado pelo painel; (2) atualizar o número de versão de css/js
// (server/version.js) sempre que você editar public/css ou public/js.
import fs from "node:fs";
import crypto from "node:crypto";
import { renderSite } from "./public/shared/render.js";

const read = (f) => fs.readFileSync(f);
const content = JSON.parse(read("content/default.json"));
const meta = JSON.parse(read("public/assets/img/meta.json"));

// Cache busting: one hash for css + js, so browsers fetch the new files whenever they change
// line endings are normalized so the version is the same on Windows (CRLF) and Linux (LF)
const lf = (f) => read(f).toString("utf8").replace(/\r\n/g, "\n");
const assetV = crypto.createHash("sha1").update(lf("public/css/style.css")).update(lf("public/js/main.js")).digest("hex").slice(0, 8);
fs.writeFileSync("server/version.js", `// Gerado pelo build.mjs — não edite à mão.\nexport const ASSET_V = "${assetV}";\n`);

// Background pattern tile: the two heads (logo + mascot) in a 2×2 checker, turned into
// light silhouettes (white parts stay, the dark-blue parts drop out). CSS slides it diagonally.
{
  const b64 = (f) => read(f).toString("base64");
  const logo = `data:image/svg+xml;base64,${b64("public/assets/brand/logo.svg")}`;
  const mascot = `data:image/svg+xml;base64,${b64("public/assets/brand/mascote.svg")}`;
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
  fs.writeFileSync("public/assets/brand/pattern.svg", tile);
}

const html = renderSite(content, meta, { assetV });
fs.writeFileSync("public/index.html", html);
console.log(`public/index.html gerado: ${(html.length / 1024).toFixed(1)} KB · assets v=${assetV}`);
