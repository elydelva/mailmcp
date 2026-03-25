import { setupAccount } from "@mailmcp/core";
import type { FastifyPluginAsync } from "fastify";

interface SetupBody {
  email: string;
  password: string;
  name?: string;
}

export const accountsRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: SetupBody }>("/api/accounts/setup", async (req, reply) => {
    const { email, password, name } = req.body;
    const result = await setupAccount(
      { userId: "local", storage: app.storage },
      { email, password, name },
    );
    return reply.send(result);
  });
};
