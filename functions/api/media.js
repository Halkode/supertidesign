// GET    /api/media              → images bundled with the site + everything uploaded
// POST   /api/media  (multipart) → upload. Fields:
//          kind=image  lg=<webp ≤1800px> [sm=<webp ≤800px>] w h name   (the panel converts to WebP)
//          kind=font|file|brand    file=<file> name
// DELETE /api/media?key=…        → removes an upload that the draft and the live site don't use
import { fail, json, needBindings, now } from "../../server/http.js";
import staticMeta from "../../public/assets/img/meta.json";

const LIMITS = { image: 15e6, font: 5e6, file: 25e6, brand: 3e6 };

// Accept a file only if its first bytes match what it claims to be
function sniff(bytes) {
  const b = new Uint8Array(bytes.slice(0, 16));
  const s = String.fromCharCode(...b);
  if (s.startsWith("RIFF") && s.slice(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (b[0] === 0x89 && s.slice(1, 4) === "PNG") return { mime: "image/png", ext: "png" };
  if (b[0] === 0xff && b[1] === 0xd8) return { mime: "image/jpeg", ext: "jpg" };
  if (s.startsWith("wOF2")) return { mime: "font/woff2", ext: "woff2" };
  if (s.startsWith("wOFF")) return { mime: "font/woff", ext: "woff" };
  if (s.startsWith("OTTO")) return { mime: "font/otf", ext: "otf" };
  if ((b[0] === 0 && b[1] === 1 && b[2] === 0 && b[3] === 0) || s.startsWith("true")) return { mime: "font/ttf", ext: "ttf" };
  if (s.startsWith("%PDF")) return { mime: "application/pdf", ext: "pdf" };
  const head = new TextDecoder().decode(bytes.slice(0, 1024)).trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!doctype svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return { mime: "image/svg+xml", ext: "svg" };
  return null;
}
const ALLOWED = {
  image: ["webp"],
  font: ["woff2", "woff", "otf", "ttf"],
  file: ["pdf"],
  brand: ["svg", "png", "webp"],
};
const rid = () => [...crypto.getRandomValues(new Uint8Array(9))].map((x) => x.toString(36).padStart(2, "0")).join("").slice(0, 14);
const cleanName = (n) => String(n || "arquivo").replace(/[^\p{L}\p{N} ._()-]/gu, "").slice(0, 120);

export async function onRequestGet({ env }) {
  const missing = needBindings(env, "DB");
  if (missing) return missing;
  const { results } = await env.DB.prepare("SELECT key, kind, name, mime, size, w, h, lg, sm, created_at FROM media ORDER BY created_at DESC").all();
  return json({
    bundled: Object.entries(staticMeta).map(([key, m]) => ({ key, kind: "image", w: m.w, h: m.h, lg: "assets/img/" + m.lg, sm: "assets/img/" + m.sm, bundled: true })),
    uploads: results,
  });
}

export async function onRequestPost({ request, env }) {
  const missing = needBindings(env, "DB", "MEDIA");
  if (missing) return missing;
  const form = await request.formData();
  const kind = String(form.get("kind") || "");
  if (!ALLOWED[kind]) return fail(400, "Tipo de envio inválido.");
  const name = cleanName(form.get("name"));
  const id = rid();
  const created_at = now();

  if (kind === "image") {
    const lg = form.get("lg"), sm = form.get("sm");
    const w = Math.round(Number(form.get("w"))), h = Math.round(Number(form.get("h")));
    if (!(lg instanceof File) || !(w > 0 && h > 0 && w <= 20000 && h <= 20000)) return fail(400, "Imagem inválida.");
    const files = [["lg", lg], ...(sm instanceof File ? [["sm", sm]] : [])];
    let size = 0;
    const types = {};
    for (const [slot, f] of files) {
      if (f.size > LIMITS.image) return fail(413, "Imagem grande demais (máx. 15 MB).");
      const t = sniff(await f.slice(0, 1024).arrayBuffer());
      // WebP normally; JPEG/PNG when the browser can't encode WebP (older Safari)
      if (!t || !["webp", "jpg", "png"].includes(t.ext)) return fail(415, "Formato de imagem não aceito.");
      types[slot] = t;
      size += f.size;
    }
    const lgKey = `uploads/${id}.${types.lg.ext}`, smKey = sm instanceof File ? `uploads/${id}-sm.${types.sm.ext}` : null;
    await env.MEDIA.put(lgKey, lg.stream(), { httpMetadata: { contentType: types.lg.mime } });
    if (smKey) await env.MEDIA.put(smKey, sm.stream(), { httpMetadata: { contentType: types.sm.mime } });
    const row = { key: `media/uploads/${id}`, kind, name, mime: types.lg.mime, size, w, h, lg: `media/${lgKey}`, sm: `media/${smKey || lgKey}`, created_at };
    await env.DB.prepare("INSERT INTO media (key, kind, name, mime, size, w, h, lg, sm, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(row.key, kind, name, row.mime, size, w, h, row.lg, row.sm, created_at).run();
    return json({ ok: true, media: row });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return fail(400, "Arquivo ausente.");
  if (file.size > LIMITS[kind]) return fail(413, `Arquivo grande demais (máx. ${LIMITS[kind] / 1e6} MB).`);
  const t = sniff(await file.slice(0, 1024).arrayBuffer());
  if (!t || !ALLOWED[kind].includes(t.ext)) return fail(415, `Formato não aceito. Use: ${ALLOWED[kind].join(", ")}.`);
  const key = `uploads/${id}.${t.ext}`;
  const disposition = kind === "file" ? `inline; filename="${name.replace(/"/g, "")}"` : undefined;
  await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: t.mime, ...(disposition ? { contentDisposition: disposition } : {}) } });
  const row = { key: `media/${key}`, kind, name, mime: t.mime, size: file.size, w: null, h: null, lg: `media/${key}`, sm: null, created_at };
  await env.DB.prepare("INSERT INTO media (key, kind, name, mime, size, w, h, lg, sm, created_at) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, NULL, ?)")
    .bind(row.key, kind, name, row.mime, row.size, row.lg, created_at).run();
  return json({ ok: true, media: row });
}

export async function onRequestDelete({ request, env }) {
  const missing = needBindings(env, "DB", "MEDIA");
  if (missing) return missing;
  const key = new URL(request.url).searchParams.get("key") || "";
  const row = await env.DB.prepare("SELECT key, lg, sm FROM media WHERE key = ?").bind(key).first();
  if (!row) return fail(404, "Arquivo não encontrado.");
  // Never break the draft or the live site
  const draft = await env.DB.prepare("SELECT data FROM draft WHERE id = 1").first();
  const live = await env.DB.prepare("SELECT data FROM versions ORDER BY id DESC LIMIT 1").first();
  const used = [draft && draft.data, live && live.data].some((d) => d && (d.includes(`"${row.key}"`) || d.includes(`"${row.lg}"`)));
  if (used) return fail(409, "Este arquivo está em uso no rascunho ou no site publicado. Tire-o de lá antes de apagar.");
  const keys = [row.lg, row.sm].filter(Boolean).map((p) => p.replace(/^media\//, ""));
  await env.MEDIA.delete([...new Set(keys)]);
  await env.DB.prepare("DELETE FROM media WHERE key = ?").bind(key).run();
  return json({ ok: true });
}
