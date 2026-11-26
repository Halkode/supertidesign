-- Banco D1 do painel. Aplicar com:
--   npx wrangler d1 execute supertidesign --remote --file=schema.sql   (produção)
--   npx wrangler d1 execute supertidesign --local  --file=schema.sql   (local)

-- Rascunho: o conteúdo que está sendo editado no painel (uma linha só)
CREATE TABLE IF NOT EXISTS draft (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL,            -- JSON no formato de content/default.json
  updated_at TEXT NOT NULL
);

-- Versões publicadas: a mais recente é a que está no ar. Guardamos o HTML pronto
-- (o site abre com uma leitura só) e o JSON (para restaurar uma versão antiga).
CREATE TABLE IF NOT EXISTS versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL,
  html TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);

-- Arquivos enviados pelo painel (os bytes ficam no R2)
CREATE TABLE IF NOT EXISTS media (
  key TEXT PRIMARY KEY,          -- ex.: media/uploads/k3j2h1 (é o que o conteúdo referencia)
  kind TEXT NOT NULL,            -- image | font | file
  name TEXT,                     -- nome original do arquivo
  mime TEXT,
  size INTEGER,
  w INTEGER, h INTEGER,          -- imagens
  lg TEXT, sm TEXT,              -- caminhos servidos (media/uploads/….webp)
  created_at TEXT NOT NULL
);

-- Limite de tentativas de login por IP
CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  first_at INTEGER NOT NULL
);
