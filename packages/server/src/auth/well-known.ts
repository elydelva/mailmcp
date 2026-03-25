import type { FastifyPluginAsync } from "fastify";
import type { OAuthConfig } from "./config.js";

export const wellKnownRoutes: FastifyPluginAsync<{ config: OAuthConfig }> = async (app, opts) => {
  const { config } = opts;

  app.get("/.well-known/oauth-protected-resource", async (_req, reply) => {
    return reply.send({
      resource: config.serverBaseUrl,
      authorization_servers: [config.hydraPublicUrl],
      bearer_methods_supported: ["header"],
      scopes_supported: ["openid", "email", "offline_access"],
    });
  });

  app.get("/.well-known/openid-configuration", async (_req, reply) => {
    try {
      const upstream = await fetch(`${config.hydraPublicUrl}/.well-known/openid-configuration`);
      const body = await upstream.json();
      return reply.status(upstream.status).send(body);
    } catch {
      return reply
        .status(502)
        .send({ error: "upstream_error", error_description: "Failed to reach Hydra" });
    }
  });
};
