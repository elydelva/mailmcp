import { createStorage, listAccounts } from "@mailmcp/core";
import { getActiveWorkspace } from "../workspace/config.js";

export async function showStatus(): Promise<void> {
  const { name, workspace } = await getActiveWorkspace();

  console.log(`Workspace: ${name} (${workspace.type})`);

  if (workspace.type === "stdio") {
    console.log(`Data dir:  ${workspace.dataDir}`);
    process.env.STORAGE_BACKEND = "file";
    process.env.DB_PATH = `${workspace.dataDir}/db.json`;
    const storage = createStorage();
    const ctx = { userId: "local", storage };
    const { accounts } = await listAccounts(ctx, {});
    console.log(`Accounts:  ${accounts.length}`);
  } else {
    console.log(`URL:       ${workspace.url}`);
    try {
      const headers: Record<string, string> = {};
      if (workspace.token) headers.Authorization = `Bearer ${workspace.token}`;
      const res = await fetch(`${workspace.url}/health`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      const status = res.ok ? "ok" : `error (${res.status})`;
      console.log(`Health:    ${status}`);
    } catch {
      console.log("Health:    unreachable");
    }
  }
}
