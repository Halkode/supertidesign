// Ponto de entrada do Worker (Cloudflare Workers + arquivos estáticos de public/).
//
// As rotas ficam em functions/ no formato das Pages Functions (onRequestGet, onRequestPost…,
// _middleware.js). Este arquivo faz o papel do roteador das Pages: escolhe a rota, roda os
// middlewares e, quando a rota chama next() ou não existe, entrega o arquivo estático (env.ASSETS).
// O wrangler.toml só manda para cá os caminhos "/", "/api/*", "/admin*" e "/media/*";
// o resto (css, js, imagens) sai direto dos arquivos estáticos, sem gastar execução do Worker.
import * as home from "./functions/index.js";
import * as media from "./functions/media/[[path]].js";
import * as adminMw from "./functions/admin/_middleware.js";
import * as apiMw from "./functions/api/_middleware.js";
import * as content from "./functions/api/content.js";
import * as login from "./functions/api/login.js";
import * as logout from "./functions/api/logout.js";
import * as mediaApi from "./functions/api/media.js";
import * as preview from "./functions/api/preview.js";
import * as publish from "./functions/api/publish.js";
import * as security from "./functions/api/security.js";
import * as session from "./functions/api/session.js";
import * as versions from "./functions/api/versions/index.js";
import * as version from "./functions/api/versions/[id].js";

// [padrão, módulo, middlewares]; o primeiro que casar é usado
const ROUTES = [
  [/^\/$/, home, []],
  [/^\/media\/(?<path>.+)$/, media, []],
  [/^\/admin(?:\/.*)?$/, null, [adminMw]],
  [/^\/api\/content\/?$/, content, [apiMw]],
  [/^\/api\/login\/?$/, login, [apiMw]],
  [/^\/api\/logout\/?$/, logout, [apiMw]],
  [/^\/api\/media\/?$/, mediaApi, [apiMw]],
  [/^\/api\/preview\/?$/, preview, [apiMw]],
  [/^\/api\/publish\/?$/, publish, [apiMw]],
  [/^\/api\/security\/?$/, security, [apiMw]],
  [/^\/api\/session\/?$/, session, [apiMw]],
  [/^\/api\/versions\/?$/, versions, [apiMw]],
  [/^\/api\/versions\/(?<id>[^/]+)\/?$/, version, [apiMw]],
  [/^\/api(?:\/.*)?$/, null, [apiMw]], // rota de API inexistente → 404 (depois do login)
];

const METHOD = { GET: "onRequestGet", HEAD: "onRequestGet", POST: "onRequestPost", PUT: "onRequestPut", DELETE: "onRequestDelete" };

function handlerOf(mod, method, isApi) {
  if (!mod) return isApi ? () => new Response(JSON.stringify({ error: "Rota não encontrada." }), { status: 404, headers: { "content-type": "application/json" } }) : null;
  const fn = mod[METHOD[method]] || mod.onRequest;
  return fn || (() => new Response("Método não permitido", { status: 405 }));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const assets = () => env.ASSETS.fetch(request);
    for (const [re, mod, mws] of ROUTES) {
      const m = url.pathname.match(re);
      if (!m) continue;
      const params = { ...(m.groups || {}) };
      if (params.path) params.path = params.path.split("/");
      const final = handlerOf(mod, request.method, url.pathname.startsWith("/api"));
      const chain = [...mws.map((mw) => mw.onRequest), final || assets];
      const data = {};
      const run = (i) => chain[i]({
        request, env, params, data,
        waitUntil: ctx.waitUntil.bind(ctx),
        next: () => (i + 1 < chain.length ? run(i + 1) : assets()),
      });
      return run(0);
    }
    return assets();
  },
};
