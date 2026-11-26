// POST /api/publish { note } → renders the saved draft and puts it live
import { fail, json, needBindings, now, readJson } from "../../server/http.js";
import { getDraft, render } from "../../server/site.js";

const KEEP = 60; // versions kept in the history

export async function onRequestPost({ request, env }) {
  const missing = needBindings(env, "DB");
  if (missing) return missing;
  const { note = "" } = await readJson(request, 10_000);
  const draft = await getDraft(env);
  const html = await render(env, draft.data);
  if (html.length > 1_800_000) return fail(413, "A página ficou grande demais para publicar.");
  const created_at = now();
  const res = await env.DB.prepare("INSERT INTO versions (data, html, note, created_at) VALUES (?, ?, ?, ?)")
    .bind(JSON.stringify(draft.data), html, String(note).slice(0, 200), created_at).run();
  await env.DB.prepare("DELETE FROM versions WHERE id NOT IN (SELECT id FROM versions ORDER BY id DESC LIMIT ?)").bind(KEEP).run();
  return json({ ok: true, id: res.meta.last_row_id, created_at });
}
