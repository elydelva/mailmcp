import { createStorage } from "@mailmcp/storage";
import Fastify from "fastify";
import { accountsRoutes } from "./api/accounts.js";
import { dcrRoutes, introspectMiddleware, loadOAuthConfig, wellKnownRoutes } from "./auth/index.js";
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

  const oauthConfig = loadOAuthConfig();
  server.register(wellKnownRoutes, { config: oauthConfig });
  server.register(dcrRoutes, { config: oauthConfig });
  server.register(introspectMiddleware, { config: oauthConfig });

  server.register(accountsRoutes);
  server.register(mcpRoutes);

  return server;
}
