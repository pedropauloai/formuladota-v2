# Bot Steam Dota 2 — Phase 5
# Imagem base: node 20 alpine (compatível steam-user + node-dota2)
# Volume /data persiste refresh tokens (200d JWT Steam) entre restarts.

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
# Sem package-lock dentro de bot/ — usa pnpm install standalone (Railway aceita)
RUN apk add --no-cache python3 make g++ && \
    npm install -g pnpm@10 && \
    pnpm install --frozen-lockfile=false
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tini
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Volume persistente pra refresh tokens Steam
VOLUME ["/data"]
ENV STEAM_DATA_DIR=/data

# Healthcheck — bot expõe porta 8080 com endpoint /health
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
