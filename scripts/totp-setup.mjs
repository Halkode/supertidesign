// Gera a chave da verificação em 2 etapas (TOTP) do painel.
// Uso:  node scripts/totp-setup.mjs            → cria uma chave nova
//       node scripts/totp-setup.mjs CHAVE      → mostra o código atual de uma chave (para conferir)
//
// 1. Rode o script e copie a CHAVE.
// 2. No app autenticador (Google Authenticator, Microsoft Authenticator, Authy, 1Password…):
//    "Adicionar conta" → "Inserir chave de configuração" → cole a CHAVE (tipo: baseado em tempo).
// 3. No Cloudflare (Pages → Settings → Variables and Secrets) crie o segredo ADMIN_TOTP_SECRET
//    com a CHAVE. Guarde a chave num lugar seguro (é o backup caso perca o celular).
import crypto from "node:crypto";

const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const encode = (buf) => { let bits = 0, val = 0, out = ""; for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += A[(val >>> (bits - 5)) & 31]; bits -= 5; } } if (bits) out += A[(val << (5 - bits)) & 31]; return out; };
const decode = (s) => { let bits = 0, val = 0; const out = []; for (const c of s.toUpperCase().replace(/[^A-Z2-7]/g, "")) { val = (val << 5) | A.indexOf(c); bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); };
const code = (key, step = Math.floor(Date.now() / 30000)) => {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac("sha1", key).update(msg).digest();
  const o = h[19] & 15;
  return String((((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, "0");
};

const given = process.argv[2];
const secret = given ? given.toUpperCase().replace(/[^A-Z2-7]/g, "") : encode(crypto.randomBytes(20));
if (!given) {
  console.log("\nCHAVE (ADMIN_TOTP_SECRET):\n\n  " + secret.match(/.{1,4}/g).join(" ") + "\n");
  console.log("Para apps que aceitam link/QR:\n  otpauth://totp/Painel%20do%20site?secret=" + secret + "&issuer=supertidesign\n");
}
console.log("Código agora: " + code(decode(secret)) + "  (confira se o app mostra o mesmo)\n");
