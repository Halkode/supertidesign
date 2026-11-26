// GET /media/<key> — files uploaded through the panel, straight from R2.
// Keys are random and never reused, so they can be cached for a year.
export async function onRequestGet({ env, params, request }) {
  if (!env.MEDIA) return new Response("Not found", { status: 404 });
  const key = (Array.isArray(params.path) ? params.path : [params.path]).join("/");
  if (!/^uploads\/[\w.-]+$/.test(key)) return new Response("Not found", { status: 404 });
  const obj = await env.MEDIA.get(key, { onlyIf: request.headers });
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  // An uploaded SVG opened directly can't run scripts
  headers.set("content-security-policy", "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox");
  headers.set("access-control-allow-origin", "*"); // fonts are fetched with CORS
  if (!("body" in obj) || !obj.body) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
}
