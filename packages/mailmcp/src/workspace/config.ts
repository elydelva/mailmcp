import { mkdir, readFile, writeFile } from "node:fs/promises";
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
  try {
    const text = await readFile(path, "utf8");
    return JSON.parse(text) as WorkspaceConfig;
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export async function writeConfig(config: WorkspaceConfig): Promise<void> {
  const path = configPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(config, null, 2), "utf8");
}

export async function getActiveWorkspace(
  config?: WorkspaceConfig,
): Promise<{ name: string; workspace: Workspace }> {
  const c = config ?? (await readConfig());
  const workspace = c.workspaces[c.activeWorkspace];
  if (!workspace) throw new Error(`Workspace "${c.activeWorkspace}" not found`);
  return { name: c.activeWorkspace, workspace };
}
