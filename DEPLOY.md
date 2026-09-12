# Deploy — Vercel (frontend) + Railway (backend + Redis)

Passos corrigidos para bater com o código real (nomes de env var, arquitetura de URL única para REST+WS, etc). As diferenças em relação ao pedido original estão marcadas com **⚠ correção**.

## 1. Railway (`apps/server`)

- Novo projeto Railway → conectar o repositório → **Root Directory: `apps/server`**.
  - Isso funciona mesmo sendo um monorepo npm workspaces: o `npm install` do Railway, rodado a partir de `apps/server`, detecta o workspace root e resolve `@syncroom/shared` normalmente. E mesmo assim, o pacote `@syncroom/shared` só exporta *types* — todo `import` dele é `import type`, então o TypeScript apaga essas referências na build; o `dist/server.js` compilado não depende dele em runtime. Testado localmente (`npm run build` + `node dist/server.js` rodando de verdade contra o Redis).
- Adicionar um serviço **Redis** do catálogo de plugins do Railway no mesmo projeto — ele injeta `REDIS_URL` automaticamente, e `apps/server/src/config.ts` já lê exatamente essa variável.
- Variáveis de ambiente do serviço do app:

  ```
  NODE_ENV=production
  CORS_ORIGIN=<preencher depois com a URL da Vercel, https, sem barra final>
  ENABLE_PHOTOS=false
  ROOM_INACTIVITY_TTL_MS=900000
  ROOM_MAX_DURATION_MS=3600000
  ROOM_CREATE_RATE_LIMIT_MAX=5
  ROOM_CREATE_RATE_LIMIT_WINDOW_MS=600000
  ```

  **⚠ correção**: o pedido original citava `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX` — o código não lê essas chaves, é `ROOM_CREATE_RATE_LIMIT_MAX` / `ROOM_CREATE_RATE_LIMIT_WINDOW_MS` (valores acima são os já testados nesta conversa: 5 tentativas / 10 min).

  `ENABLE_PHOTOS=false` agora é um flag real (implementado agora): o servidor expõe `GET /config → { photosEnabled }`, e o cliente só renderiza a UI de foto se vier `true`. Testado no navegador — com `ENABLE_PHOTOS=false` o botão "Escolher arquivo" simplesmente não aparece.

- Gerar domínio público do serviço (`algo.up.railway.app`), confirmar `GET /health` → `{"ok":true}` e que o WS aceita `wss://` em `/rooms/:roomId/ws`.

### Log redaction — implementado agora

O pedido menciona "conferir o redator de log configurado anteriormente" — isso não existia no código; o handshake do WS carrega `hostToken`/`participantId` na query string, e o logger padrão do Fastify (`logger: true`) loga a URL completa, inclusive query string, em toda requisição. Adicionei um `req` serializer customizado em `server.ts` que corta a query string antes de logar (`request.url.split("?")[0]`), então nenhum token aparece em log daqui pra frente. Vale conferir isso nos logs do Railway depois do primeiro deploy.

## 2. Vercel (`apps/web`)

- Import do repositório → Root Directory `apps/web` → framework preset Vite (detectado automaticamente).
- Variável de ambiente de build:

  ```
  VITE_API_BASE_URL=https://<domínio gerado pelo Railway>
  ```

  **⚠ correção**: o pedido original citava `VITE_WS_URL=wss://...`. O código (`apps/web/src/lib/config.ts`) usa uma única base URL para tudo — REST (`POST /rooms`, `GET /config`, upload de foto) e WebSocket (`wsUrlFor` já troca `https→wss` internamente) — porque os dois vivem no mesmo domínio Railway. Uma variável `VITE_WS_URL` separada exigiria mudar o código pra ter duas bases distintas, o que não é necessário aqui; usar `VITE_API_BASE_URL` com `https://` é mais simples e é o que o código já lê.

- Confirmar plano Hobby antes de criar o projeto (não criar time pago à toa).
- Depois do primeiro deploy, pegar a URL da Vercel e voltar no Railway pra preencher `CORS_ORIGIN` com essa URL exata.

## 3. Validação pós-deploy

- Abrir a URL da Vercel em duas abas/dispositivos.
- Criar sala numa aba, colar o link na outra.
- Confirmar: WS conecta, sync (condutor/seguidor com handoff) funciona, chat funciona, **upload de foto não aparece na UI**.
- Conferir nos logs do Railway que a URL logada em cada requisição não traz `?hostToken=...` nem `?participantId=...`.

## 4. Fora de escopo por ora

- Domínio customizado.
- Bucket S3/R2 (fotos desativadas via `ENABLE_PHOTOS=false`).
- Qualquer processador de pagamento.
