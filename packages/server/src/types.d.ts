import type { StorageAdapter } from "@mailmcp/storage";

declare module "fastify" {
  interface FastifyInstance {
    storage: StorageAdapter;
  }
}
