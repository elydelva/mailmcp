import type { FastifyPluginAsync } from "fastify";
import type { OAuthConfig } from "./config.js";

function stripEmptyStrings(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== ""));
}

export const dcrRoutes: FastifyPluginAsync<{ config: OAuthConfig }> = async (app, opts) => {
  const { config } = opts;

  app.post("/oauth2/register", async (req, reply) => {
    try {
      const upstream = await fetch(`${config.hydraAdminUrl}/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });

      const body = (await upstream.json()) as Record<string, unknown>;
      const cleaned = stripEmptyStrings(body);
      return reply.status(upstream.status).send(cleaned);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return reply.status(502).send({ error: "upstream_error", error_description: message });
    }
  });
};
