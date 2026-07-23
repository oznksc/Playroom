FROM node:22-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile && \
    pnpm build && \
    pnpm --filter create-web-game-template build

FROM node:22-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate && \
    apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*
COPY --from=builder /app /app
COPY scripts/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 4177 5174
ENTRYPOINT ["/entrypoint.sh"]
