// Login do painel: uma senha (segredo ADMIN_PASSWORD) e um cookie de sessão assinado com
// HMAC-SHA256 (segredo SESSION_SECRET). Sem estado no servidor: trocar o SESSION_SECRET
// derruba todas as sessões.
const enc = new TextEncoder();
export const COOKIE = "sess";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
async function sha256(s) { return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))); }

// Constant-time comparison of two strings (compares their hashes, so lengths don't leak)
export async function safeEqual(a, b) {
  const [x, y] = await Promise.all([sha256(String(a)), sha256(String(b))]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

export function secretsOk(env) {
  return typeof env.ADMIN_PASSWORD === "string" && env.ADMIN_PASSWORD.length >= 8
    && typeof env.SESSION_SECRET === "string" && env.SESSION_SECRET.length >= 32;
}

export async function makeSession(env) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(12)));
  const payload = `${exp}.${nonce}`;
  return `${payload}.${await hmac(env.SESSION_SECRET, payload)}`;
}

function readCookie(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const part of raw.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}

export async function isAuthed(request, env) {
  if (!secretsOk(env)) return false;
  const tok = readCookie(request, COOKIE);
  if (!tok) return false;
  const parts = tok.split(".");
  if (parts.length !== 3) return false;
  const [exp, nonce, sig] = parts;
  if (!(Number(exp) > Date.now() / 1000)) return false;
  return safeEqual(sig, await hmac(env.SESSION_SECRET, `${exp}.${nonce}`));
}

export const sessionCookie = (value, request) => {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${value ? MAX_AGE : 0}${secure}`;
};

// Requests that change data must come from the panel itself (CSRF guard on top of SameSite=Strict)
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}
