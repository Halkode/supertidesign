// GET /api/session → what the login screen needs: is the user in, is the panel configured,
// which extra factors are on, and a fresh form token (the login must wait ≥ 2 s after it).
import { getSession, makeFormToken, secretsOk, totpEnabled, turnstileEnabled } from "../../server/auth.js";
import { json } from "../../server/http.js";

export async function onRequestGet({ request, env }) {
  const configured = secretsOk(env) && !!env.DB;
  const session = configured ? await getSession(env, request) : null;
  return json({
    authed: !!session,
    configured,
    storage: !!env.MEDIA,
    totp: totpEnabled(env),
    turnstileSiteKey: turnstileEnabled(env) ? env.TURNSTILE_SITE_KEY : null,
    form: configured && !session ? await makeFormToken(env) : null,
  });
}
