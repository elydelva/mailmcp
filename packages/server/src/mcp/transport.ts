import type { ToolContext } from "@mailmcp/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyPluginAsync } from "fastify";
import { registerAccountTools } from "./tools.js";

export const mcpRoutes: FastifyPluginAsync = async (app) => {
  const ctx: ToolContext = {
    userId: "local",
    storage: app.storage,
    setupBaseUrl: process.env.SERVER_BASE_URL ?? "http://localhost:3000",
  };

  const mcpServer = new McpServer({ name: "mailmcp", version: "0.1.0" });
  registerAccountTools(mcpServer, ctx);

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await mcpServer.connect(transport);

  app.post("/mcp", async (req, reply) => {
    await transport.handleRequest(req.raw, reply.raw, req.body);
  });
  app.get("/mcp", async (req, reply) => {
    await transport.handleRequest(req.raw, reply.raw);
  });
  app.delete("/mcp", async (req, reply) => {
    await transport.handleRequest(req.raw, reply.raw);
  });
};
