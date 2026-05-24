# Bot Discord FORMULADOTA — Phase 5
# Coordena voice channels enquanto alunos jogam ranked Valve.
# Sem dependências Steam/GC — apenas discord.js v14 + express.

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install -g pnpm@10 && \
    pnpm install --frozen-lockfile=false
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tini wget
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Healthcheck — bot expõe porta 8080 com endpoint /health
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
