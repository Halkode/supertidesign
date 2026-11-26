// POST /api/login { password } → session cookie
import { makeSession, safeEqual, secretsOk, sessionCookie } from "../../server/auth.js";
import { fail, json, needBindings, readJson } from "../../server/http.js";

const WINDOW = 15 * 60; // seconds
const MAX_TRIES = 10;

export async function onRequestPost({ request, env }) {
  const missing = needBindings(env, "DB");
  if (missing) return missing;
  if (!secretsOk(env)) return fail(503, "Defina os segredos ADMIN_PASSWORD (8+ caracteres) e SESSION_SECRET (32+ caracteres) no Cloudflare.");

  const ip = request.headers.get("cf-connecting-ip") || "local";
  const t = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare("SELECT count, first_at FROM login_attempts WHERE ip = ?").bind(ip).first();
  if (row && t - row.first_at < WINDOW && row.count >= MAX_TRIES) {
    return fail(429, "Muitas tentativas. Espere alguns minutos e tente de novo.");
  }

  const { password = "" } = await readJson(request, 10_000);
  if (!(await safeEqual(password, env.ADMIN_PASSWORD))) {
    if (!row || t - row.first_at >= WINDOW) {
      await env.DB.prepare("INSERT OR REPLACE INTO login_attempts (ip, count, first_at) VALUES (?, 1, ?)").bind(ip, t).run();
    } else {
      await env.DB.prepare("UPDATE login_attempts SET count = count + 1 WHERE ip = ?").bind(ip).run();
    }
    return fail(401, "Senha incorreta.");
  }
  await env.DB.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(await makeSession(env), request) });
}
