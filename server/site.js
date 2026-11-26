// Content access + rendering on the server (routes in functions/)
import { ORIGIN_PLACEHOLDER, renderSite } from "../public/shared/render.js";
import defaults from "../content/default.json";
import staticMeta from "../public/assets/img/meta.json";
import { ASSET_V } from "./version.js";

export const V_PLACEHOLDER = "__ASSET_V__";
export const DEFAULT_CONTENT = defaults;

// Images bundled with the site + images uploaded through the panel
export async function loadMeta(env) {
  const meta = { ...staticMeta };
  const { results } = await env.DB.prepare("SELECT key, w, h, lg, sm FROM media WHERE kind = 'image'").all();
  for (const r of results) meta[r.key] = { w: r.w, h: r.h, lg: r.lg, sm: r.sm };
  return meta;
}

export async function getDraft(env) {
  const row = await env.DB.prepare("SELECT data, updated_at FROM draft WHERE id = 1").first();
  return row ? { data: JSON.parse(row.data), updated_at: row.updated_at, isDefault: false } : { data: DEFAULT_CONTENT, updated_at: null, isDefault: true };
}

export async function render(env, content, { preview = false } = {}) {
  const meta = await loadMeta(env);
  // The stored HTML keeps a placeholder for the css/js version, filled in when it is served,
  // so a code deploy (new ASSET_V) never serves stale styles with an old published page.
  return renderSite(content, meta, { assetV: V_PLACEHOLDER, preview });
}

// Fills the placeholders: css/js version and the site address (absolute URLs for the share card)
export const finalize = (html, origin = "") => html.split(V_PLACEHOLDER).join(ASSET_V).split(ORIGIN_PLACEHOLDER).join(origin);
