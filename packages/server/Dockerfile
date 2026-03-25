FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Install dependencies (workspace-aware: copy all package manifests first)
COPY package.json bun.lock* ./
COPY packages/core/package.json ./packages/core/
COPY packages/server/package.json ./packages/server/
COPY packages/mailmcp/package.json ./packages/mailmcp/
RUN bun install --frozen-lockfile

# Copy sources and build
COPY packages/core ./packages/core
COPY packages/server ./packages/server
RUN bun build packages/server/src/index.ts --outdir dist --target bun

FROM oven/bun:1-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 mailmcp && \
    adduser --system --uid 1001 mailmcp
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER mailmcp
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
