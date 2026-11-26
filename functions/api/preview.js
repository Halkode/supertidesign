// GET /api/preview → the saved draft rendered as a page (open in a new tab / on the phone)
import { needBindings } from "../../server/http.js";
import { finalize, getDraft, render } from "../../server/site.js";

export async function onRequestGet({ env }) {
  const missing = needBindings(env, "DB");
  if (missing) return missing;
  const draft = await getDraft(env);
  const html = finalize(await render(env, draft.data, { preview: true }));
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
