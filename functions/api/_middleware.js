// Every /api/* route needs a valid session, except login and the session probe.
// The session row is passed on as context.data.session.
import { getSession, sameOrigin, secretsOk } from "../../server/auth.js";
import { fail } from "../../server/http.js";

const PUBLIC = new Set(["/api/login", "/api/session"]);

export async function onRequest({ request, env, next, data }) {
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  if (request.method !== "GET" && request.method !== "HEAD" && !sameOrigin(request)) return fail(403, "Origem não permitida.");
  data.session = await getSession(env, request);
  // Set by Cloudflare Access when it protects /admin and /api (shown in the Security tab only)
  data.accessUser = request.headers.get("cf-access-authenticated-user-email") || null;
  if (!PUBLIC.has(path)) {
    if (!secretsOk(env)) return fail(503, "Defina os segredos ADMIN_PASSWORD (12+ caracteres) e SESSION_SECRET (32+ caracteres) no Cloudflare.");
    if (!data.session) return fail(401, "Faça login.");
  }
  try {
    const res = await next();
    const out = new Response(res.body, res); // headers of a fetched/static response can be immutable
    out.headers.set("x-robots-tag", "noindex");
    out.headers.set("x-content-type-options", "nosniff");
    out.headers.set("referrer-policy", "same-origin");
    out.headers.set("x-frame-options", "SAMEORIGIN");
    out.headers.set("cache-control", out.headers.get("cache-control") || "no-store");
    return out;
  } catch (e) {
    return fail(e.status || 500, e.status ? e.message : "Erro no servidor: " + (e.message || e));
  }
}
