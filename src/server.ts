import Fastify from "fastify";

export async function buildServer() {
  const server = Fastify({
    logger: {
      transport: process.env.NODE_ENV === "development" ? { target: "pino-pretty" } : undefined,
    },
  });

  server.get("/health", async () => ({ status: "ok", service: "mailmcp" }));

  return server;
}
