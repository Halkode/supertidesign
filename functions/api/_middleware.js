// Every /api/* route needs a valid session, except login and the session probe.
import { isAuthed, sameOrigin, secretsOk } from "../../server/auth.js";
import { fail } from "../../server/http.js";

const PUBLIC = new Set(["/api/login", "/api/session"]);

export async function onRequest({ request, env, next }) {
  const path = new URL(request.url).pathname.replace(/\/$/, "");
  if (request.method !== "GET" && request.method !== "HEAD" && !sameOrigin(request)) return fail(403, "Origem não permitida.");
  if (!PUBLIC.has(path)) {
    if (!secretsOk(env)) return fail(503, "Defina os segredos ADMIN_PASSWORD (8+ caracteres) e SESSION_SECRET (32+ caracteres) no Cloudflare.");
    if (!(await isAuthed(request, env))) return fail(401, "Faça login.");
  }
  try {
    const res = await next();
    res.headers.set("x-robots-tag", "noindex");
    return res;
  } catch (e) {
    return fail(e.status || 500, e.status ? e.message : "Erro no servidor: " + (e.message || e));
  }
}
