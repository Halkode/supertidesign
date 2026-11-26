// GET  /api/versions/:id  → that version rendered as a page (to look at it)
// POST /api/versions/:id  → copies that version into the draft (then publish to put it live)
import { fail, json, needBindings, now } from "../../../server/http.js";
import { finalize } from "../../../server/site.js";
import { audit } from "../../../server/auth.js";

const getId = (params) => (/^\d+$/.test(params.id) ? Number(params.id) : null);

export async function onRequestGet({ env, params }) {
  const missing = needBindings(env, "DB");
  if (missing) return missing;
  const id = getId(params);
  const row = id && await env.DB.prepare("SELECT html FROM versions WHERE id = ?").bind(id).first();
  if (!row) return fail(404, "Versão não encontrada.");
  const html = finalize(row.html).replace("<head>", '<head>\n<base href="/">\n<meta name="robots" content="noindex">');
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function onRequestPost({ env, params, request }) {
  const missing = needBindings(env, "DB");
  if (missing) return missing;
  const id = getId(params);
  const row = id && await env.DB.prepare("SELECT data FROM versions WHERE id = ?").bind(id).first();
  if (!row) return fail(404, "Versão não encontrada.");
  const updated_at = now();
  await env.DB.prepare("INSERT INTO draft (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at")
    .bind(row.data, updated_at).run();
  await audit(env, request, "restore", `versão #${id}`);
  return json({ ok: true, updated_at, data: JSON.parse(row.data) });
}
