import { createStorage, deleteAccount, listAccounts } from "@mailmcp/core";
import { getActiveWorkspace } from "../workspace/config.js";

export async function listAccountsCmd(): Promise<void> {
  const { workspace } = await getActiveWorkspace();

  if (workspace.type === "stdio") {
    process.env.STORAGE_BACKEND = "file";
    process.env.DB_PATH = `${workspace.dataDir}/db.json`;
    const storage = createStorage();
    const ctx = { userId: "local", storage };
    const { accounts } = await listAccounts(ctx, {});
    if (accounts.length === 0) {
      console.log("No accounts configured. Run: mailmcp setup");
      return;
    }
    for (const acc of accounts) {
      const marker = acc.isDefault ? "● " : "  ";
      console.log(`${marker}${acc.email} (${acc.provider}) [${acc.id}]`);
    }
  } else {
    const headers: Record<string, string> = {};
    if (workspace.token) headers.Authorization = `Bearer ${workspace.token}`;
    const res = await fetch(`${workspace.url}/api/accounts`, { headers });
    if (!res.ok) {
      console.error(`Error: ${await res.text()}`);
      process.exit(1);
    }
    const data = (await res.json()) as {
      accounts: Array<{ email: string; provider: string; id: string; isDefault: boolean }>;
    };
    for (const acc of data.accounts) {
      const marker = acc.isDefault ? "● " : "  ";
      console.log(`${marker}${acc.email} (${acc.provider}) [${acc.id}]`);
    }
  }
}

export async function removeAccount(emailOrId: string): Promise<void> {
  const { workspace } = await getActiveWorkspace();

  if (workspace.type === "stdio") {
    process.env.STORAGE_BACKEND = "file";
    process.env.DB_PATH = `${workspace.dataDir}/db.json`;
    const storage = createStorage();
    const ctx = { userId: "local", storage };
    // Find the account by email or id
    const { accounts } = await listAccounts(ctx, {});
    const account = accounts.find((a) => a.email === emailOrId || a.id === emailOrId);
    if (!account) {
      console.error(`Account not found: ${emailOrId}`);
      process.exit(1);
    }
    await deleteAccount(ctx, { accountId: account.id });
    console.log(`Removed account: ${account.email}`);
  } else {
    const headers: Record<string, string> = {};
    if (workspace.token) headers.Authorization = `Bearer ${workspace.token}`;
    const res = await fetch(`${workspace.url}/api/accounts/${encodeURIComponent(emailOrId)}`, {
      method: "DELETE",
      headers,
    });
    if (!res.ok) {
      console.error(`Error: ${await res.text()}`);
      process.exit(1);
    }
    console.log(`Removed account: ${emailOrId}`);
  }
}
