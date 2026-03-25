import { createStorage } from "@mailmcp/core";
import Fastify from "fastify";
import { accountsRoutes } from "./api/accounts.js";
import { mcpRoutes } from "./mcp/transport.js";

export async function buildServer() {
  const server = Fastify({
    logger: {
      transport: process.env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
    },
  });

  // Storage adapter — route handlers added in future ADRs will receive this via server decoration.
  server.decorate("storage", createStorage());

  server.get("/health", async () => ({ status: "ok", service: "mailmcp" }));

  server.register(accountsRoutes);
  server.register(mcpRoutes);

  return server;
}
