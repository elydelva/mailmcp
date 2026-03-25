import Fastify from "fastify";
import { createStorage } from "./storage/index.js";

export async function buildServer() {
  const server = Fastify({
    logger: {
      transport: process.env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
    },
  });

  // Storage adapter — route handlers added in future ADRs will receive this via server decoration.
  server.decorate("storage", createStorage());

  server.get("/health", async () => ({ status: "ok", service: "mailmcp" }));

  return server;
}
