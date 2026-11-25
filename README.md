# supertidesign

Site-portfólio de **Guilherme Eccel Superti**: designer, ilustrador, artista 3D e editor de vídeo.

Página única e estática (HTML, CSS e JS, sem framework), em três idiomas (PT, EN e JA). As animações usam [anime.js 4](https://animejs.com) e a rolagem suave usa [Lenis](https://github.com/darkroomengineering/lenis).

## Ver localmente

Abra o `index.html` no navegador. Se preferir um servidor local:

```bash
node serve.mjs        # http://localhost:8080
```

## Publicar

A raiz do repositório já é o site pronto. No **GitHub Pages**, vá em *Settings → Pages → Deploy from a branch*, escolha a branch `main` e a pasta `/ (root)`. Também dá para arrastar a pasta para a Netlify ou a Vercel.

## Estrutura

```
index.html        página gerada pelo build.mjs (não edite à mão)
css/style.css     estilos
js/main.js        interações (anime.js + Lenis)
js/i18n.js        textos em PT / EN / JA
assets/brand/     logo, mascote e currículos em PDF
assets/img/       imagens em WebP (versões -sm de 800px e normais de até 1800px) + meta.json
build.mjs         gera o index.html a partir da lista de projetos e imagens
serve.mjs         servidor estático para testes
```

## Editar conteúdo

- **Textos:** edite `js/i18n.js`. Cada chave tem as versões `pt`, `en` e `ja`.
- **Projetos, imagens e ferramentas:** edite o objeto `DATA` no início de `build.mjs` e rode:

  ```bash
  node build.mjs
  ```

  Cada imagem é referenciada pelo caminho original (por exemplo, `trabalhos/trabalhos_11.png`). O build busca no `assets/img/meta.json` a versão WebP e as dimensões.

## Acessibilidade e desempenho

- **Movimento:** respeita `prefers-reduced-motion`. O conteúdo continua legível sem JavaScript.
- **Carrosséis:** usam scroll-snap nativo, com botões, marcadores e anúncio para leitores de tela.
- **Lightbox e modais:** usam `<dialog>` nativo e fecham com Esc ou clicando fora.
- **Imagens:** WebP com `srcset`, `loading="lazy"` e `fetchpriority` na imagem principal.
