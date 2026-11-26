// GET /api/content → draft + info about the published version
// PUT /api/content { data, base } → saves the draft. `base` is the updated_at the panel loaded;
// if someone saved in between (another tab/device), the save is refused instead of overwriting.
import { fail, json, needBindings, now, readJson } from "../../server/http.js";
import { DEFAULT_CONTENT, getDraft } from "../../server/site.js";

export async function onRequestGet({ env, request }) {
  // ?default=1 → the original content (for "Voltar ao original" / "Usar o original" in the panel)
  if (new URL(request.url).searchParams.get("default")) return json({ data: DEFAULT_CONTENT });
  const missing = needBindings(env, "DB");
  if (missing) return missing;
  const draft = await getDraft(env);
  const pub = await env.DB.prepare("SELECT id, note, created_at FROM versions ORDER BY id DESC LIMIT 1").first();
  return json({ ...draft, published: pub || null });
}

export async function onRequestPut({ request, env }) {
  const missing = needBindings(env, "DB");
  if (missing) return missing;
  const { data, base = null, force = false } = await readJson(request);
  if (!data || typeof data !== "object" || !data.site || !data.i18n) return fail(400, "Conteúdo inválido.");
  const cur = await env.DB.prepare("SELECT updated_at FROM draft WHERE id = 1").first();
  if (!force && cur && cur.updated_at !== base) {
    return json({ error: "O rascunho foi alterado em outra aba ou dispositivo. Recarregue para ver a versão mais nova.", conflict: true, updated_at: cur.updated_at }, 409);
  }
  const updated_at = now();
  await env.DB.prepare("INSERT INTO draft (id, data, updated_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at")
    .bind(JSON.stringify(data), updated_at).run();
  return json({ ok: true, updated_at });
}
