// GET / — serves the version published from the panel. Until the first publish (or if D1 is
// not configured yet) it falls through to the static public/index.html built by build.mjs.
import { finalize } from "../server/site.js";
import { ASSET_V } from "../server/version.js";

const SECURITY = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-frame-options": "SAMEORIGIN",
};

export async function onRequestGet({ env, request, next }) {
  if (!env.DB) return next();
  let row;
  try {
    row = await env.DB.prepare("SELECT id, html FROM versions ORDER BY id DESC LIMIT 1").first();
  } catch {
    return next(); // tables not created yet
  }
  if (!row) return next();
  const etag = `"v${row.id}-${ASSET_V}"`;
  const headers = { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", etag, ...SECURITY };
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(finalize(row.html), { headers });
}
