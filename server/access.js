// Cloudflare Access: conferência do token assinado (JWT) que o Access coloca em cada pedido.
//
// Ligado quando existem ACCESS_TEAM_DOMAIN (ex.: supertidesign.cloudflareaccess.com) e ACCESS_AUD
// (o "Application Audience (AUD) Tag" da aplicação no Zero Trust). Aí todo pedido a /admin e
// /api precisa trazer um token válido, emitido pelo Access para ESTA aplicação. Sem isso,
// é recusado — mesmo que chegue por um endereço que ficou de fora da regra (ex.: URL de preview).
//
// Verifica: assinatura RS256 com as chaves públicas da equipe (cacheadas por 1 h), emissor,
// audiência, validade (exp/nbf, com 60 s de tolerância) e devolve o e-mail autorizado.
const enc = new TextEncoder();
const CERT_TTL = 60 * 60 * 1000;
let certCache = { url: "", at: 0, keys: [] };

export const accessEnabled = (env) => !!(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD);

const teamOrigin = (env) => "https://" + String(env.ACCESS_TEAM_DOMAIN).replace(/^https?:\/\//, "").replace(/\/.*$/, "");

function b64urlBytes(s) {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}
const b64urlJson = (s) => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

async function getKeys(env, force = false) {
  // ACCESS_JWKS_URL only exists for automated tests; production uses the team's certs endpoint
  const url = env.ACCESS_JWKS_URL || `${teamOrigin(env)}/cdn-cgi/access/certs`;
  if (!force && certCache.url === url && Date.now() - certCache.at < CERT_TTL && certCache.keys.length) return certCache.keys;
  const res = await fetch(url, { cf: { cacheTtl: 300 } });
  if (!res.ok) throw new Error("certs " + res.status);
  const { keys = [] } = await res.json();
  certCache = { url, at: Date.now(), keys };
  return keys;
}

function readToken(request) {
  const h = request.headers.get("cf-access-jwt-assertion");
  if (h) return h;
  for (const part of (request.headers.get("cookie") || "").split(/;\s*/)) {
    if (part.startsWith("CF_Authorization=")) return decodeURIComponent(part.slice(17));
  }
  return null;
}

// → { email } when valid, or { error } explaining why not
export async function verifyAccess(request, env) {
  const token = readToken(request);
  if (!token) return { error: "sem token do Access" };
  const parts = token.split(".");
  if (parts.length !== 3 || token.length > 8000) return { error: "token malformado" };
  let header, payload;
  try { header = b64urlJson(parts[0]); payload = b64urlJson(parts[1]); } catch { return { error: "token malformado" }; }
  if (header.alg !== "RS256" || !header.kid) return { error: "algoritmo não aceito" };

  let keys;
  try { keys = await getKeys(env); } catch { return { error: "não foi possível obter as chaves do Access" }; }
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) { // keys rotate: refresh once
    try { keys = await getKeys(env, true); } catch { /* keep old */ }
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) return { error: "chave desconhecida" };

  const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlBytes(parts[2]), enc.encode(parts[0] + "." + parts[1]));
  if (!ok) return { error: "assinatura inválida" };

  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) return { error: "token de outra aplicação" };
  if (payload.iss !== teamOrigin(env)) return { error: "emissor inválido" };
  if (!(payload.exp > now - 60)) return { error: "token expirado" };
  if (payload.nbf && payload.nbf > now + 60) return { error: "token ainda não válido" };
  return { email: payload.email || payload.common_name || "(serviço)" };
}

export function accessDenied(reason) {
  return new Response(`<!doctype html><meta charset="utf-8"><title>Acesso negado</title>
<body style="font:16px/1.5 system-ui;display:grid;place-items:center;min-height:90vh;margin:0;background:#f4f2ee;color:#18181b">
<div style="max-width:420px;padding:2rem;text-align:center"><h1 style="font-size:1.4rem">Acesso negado</h1>
<p>Esta área é protegida pelo Cloudflare Access. Abra o painel pelo endereço principal do site e entre com o e-mail autorizado.</p></div>`,
    { status: 403, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", /* header values must be ASCII */ "x-access-denied": encodeURIComponent(reason), "x-robots-tag": "noindex" } });
}
