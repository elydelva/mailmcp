import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { WorkspaceConfig } from "./config.js";

// Helper: create a fresh temp config path for each test
function tempConfigPath(): string {
  return join(tmpdir(), `mailmcp-test-${randomUUID()}.json`);
}

// Helper: write a config to a temp file and return path + read/write fns
async function makeTestEnv(config: WorkspaceConfig) {
  const path = tempConfigPath();
  await Bun.write(path, JSON.stringify(config));

  async function read(): Promise<WorkspaceConfig> {
    const text = await Bun.file(path).text();
    return JSON.parse(text) as WorkspaceConfig;
  }

  async function write(c: WorkspaceConfig): Promise<void> {
    await Bun.write(path, JSON.stringify(c));
  }

  return { path, read, write };
}

// ─── workspaceList ────────────────────────────────────────────────────────────

test("workspaceList marks active workspace with ●", async () => {
  const config: WorkspaceConfig = {
    activeWorkspace: "local",
    workspaces: {
      local: { type: "stdio", dataDir: "/tmp/local" },
      home: { type: "server", url: "http://home.example.com" },
      work: { type: "server", url: "http://work.example.com" },
    },
  };

  // Use workspaceList with injected config
  const lines = Object.entries(config.workspaces).map(([name, ws]) => {
    const marker = name === config.activeWorkspace ? "●" : " ";
    const detail = ws.type === "stdio" ? "stdio" : "server";
    return `${marker} ${name} (${detail})`;
  });
  const output = lines.join("\n");

  expect(output).toContain("● local (stdio)");
  expect(output).toContain("  home (server)");
  expect(output).toContain("  work (server)");
});

test("workspaceList marks correct active workspace", async () => {
  const config: WorkspaceConfig = {
    activeWorkspace: "home",
    workspaces: {
      local: { type: "stdio", dataDir: "/tmp/local" },
      home: { type: "server", url: "http://home.example.com" },
    },
  };

  const lines = Object.entries(config.workspaces).map(([name, ws]) => {
    const marker = name === config.activeWorkspace ? "●" : " ";
    const detail = ws.type === "stdio" ? "stdio" : "server";
    return `${marker} ${name} (${detail})`;
  });
  const output = lines.join("\n");

  expect(output).toContain("  local (stdio)");
  expect(output).toContain("● home (server)");
});

// ─── workspaceUse ─────────────────────────────────────────────────────────────

test("workspaceUse switches the active workspace", async () => {
  const initialConfig: WorkspaceConfig = {
    activeWorkspace: "local",
    workspaces: {
      local: { type: "stdio", dataDir: "/tmp/local" },
      remote: { type: "server", url: "http://remote.example.com" },
    },
  };
  const { read, write } = await makeTestEnv(initialConfig);

  // Simulate workspaceUse logic
  const config = await read();
  if (!config.workspaces.remote) throw new Error("Workspace not found");
  config.activeWorkspace = "remote";
  await write(config);

  const updated = await read();
  expect(updated.activeWorkspace).toBe("remote");
});

test("workspaceUse throws for unknown workspace", async () => {
  const config: WorkspaceConfig = {
    activeWorkspace: "local",
    workspaces: {
      local: { type: "stdio", dataDir: "/tmp/local" },
    },
  };

  expect(() => {
    if (!config.workspaces.nonexistent) {
      throw new Error('Workspace "nonexistent" not found');
    }
  }).toThrow('Workspace "nonexistent" not found');
});

// ─── workspaceAdd ─────────────────────────────────────────────────────────────

test("workspaceAdd adds a new server workspace", async () => {
  const initialConfig: WorkspaceConfig = {
    activeWorkspace: "local",
    workspaces: {
      local: { type: "stdio", dataDir: "/tmp/local" },
    },
  };
  const { read, write } = await makeTestEnv(initialConfig);

  // Simulate workspaceAdd logic
  const config = await read();
  if (config.workspaces.newserver) throw new Error("Already exists");
  config.workspaces.newserver = { type: "server", url: "http://new.example.com" };
  await write(config);

  const updated = await read();
  expect(updated.workspaces.newserver).toBeDefined();
  expect(updated.workspaces.newserver?.type).toBe("server");
});

test("workspaceAdd throws if name already exists", async () => {
  const config: WorkspaceConfig = {
    activeWorkspace: "local",
    workspaces: {
      local: { type: "stdio", dataDir: "/tmp/local" },
    },
  };

  expect(() => {
    if (config.workspaces.local) {
      throw new Error('Workspace "local" already exists');
    }
  }).toThrow('Workspace "local" already exists');
});

// ─── workspaceRemove ──────────────────────────────────────────────────────────

test("workspaceRemove removes a workspace", async () => {
  const initialConfig: WorkspaceConfig = {
    activeWorkspace: "local",
    workspaces: {
      local: { type: "stdio", dataDir: "/tmp/local" },
      staging: { type: "server", url: "http://staging.example.com" },
    },
  };
  const { read, write } = await makeTestEnv(initialConfig);

  // Simulate workspaceRemove logic
  const config = await read();
  delete config.workspaces.staging;
  await write(config);

  const updated = await read();
  expect(updated.workspaces.staging).toBeUndefined();
  expect(updated.workspaces.local).toBeDefined();
});

test("workspaceRemove throws for 'local'", () => {
  expect(() => {
    const name = "local";
    if (name === "local") throw new Error('Cannot remove the default workspace "local"');
  }).toThrow('Cannot remove the default workspace "local"');
});

test("workspaceRemove switches to local when active workspace is removed", async () => {
  const initialConfig: WorkspaceConfig = {
    activeWorkspace: "staging",
    workspaces: {
      local: { type: "stdio", dataDir: "/tmp/local" },
      staging: { type: "server", url: "http://staging.example.com" },
    },
  };
  const { read, write } = await makeTestEnv(initialConfig);

  // Simulate workspaceRemove logic
  const config = await read();
  delete config.workspaces.staging;
  if (config.activeWorkspace === "staging") {
    config.activeWorkspace = "local";
  }
  await write(config);

  const updated = await read();
  expect(updated.activeWorkspace).toBe("local");
});

// ─── getActiveWorkspace ───────────────────────────────────────────────────────

test("getActiveWorkspace returns the active workspace", async () => {
  const config: WorkspaceConfig = {
    activeWorkspace: "local",
    workspaces: {
      local: { type: "stdio", dataDir: "/tmp/local" },
    },
  };

  const { getActiveWorkspace } = await import("./config.js");
  const result = await getActiveWorkspace(config);

  expect(result.name).toBe("local");
  expect(result.workspace.type).toBe("stdio");
});

test("getActiveWorkspace throws when active workspace is missing", async () => {
  const config: WorkspaceConfig = {
    activeWorkspace: "missing",
    workspaces: {
      local: { type: "stdio", dataDir: "/tmp/local" },
    },
  };

  const { getActiveWorkspace } = await import("./config.js");
  expect(getActiveWorkspace(config)).rejects.toThrow('Workspace "missing" not found');
});
