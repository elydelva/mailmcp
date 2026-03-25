FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 mailmcp && \
    adduser --system --uid 1001 mailmcp
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER mailmcp
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
