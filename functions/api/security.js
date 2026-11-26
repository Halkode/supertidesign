// GET    /api/security            → protections on/off, active sessions, recent log
// DELETE /api/security?session=ID → ends one session;  ?all=1 → ends every other session
import { audit, nowSec, totpEnabled, turnstileEnabled } from "../../server/auth.js";
import { fail, json } from "../../server/http.js";

export async function onRequestGet({ env, data }) {
  const t = nowSec();
  const [sessions, log, fails] = await Promise.all([
    env.DB.prepare("SELECT id, created_at, last_seen, ip, country, ua FROM sessions WHERE expires_at > ? ORDER BY last_seen DESC").bind(t).all(),
    env.DB.prepare("SELECT at, event, ip, country, ua, detail FROM audit_log ORDER BY id DESC LIMIT 150").all(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE event IN ('login_fail', 'honeypot', 'login_blocked') AND at > ?").bind(t - 86400).first(),
  ]);
  return json({
    protections: {
      totp: totpEnabled(env),
      turnstile: turnstileEnabled(env),
      access: !!data.accessUser,
    },
    accessUser: data.accessUser,
    failures24h: fails ? fails.n : 0,
    sessions: sessions.results.map((s) => ({ ...s, id: s.id.slice(0, 12), current: s.id === data.session.id })),
    log: log.results,
  });
}

export async function onRequestDelete({ request, env, data }) {
  const url = new URL(request.url);
  if (url.searchParams.get("all")) {
    await env.DB.prepare("DELETE FROM sessions WHERE id <> ?").bind(data.session.id).run();
    await audit(env, request, "sessions_revoked", "todas as outras sessões");
    return json({ ok: true });
  }
  const prefix = url.searchParams.get("session") || "";
  if (!/^[\w-]{12}$/.test(prefix)) return fail(400, "Sessão inválida.");
  const res = await env.DB.prepare("DELETE FROM sessions WHERE substr(id, 1, 12) = ? AND id <> ?").bind(prefix, data.session.id).run();
  await audit(env, request, "sessions_revoked", "uma sessão");
  return json({ ok: true, removed: res.meta.changes });
}
