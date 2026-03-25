import { readConfig, writeConfig } from "./config.js";

export async function workspaceList(): Promise<string> {
  const config = await readConfig();
  const lines = Object.entries(config.workspaces).map(([name, ws]) => {
    const marker = name === config.activeWorkspace ? "●" : " ";
    const detail = ws.type === "stdio" ? "stdio" : `server`;
    return `${marker} ${name} (${detail})`;
  });
  return lines.join("\n");
}

export async function workspaceUse(name: string): Promise<string> {
  const config = await readConfig();
  if (!config.workspaces[name]) {
    throw new Error(`Workspace "${name}" not found`);
  }
  config.activeWorkspace = name;
  await writeConfig(config);
  return `Switched to workspace: ${name}`;
}

export async function workspaceAdd(name: string, url: string, token?: string): Promise<string> {
  const config = await readConfig();
  if (config.workspaces[name]) {
    throw new Error(`Workspace "${name}" already exists`);
  }
  config.workspaces[name] = token ? { type: "server", url, token } : { type: "server", url };
  await writeConfig(config);
  return `Added workspace: ${name} -> ${url}`;
}

export async function workspaceRemove(name: string): Promise<string> {
  if (name === "local") {
    throw new Error('Cannot remove the default workspace "local"');
  }
  const config = await readConfig();
  if (!config.workspaces[name]) {
    throw new Error(`Workspace "${name}" not found`);
  }
  delete config.workspaces[name];
  if (config.activeWorkspace === name) {
    config.activeWorkspace = "local";
  }
  await writeConfig(config);
  return `Removed workspace: ${name}`;
}
