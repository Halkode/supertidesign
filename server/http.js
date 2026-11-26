// Small helpers shared by the routes in functions/
export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

export const fail = (status, message) => json({ error: message }, status);

export const now = () => new Date().toISOString();

// The panel only works when the D1 binding exists; say so clearly instead of a 500
export function needBindings(env, ...names) {
  const missing = names.filter((n) => !env[n]);
  return missing.length ? fail(503, `Configuração incompleta no Cloudflare: falta o binding ${missing.join(", ")} (veja o README).`) : null;
}

export async function readJson(request, max = 4_000_000) {
  const len = Number(request.headers.get("content-length") || 0);
  if (len > max) throw Object.assign(new Error("Conteúdo grande demais."), { status: 413 });
  const text = await request.text();
  if (text.length > max) throw Object.assign(new Error("Conteúdo grande demais."), { status: 413 });
  try { return JSON.parse(text); } catch { throw Object.assign(new Error("JSON inválido."), { status: 400 }); }
}
