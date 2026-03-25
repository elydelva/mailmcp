import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface StdioWorkspace {
  type: "stdio";
  dataDir: string;
}

export interface ServerWorkspace {
  type: "server";
  url: string;
  token?: string;
}

export type Workspace = StdioWorkspace | ServerWorkspace;

export interface WorkspaceConfig {
  activeWorkspace: string;
  workspaces: Record<string, Workspace>;
}

const DEFAULT_CONFIG: WorkspaceConfig = {
  activeWorkspace: "local",
  workspaces: {
    local: {
      type: "stdio",
      dataDir: join(homedir(), ".local", "share", "mailmcp"),
    },
  },
};

export function configPath(): string {
  return join(homedir(), ".config", "mailmcp", "config.json");
}

export async function readConfig(): Promise<WorkspaceConfig> {
  const path = configPath();
  const file = Bun.file(path);
  const exists = await file.exists();
  if (!exists) return structuredClone(DEFAULT_CONFIG);
  try {
    const text = await file.text();
    return JSON.parse(text) as WorkspaceConfig;
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export async function writeConfig(config: WorkspaceConfig): Promise<void> {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  await Bun.write(path, JSON.stringify(config, null, 2));
}

export async function getActiveWorkspace(
  config?: WorkspaceConfig,
): Promise<{ name: string; workspace: Workspace }> {
  const c = config ?? (await readConfig());
  const workspace = c.workspaces[c.activeWorkspace];
  if (!workspace) throw new Error(`Workspace "${c.activeWorkspace}" not found`);
  return { name: c.activeWorkspace, workspace };
}
