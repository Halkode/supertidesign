// POST /api/logout → ends this session on the server and clears the cookie
import { audit, revokeSession, sessionCookie } from "../../server/auth.js";
import { json } from "../../server/http.js";

export async function onRequestPost({ request, env, data }) {
  if (data.session) {
    await revokeSession(env, data.session.id);
    await audit(env, request, "logout");
  }
  return json({ ok: true }, 200, { "set-cookie": sessionCookie(request, "") });
}
