import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import type { OAuthConfig } from "./config.js";

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}

const PUBLIC_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/health$/ },
  { method: "GET", pattern: /^\/.well-known\// },
  { method: "POST", pattern: /^\/oauth2\/register$/ },
];

function isPublicRoute(method: string, url: string): boolean {
  return PUBLIC_ROUTES.some((r) => r.method === method && r.pattern.test(url));
}

class UnauthorizedError extends Error {
  constructor() {
    super("unauthorized");
    this.name = "UnauthorizedError";
  }
}

const introspectPlugin: FastifyPluginAsync<{ config: OAuthConfig }> = async (app, opts) => {
  const { config } = opts;

  app.setErrorHandler((error, _req, reply) => {
    if (error instanceof UnauthorizedError) {
      return reply.status(401).send({ error: "unauthorized" });
    }
    return reply.send(error);
  });

  app.addHook("onRequest", async (req) => {
    if (isPublicRoute(req.method, req.url)) {
      return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError();
    }

    const token = authHeader.slice(7);

    try {
      const body = new URLSearchParams({ token });
      const res = await fetch(`${config.hydraAdminUrl}/admin/oauth2/introspect`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      const data = (await res.json()) as { active: boolean; sub?: string };

      if (!data.active) {
        throw new UnauthorizedError();
      }

      req.userId = data.sub;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError();
    }
  });
};

export const introspectMiddleware = fp(introspectPlugin);
