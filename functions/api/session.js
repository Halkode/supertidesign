// GET /api/session → { authed, configured } (lets the panel decide between login and editor)
import { isAuthed, secretsOk } from "../../server/auth.js";
import { json } from "../../server/http.js";

export async function onRequestGet({ request, env }) {
  return json({
    authed: await isAuthed(request, env),
    configured: secretsOk(env) && !!env.DB,
    storage: !!env.MEDIA,
  });
}
