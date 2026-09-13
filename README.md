# SyncRoom (nome provisório)

Monorepo com npm workspaces: `apps/web` (React + Vite + TS), `apps/server` (Fastify + ws + TS) e `packages/shared` (tipos TS compartilhados).

## Requisitos

- Node 22+
- Docker (para Redis local)

## Setup

```bash
npm install
docker compose up -d              # sobe o Redis em localhost:6379
cp apps/server/.env.example apps/server/.env   # ajuste se necessário
cp apps/web/.env.example apps/web/.env
```

## Rodando em dev

```bash
npm run dev:server   # Fastify + ws em http://localhost:8787
npm run dev:web      # Vite em http://localhost:5173
```

Abra duas abas em `http://localhost:5173` — crie uma sala em uma e abra o link gerado na outra.

## Endpoints do servidor

- `GET /health`
- `GET /config` — `{ photosEnabled }`, usado pelo cliente pra decidir se mostra a UI de foto
- `POST /rooms` — cria sala, retorna `{ roomId, hostToken, expiresAt }` (rate limited por IP)
- `WS /rooms/:roomId/ws?hostToken=...&participantId=...` — canal de sync/chat/lifecycle/controle (host manda `hostToken`, guest não; `participantId` identifica a aba/sessão de forma estável)
- `POST /rooms/:roomId/photos` — solicita URL de upload assinada (retorna 503 se fotos desativadas via `ENABLE_PHOTOS` ou sem `S3_BUCKET`)
- `POST /rooms/:roomId/photos/:photoId/confirm` — roda moderação e libera a foto para o outro participante

## Status do roadmap

- **Fase 0** ✅ monorepo, TS, Fastify+ws básico, Vite+React básico, Redis via docker-compose
- **Fase 1** ✅ salas sem sync (criar, entrar via link, limite de 2, TTL, reconexão por `participantId` estável)
- **Fase 2** ✅ motor de sincronização com relay de controle e handoff (claim_control/control_input), onda senoidal como estado neutro antes de alguém assumir
- **Fase 3** ✅ chat efêmero (relay via WS, TTL no Redis, limpeza ao encerrar)
- **Fase 4** ✅ fotos efêmeras (URL assinada S3/R2, burn-after-read, moderação com stub plugável, kill switch `ENABLE_PHOTOS`) —
  requer credenciais reais de bucket para testar upload de ponta a ponta (ver `apps/server/.env.example`)
- **Fase 5** ✅ segurança (age gate, rate limiting, denunciar/encerrar, Termos de Uso)
- **Fase 6** ✅ deploy — Railway (backend + Redis) + Vercel (frontend), testado de ponta a ponta em produção. Veja `DEPLOY.md` para URLs e detalhes/pegadinhas encontradas.

Veja o relatório completo entregue na conversa para decisões tomadas e pontos em aberto.
