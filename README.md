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
- `POST /rooms` — cria sala, retorna `{ roomId, hostToken, expiresAt }` (rate limited por IP)
- `WS /rooms/:roomId/ws?hostToken=...` — canal de sync/chat/lifecycle (host manda `hostToken`, guest não)
- `POST /rooms/:roomId/photos` — solicita URL de upload assinada (retorna 503 se `S3_BUCKET` não configurado)
- `POST /rooms/:roomId/photos/:photoId/confirm` — roda moderação e libera a foto para o outro participante

## Status do roadmap

- **Fase 0** ✅ monorepo, TS, Fastify+ws básico, Vite+React básico, Redis via docker-compose
- **Fase 1** ✅ salas sem sync (criar, entrar via link, limite de 2, TTL, reconexão)
- **Fase 2** ✅ motor de sincronização (SyncTick, broadcast, interpolação client-side, Canvas)
- **Fase 3** ✅ chat efêmero (relay via WS, TTL no Redis, limpeza ao encerrar)
- **Fase 4** ✅ fotos efêmeras (URL assinada S3/R2, burn-after-read, moderação com stub plugável) —
  requer credenciais reais de bucket para testar upload de ponta a ponta (ver `apps/server/.env.example`)
- **Fase 5** ✅ segurança (age gate, rate limiting, denunciar/encerrar, Termos de Uso)
- **Fase 6** ⏳ deploy — não iniciado (requer contas Fly.io/Railway/Cloudflare Pages e domínio)

Veja o relatório completo entregue na conversa para decisões tomadas e pontos em aberto.
