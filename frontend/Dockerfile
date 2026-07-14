# Frontend Next.js 16 (D.aise) — servido em http://0.0.0.0:3000
# Next 16 / React 19 exigem Node 20+. Usamos a base Debian (glibc) para
# compatibilidade com os binários nativos (SWC) que o Next baixa.

# ---- Stage 1: build ----
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Variáveis NEXT_PUBLIC_* são embutidas em build time. Como o fetch da API
# roda no NAVEGADOR (host), a URL precisa ser alcançável a partir do host —
# por isso o default é localhost:8765, e não o nome do serviço no compose.
ARG NEXT_PUBLIC_API_URL=http://localhost:8765
ARG NEXT_PUBLIC_APP_MODE=docker
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_APP_MODE=$NEXT_PUBLIC_APP_MODE \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: runtime ----
FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Copiamos a app construída + deps (sem alterar next.config para "standalone",
# já que esta é uma versão não-padrão do Next).
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["npm", "run", "start"]
