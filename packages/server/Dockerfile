FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Install dependencies (workspace-aware: copy all package manifests first)
COPY package.json bun.lock bunfig.toml ./
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/storage/package.json ./packages/storage/
COPY packages/providers/package.json ./packages/providers/
COPY packages/imap/package.json ./packages/imap/
COPY packages/parser/package.json ./packages/parser/
COPY packages/smtp/package.json ./packages/smtp/
COPY packages/tools/package.json ./packages/tools/
COPY packages/server/package.json ./packages/server/
COPY packages/mailmcp/package.json ./packages/mailmcp/
RUN bun install --frozen-lockfile

# Copy sources and build
COPY packages/crypto ./packages/crypto
COPY packages/storage ./packages/storage
COPY packages/providers ./packages/providers
COPY packages/imap ./packages/imap
COPY packages/parser ./packages/parser
COPY packages/smtp ./packages/smtp
COPY packages/tools ./packages/tools
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
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["bun", "run", "dist/index.js"]
