# supertidesign

Site-portfólio de **Guilherme Eccel Superti**: designer, ilustrador, artista 3D e editor de vídeo.

É uma página única, em três idiomas (PT, EN e JA). As animações usam [anime.js 4](https://animejs.com) e a rolagem suave usa [Lenis](https://github.com/darkroomengineering/lenis). O site fica hospedado no **Cloudflare Pages** e tem um **painel próprio** em `/admin`. Pelo painel dá para trocar cores, fontes, textos, imagens e o tempo das animações, sem mexer em código.

## Como funciona

O site é desenhado por `public/shared/render.js` a partir de um único documento JSON. O formato desse documento está em `content/default.json`. Três lugares usam o mesmo renderizador:

| Onde | Para quê |
|---|---|
| `build.mjs` (Node) | Gera `public/index.html`, a versão estática de reserva. |
| Pages Functions (`functions/`) | Geram a página na hora de **Publicar** no painel. |
| Painel (`public/admin/`) | Mostra a prévia ao vivo. |

```
Painel (/admin) ── salva rascunho ──▶ D1 (tabela draft)
      │                                   │
      ├── envia fotos/fontes/PDF ──▶ R2 (servido em /media/…)
      │                                   │
      └── Publicar ──▶ renderiza ──▶ D1 (tabela versions: HTML pronto + JSON)
                                          │
Visitante ── GET / ──▶ functions/index.js ─┘  (sem versão publicada → public/index.html)
```

- **D1** (SQLite da Cloudflare) guarda o rascunho, as versões publicadas (até 60, para restaurar) e a lista de arquivos enviados.
- **R2** guarda os arquivos enviados. O painel converte as fotos para WebP no próprio navegador, em dois tamanhos: até 1800 px e 800 px.
- **Login**: uma senha (`ADMIN_PASSWORD`) e um cookie de sessão assinado (`SESSION_SECRET`). Há limite de tentativas por IP.

## Configurar no Cloudflare (uma vez)

Faça estes passos **antes** do merge na `main`. O `wrangler.toml` precisa ter o id real do banco, senão o deploy falha.

```bash
npm install
npx wrangler login
npx wrangler d1 create supertidesign        # copie o database_id para o wrangler.toml
npx wrangler r2 bucket create supertidesign-media
npm run db:remote                            # cria as tabelas (schema.sql)
```

Depois, no painel da Cloudflare:

1. **Pages → projeto do site → Settings → Variables and Secrets.** Crie dois segredos para *Production* e *Preview*:
   - `ADMIN_PASSWORD`: a senha do painel, com 8 caracteres ou mais;
   - `SESSION_SECRET`: um texto aleatório de 32 caracteres ou mais. Para gerar um: `node -e "console.log(crypto.randomBytes(32).toString('hex'))"`.
2. **Build:** se o projeto estiver ligado ao GitHub, não precisa de comando de build. A pasta publicada (`public`) e as ligações com D1 e R2 já vêm do `wrangler.toml`.
3. Faça o deploy, abra `https://SEU-SITE/admin` e entre com a senha.

Sem o D1 configurado, o site continua no ar com a versão estática. Só o painel avisa que falta configuração.

## Rodar localmente

```bash
npm install
cp .dev.vars.example .dev.vars   # defina uma senha de teste
npm run db:local                 # cria as tabelas no D1 local
npm run dev                      # http://localhost:8788  (painel em /admin)
```

Para ver só a versão estática, sem painel, rode `node serve.mjs` e abra http://localhost:8080.

## O que dá para editar no painel

- **Cores e aparência:**
  - as 8 cores do tema e 5 paletas prontas;
  - aviso de contraste (legibilidade);
  - arredondamento dos cantos;
  - cursores em pixel art;
  - padrão de fundo (intensidade e velocidade).
- **Fontes:** fonte do texto e fonte dos títulos. Cada uma pode vir do Google Fonts (pelo nome), de um arquivo enviado (WOFF2, WOFF, TTF ou OTF, com peso e estilo) ou do sistema.
- **Animações:**
  - liga e desliga as animações e regula a velocidade geral;
  - tela de abertura;
  - rolagem suave (suavidade e duração ao clicar no menu);
  - entrada dos elementos ao rolar (duração, intervalo e distância);
  - faixa de palavras;
  - partículas do clique;
  - botões magnéticos;
  - cascata dos carrosséis.
- **Textos:** todos os textos em PT, EN e JA, com busca. Ao clicar num campo EN ou JA, a prévia troca de idioma.
- **Conteúdo:**
  - topo do site (nome, logo, mascote, imagens do topo, banner com ponto de foco);
  - Quem sou eu, incluindo a lista de informações e os currículos em PDF;
  - Trabalhos: criar, ordenar, filtros, capa e imagens;
  - Outros projetos;
  - Ilustrações e montagens;
  - Ferramentas e vídeo;
  - Contato, links e SEO.
- **Mídia e Histórico:**
  - lista do que foi enviado;
  - versões publicadas, com "ver" e "restaurar";
  - backup do conteúdo em `.json`.

Tudo é salvo automaticamente como **rascunho**. O site só muda quando alguém clica em **Publicar**. O painel também tem desfazer e refazer (Ctrl+Z e Ctrl+Shift+Z).

## Estrutura

```
public/                 o que vai para o ar
  index.html            versão estática de reserva (gerada pelo build.mjs; não edite à mão)
  css/style.css         estilos (cores e fontes vêm como variáveis CSS do tema)
  js/main.js            interações; lê window.SITE_CONFIG (animações) e window.I18N (textos)
  shared/render.js      renderizador do site (usado no build, nas Functions e no painel)
  admin/                painel (index.html, app.js, admin.css)
  assets/               logo, mascote, PDFs e imagens WebP (+ meta.json)
  _headers              cabeçalhos do Cloudflare Pages
functions/              Pages Functions: GET /, /media/*, /api/* (login, conteúdo, mídia, publicar, versões)
server/                 código compartilhado das Functions (auth, acesso ao D1, versão dos assets)
content/default.json    conteúdo original (ponto de partida do painel)
schema.sql              tabelas do D1
wrangler.toml           configuração do Cloudflare (D1, R2, pasta public)
build.mjs               gera public/index.html e server/version.js
```

## Mexendo no código

- Depois de editar `public/css` ou `public/js`, rode `node build.mjs`. Ele atualiza o número de versão dos arquivos em `server/version.js`, e os navegadores baixam a versão nova.
- Um campo novo no conteúdo precisa de três mudanças:
  1. adicionar o campo em `content/default.json`;
  2. usar o campo em `public/shared/render.js`;
  3. criar o controle dele em `public/admin/app.js`.

## Acessibilidade e desempenho

- **Movimento:** respeita `prefers-reduced-motion`. O conteúdo continua legível sem JavaScript: os textos em português já vêm no HTML.
- **Carrosséis:** usam scroll-snap nativo, com botões, marcadores e anúncio para leitores de tela.
- **Lightbox e modais:** usam `<dialog>` nativo e fecham com Esc ou clicando fora.
- **Imagens:** WebP com `srcset`, `loading="lazy"` e `fetchpriority` na imagem principal.
- **Página publicada:** é HTML pronto, guardado no D1. Abrir o site custa uma leitura no banco, sem montar a página a cada visita.
