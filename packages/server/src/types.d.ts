import type { StorageAdapter } from "@mailmcp/core";

declare module "fastify" {
  interface FastifyInstance {
    storage: StorageAdapter;
  }
}
