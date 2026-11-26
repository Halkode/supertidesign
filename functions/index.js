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

// Static fallback (public/index.html): same placeholders, filled here
async function fallback(request, next) {
  const res = await next();
  if (!res.ok || !(res.headers.get("content-type") || "").includes("text/html")) return res;
  const out = new Response(finalize(await res.text(), new URL(request.url).origin), res);
  out.headers.delete("content-length");
  return out;
}

export async function onRequestGet(ctx) {
  const { env, request } = ctx;
  const next = () => fallback(request, ctx.next);
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
  return new Response(finalize(row.html, new URL(request.url).origin), { headers });
}
