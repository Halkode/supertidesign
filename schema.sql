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

-- Proteção do login: falhas por IP e bloqueio progressivo
CREATE TABLE IF NOT EXISTS login_guard (
  ip TEXT PRIMARY KEY,
  fails INTEGER NOT NULL,
  first_at INTEGER NOT NULL,     -- segundos (epoch) da primeira falha da janela
  locked_until INTEGER NOT NULL DEFAULT 0
);

-- Sessões do painel. O id é um HMAC do token do cookie: quem lê o banco não consegue
-- montar um cookie válido. Sair = apagar a linha.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip TEXT, country TEXT, ua TEXT
);

-- Registro de acessos e ações (aba Segurança do painel)
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at INTEGER NOT NULL,
  event TEXT NOT NULL,           -- login_ok, login_fail, login_blocked, honeypot, logout, publish, upload…
  ip TEXT, country TEXT, ua TEXT,
  detail TEXT
);
CREATE INDEX IF NOT EXISTS audit_at ON audit_log (at);
CREATE INDEX IF NOT EXISTS audit_event_at ON audit_log (event, at);

-- Pequenos valores internos (ex.: último código de 2 fatores usado, contra reutilização)
CREATE TABLE IF NOT EXISTS kv (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
