// Segurança do painel
//
//  Login = senha (ADMIN_PASSWORD) [+ código de 2 fatores, se ADMIN_TOTP_SECRET existir]
//          [+ Cloudflare Turnstile, se TURNSTILE_SECRET existir]
//  Antes da senha: token de formulário (emitido por /api/session, idade mínima de 2 s),
//  honeypot e bloqueio progressivo por IP.
//  Sessão = token aleatório no cookie (HttpOnly, Secure, SameSite=Strict, __Host-) e uma linha
//  na tabela sessions (id = HMAC do token). Expira em 7 dias ou após 12 h sem uso.
const enc = new TextEncoder();
const SESSION_MAX = 60 * 60 * 24 * 7;   // 7 dias
const SESSION_IDLE = 60 * 60 * 12;      // 12 h sem uso
const FORM_MIN_AGE = 2;                 // segundos: ninguém digita uma senha mais rápido que isso
const FORM_MAX_AGE = 60 * 60;
const LOCK_BASE = 15 * 60;              // primeiro bloqueio: 15 min, dobra a cada falha extra
const LOCK_MAX = 24 * 60 * 60;
const FAIL_WINDOW = 24 * 60 * 60;

export const nowSec = () => Math.floor(Date.now() / 1000);
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const randomToken = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

async function hmac(secret, data, hash = "SHA-256") {
  const key = await crypto.subtle.importKey("raw", typeof secret === "string" ? enc.encode(secret) : secret, { name: "HMAC", hash }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, typeof data === "string" ? enc.encode(data) : data));
}
const hmacB64 = async (secret, data) => b64url(await hmac(secret, data));
async function sha256(s) { return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))); }

// Constant-time comparison (compares hashes, so the length doesn't leak either)
export async function safeEqual(a, b) {
  const [x, y] = await Promise.all([sha256(String(a)), sha256(String(b))]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

export function secretsOk(env) {
  return typeof env.ADMIN_PASSWORD === "string" && env.ADMIN_PASSWORD.length >= 12
    && typeof env.SESSION_SECRET === "string" && env.SESSION_SECRET.length >= 32;
}
export const totpEnabled = (env) => typeof env.ADMIN_TOTP_SECRET === "string" && env.ADMIN_TOTP_SECRET.replace(/[^A-Z2-7]/gi, "").length >= 16;
export const turnstileEnabled = (env) => !!(env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY);

/* ------------------------------------------------------------- request info */
export function clientInfo(request) {
  return {
    ip: request.headers.get("cf-connecting-ip") || "local",
    country: (request.cf && request.cf.country) || request.headers.get("cf-ipcountry") || "",
    ua: (request.headers.get("user-agent") || "").slice(0, 200),
  };
}

export async function audit(env, request, event, detail = "") {
  try {
    const c = clientInfo(request);
    await env.DB.prepare("INSERT INTO audit_log (at, event, ip, country, ua, detail) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(nowSec(), event, c.ip, c.country, c.ua, String(detail).slice(0, 300)).run();
  } catch { /* logging must never break the request */ }
}

/* ------------------------------------------------------------ form token */
// Issued by /api/session when the login form is shown; required (and at least 2 s old) to log in.
export async function makeFormToken(env) {
  const t = String(nowSec());
  return `${t}.${await hmacB64(env.SESSION_SECRET, "form:" + t)}`;
}
export async function checkFormToken(env, token) {
  const [t, sig] = String(token || "").split(".");
  if (!t || !sig || !(await safeEqual(sig, await hmacB64(env.SESSION_SECRET, "form:" + t)))) return "invalid";
  const age = nowSec() - Number(t);
  if (age < FORM_MIN_AGE) return "too_fast";
  if (age > FORM_MAX_AGE) return "expired";
  return "ok";
}

/* -------------------------------------------------------- brute force guard */
export async function guardState(env, ip) {
  const row = await env.DB.prepare("SELECT fails, first_at, locked_until FROM login_guard WHERE ip = ?").bind(ip).first();
  const t = nowSec();
  return { row, locked: !!row && row.locked_until > t, retryIn: row ? Math.max(0, row.locked_until - t) : 0 };
}
// weight: 1 for a wrong password, 5 for a honeypot hit (locks at once)
export async function registerFailure(env, ip, weight = 1) {
  const t = nowSec();
  // "Alert mode": many failures across all IPs in the last hour → lock after 2 instead of 5
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE event IN ('login_fail', 'honeypot') AND at > ?").bind(t - 3600).first();
  const threshold = recent && recent.n > 20 ? 2 : 5;
  const row = await env.DB.prepare("SELECT fails, first_at FROM login_guard WHERE ip = ?").bind(ip).first();
  const fails = !row || t - row.first_at > FAIL_WINDOW ? weight : row.fails + weight;
  const first = !row || t - row.first_at > FAIL_WINDOW ? t : row.first_at;
  const locked = fails >= threshold ? t + Math.min(LOCK_MAX, LOCK_BASE * 2 ** Math.min(10, fails - threshold)) : 0;
  await env.DB.prepare("INSERT INTO login_guard (ip, fails, first_at, locked_until) VALUES (?, ?, ?, ?) ON CONFLICT(ip) DO UPDATE SET fails = excluded.fails, first_at = excluded.first_at, locked_until = excluded.locked_until")
    .bind(ip, fails, first, locked).run();
  return { fails, locked: locked > t, retryIn: locked ? locked - t : 0 };
}
export const clearFailures = (env, ip) => env.DB.prepare("DELETE FROM login_guard WHERE ip = ?").bind(ip).run();

/* ------------------------------------------------------------------- TOTP */
function base32Decode(s) {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0, val = 0;
  const out = [];
  for (const c of s.toUpperCase().replace(/[^A-Z2-7]/g, "")) {
    val = (val << 5) | A.indexOf(c); bits += 5;
    if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}
async function totpCode(key, step) {
  const msg = new ArrayBuffer(8);
  const dv = new DataView(msg);
  dv.setUint32(0, Math.floor(step / 2 ** 32));
  dv.setUint32(4, step >>> 0);
  const hs = await hmac(key, new Uint8Array(msg), "SHA-1");
  const o = hs[19] & 15;
  const n = (((hs[o] & 127) << 24) | (hs[o + 1] << 16) | (hs[o + 2] << 8) | hs[o + 3]) % 1e6;
  return String(n).padStart(6, "0");
}
// Accepts the current 30 s code or the neighbouring ones (clock drift). A code can't be reused.
export async function verifyTotp(env, code) {
  const c = String(code || "").replace(/\D/g, "");
  if (c.length !== 6) return false;
  const key = base32Decode(env.ADMIN_TOTP_SECRET);
  const step = Math.floor(Date.now() / 30000);
  const last = await env.DB.prepare("SELECT v FROM kv WHERE k = 'totp_last_step'").first();
  for (const s of [step, step - 1, step + 1]) {
    if (last && s <= Number(last.v)) continue;
    if (await safeEqual(await totpCode(key, s), c)) {
      await env.DB.prepare("INSERT INTO kv (k, v) VALUES ('totp_last_step', ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").bind(String(s)).run();
      return true;
    }
  }
  return false;
}

/* --------------------------------------------------------------- Turnstile */
export async function verifyTurnstile(env, token, ip) {
  if (!turnstileEnabled(env)) return true;
  if (!token) return false;
  const fd = new FormData();
  fd.append("secret", env.TURNSTILE_SECRET);
  fd.append("response", String(token));
  if (ip && ip !== "local") fd.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: fd });
    return !!(await r.json()).success;
  } catch { return false; }
}

/* ---------------------------------------------------------------- sessions */
const cookieName = (request) => (new URL(request.url).protocol === "https:" ? "__Host-sess" : "sess");
function readCookie(request, name) {
  for (const part of (request.headers.get("cookie") || "").split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1));
  }
  return null;
}
export function sessionCookie(request, token) {
  const https = new URL(request.url).protocol === "https:";
  return `${cookieName(request)}=${token ? encodeURIComponent(token) : ""}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${token ? SESSION_MAX : 0}${https ? "; Secure" : ""}`;
}
export async function createSession(env, request) {
  const token = randomToken();
  const id = await hmacB64(env.SESSION_SECRET, "sess:" + token);
  const t = nowSec(), c = clientInfo(request);
  await env.DB.prepare("INSERT INTO sessions (id, created_at, last_seen, expires_at, ip, country, ua) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(id, t, t, t + SESSION_MAX, c.ip, c.country, c.ua).run();
  // Housekeeping: expired sessions and 90-day-old log lines
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires_at < ? OR last_seen < ?").bind(t, t - SESSION_IDLE),
    env.DB.prepare("DELETE FROM audit_log WHERE at < ?").bind(t - 90 * 86400),
  ]);
  return token;
}
// Returns the session row (with .id) or null
export async function getSession(env, request) {
  if (!secretsOk(env) || !env.DB) return null;
  const token = readCookie(request, cookieName(request));
  if (!token || token.length > 100) return null;
  const id = await hmacB64(env.SESSION_SECRET, "sess:" + token);
  let row;
  try { row = await env.DB.prepare("SELECT id, created_at, last_seen, expires_at, ip, country, ua FROM sessions WHERE id = ?").bind(id).first(); }
  catch { return null; }
  const t = nowSec();
  if (!row || row.expires_at < t || row.last_seen < t - SESSION_IDLE) return null;
  if (t - row.last_seen > 300) await env.DB.prepare("UPDATE sessions SET last_seen = ? WHERE id = ?").bind(t, id).run();
  return row;
}
export const revokeSession = (env, id) => env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();

// Requests that change data must come from the panel itself (CSRF guard on top of SameSite=Strict)
export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}
