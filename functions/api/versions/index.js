// GET /api/versions → published history (newest first)
import { json, needBindings } from "../../../server/http.js";

export async function onRequestGet({ env }) {
  const missing = needBindings(env, "DB");
  if (missing) return missing;
  const { results } = await env.DB.prepare("SELECT id, note, created_at, length(html) AS size FROM versions ORDER BY id DESC").all();
  return json({ versions: results });
}
