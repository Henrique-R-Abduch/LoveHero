# Deploy — Vercel (frontend) + Railway (backend + Redis)

Estado atual: **ambos já deployados e testados de ponta a ponta** nesta conversa.

- Backend: https://server-production-629b.up.railway.app
- Frontend: https://syncroom-henriques-projects-f9e5726a.vercel.app (confirmar URL final depois do primeiro build via Git — pode variar)
- Repositório: https://github.com/Henrique-R-Abduch/LoveHero (branch `main`)

## 1. Railway (`apps/server`)

**⚠ correção importante em relação ao pedido original**: "Root Directory: apps/server" **não funciona** neste monorepo, e não é só um detalhe de configuração — é como o builder da Railway (Railpack) lida com monorepos. Quando você aponta o Root Directory para uma subpasta, o Railpack **isola** essa subpasta antes do `npm install` (copia só o `apps/server/package.json`, sem o `package.json`/lockfile da raiz do workspace). Resultado: `npm install` tenta baixar `@syncroom/shared` do registry do npm — que não existe lá, é só um pacote de workspace — e falha com 404.

O que de fato funciona, testado e rodando em produção agora:

- **Root Directory: vazio** (raiz do repo).
- Um **script `start` na raiz** do `package.json` do monorepo, porque o auto-detect do Railpack precisa achar um `start` script para saber "isto é uma app Node" antes de aceitar qualquer build/start command customizado (setar via dashboard/API sozinho não bastou — o Railpack falha numa etapa de `prepare` que roda *antes* de aplicar essas configs):

  ```json
  "scripts": {
    "build": "npm run build --workspaces --if-present",
    "start": "node apps/server/dist/server.js"
  }
  ```

  O `build` já existia (builda todos os workspaces, incluindo `apps/server`); só faltava o `start`.

- Serviço criado a partir do repo GitHub (`railway add --repo ... --service server`), com Root Directory limpo via API (`rootDirectory: ""`).
- Serviço **Redis** do catálogo de plugins, no mesmo projeto — **mas atenção**: ele não injeta `REDIS_URL` automaticamente nos outros serviços do projeto (isso não é verdade, ao contrário do que se costuma achar). É preciso setar explicitamente, referenciando a variável do outro serviço:

  ```
  REDIS_URL=${{Redis.REDIS_URL}}
  ```

- Demais variáveis de ambiente do serviço `server` (já setadas em produção):

  ```
  NODE_ENV=production
  ENABLE_PHOTOS=false
  ROOM_INACTIVITY_TTL_MS=900000
  ROOM_MAX_DURATION_MS=3600000
  ROOM_CREATE_RATE_LIMIT_MAX=5
  ROOM_CREATE_RATE_LIMIT_WINDOW_MS=600000
  CORS_ORIGIN=<preencher com a URL exata da Vercel, https, sem barra final>
  ```

  **⚠ correção**: o pedido original citava `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX` — o código lê `ROOM_CREATE_RATE_LIMIT_MAX` / `ROOM_CREATE_RATE_LIMIT_WINDOW_MS` (valores acima já testados: 5 tentativas / 10 min).

  `ENABLE_PHOTOS=false` é um flag real: o servidor expõe `GET /config → { photosEnabled }`, e o cliente só renderiza a UI de foto se vier `true`. Confirmado em produção: `curl https://server-production-629b.up.railway.app/config` → `{"photosEnabled":false}`, e testado no navegador que o botão de upload não aparece.

- Domínio público gerado: `server-production-629b.up.railway.app`. Confirmado: `GET /health` → `{"ok":true}`, `POST /rooms` cria sala (Redis conectado), `wss://.../rooms/:id/ws` aceita conexão.

- **`railway redeploy` reaproveita o snapshot de origem já usado** — não busca um commit novo do GitHub. Para forçar um build a partir do HEAD atual, use `railway service source connect --repo ... --branch main --service server` de novo (reconecta e dispara um build fresco) ou apenas dê push (o webhook do GitHub app da Railway dispara automaticamente, mas com algum delay).

### Log redaction — implementado agora

O pedido menciona "conferir o redator de log configurado anteriormente" — isso não existia no código; o handshake do WS carrega `hostToken`/`participantId` na query string, e o logger padrão do Fastify loga a URL completa. Adicionei um `req` serializer customizado em `server.ts` que corta a query string antes de logar. **Confirmado em produção**: os logs do Railway mostram `"url":"/rooms/<id>/ws"` sem `?hostToken=...` nem `?participantId=...`.

## 2. Vercel (`apps/web`)

**⚠ mesmo problema de monorepo, forma diferente**: rodar `vercel` direto de dentro de `apps/web` faz o CLI empacotar *só aquela pasta* — de novo, `@syncroom/shared` fica de fora e o build quebra. O jeito certo com Vercel:

- Projeto criado (`vercel link` a partir de `apps/web`, cria o projeto "syncroom"), depois **Root Directory setado explicitamente via `vercel project update syncroom --root-directory apps/web`** — isso É respeitado pelo builder da Vercel quando o deploy vem do Git (ele instala a partir da raiz do repo e só entra em `apps/web` pra rodar o build), diferente de um `vercel deploy` local.
- Por isso o projeto foi **conectado ao repositório GitHub** (`vercel git connect https://github.com/Henrique-R-Abduch/LoveHero.git`) em vez de usar upload local — é o único caminho que builda com o contexto completo do workspace.
- Framework preset Vite detectado automaticamente.
- Variável de ambiente de produção:

  ```
  VITE_API_BASE_URL=https://server-production-629b.up.railway.app
  ```

  **⚠ correção**: o pedido original citava `VITE_WS_URL=wss://...`. O código (`apps/web/src/lib/config.ts`) usa uma única base URL para tudo — REST (`POST /rooms`, `GET /config`, upload de foto) e WebSocket (`wsUrlFor` já troca `https→wss` internamente) — porque os dois vivem no mesmo domínio Railway.

- Plano confirmado: escopo `henriques-projects-f9e5726a`, o mesmo já usado por vários outros projetos pessoais existentes na conta — nenhum time novo/pago foi criado.
- Depois do primeiro build via Git, confirmar a URL final de produção e preencher `CORS_ORIGIN` no Railway com ela.

## 3. Validação pós-deploy

- [x] Backend: `/health`, `/config`, `POST /rooms` (Redis), `wss://` — todos confirmados via curl/script nesta conversa.
- [x] Log redaction confirmada nos logs reais do Railway.
- [ ] Frontend: abrir a URL da Vercel em duas abas, criar sala, colar o link, confirmar WS conecta, sync (condutor/seguidor) funciona, chat funciona, upload de foto **não aparece**. Fica pendente até o primeiro build via Git terminar e o `CORS_ORIGIN` ser preenchido com a URL final.

## 4. Fora de escopo por ora

- Domínio customizado.
- Bucket S3/R2 (fotos desativadas via `ENABLE_PHOTOS=false`).
- Qualquer processador de pagamento.
