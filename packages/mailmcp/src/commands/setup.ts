import * as p from "@clack/prompts";
import { createStorage, setupAccount } from "@mailmcp/core";
import { getActiveWorkspace } from "../workspace/config.js";

export async function runSetupWizard(): Promise<void> {
  p.intro("mailmcp — account setup");

  const email = await p.text({
    message: "Email address",
    validate: (v) => (v.includes("@") ? undefined : "Enter a valid email address"),
  });
  if (p.isCancel(email)) {
    p.cancel("Cancelled");
    process.exit(0);
  }

  const password = await p.password({
    message: "App password  (never stored in plain text)",
  });
  if (p.isCancel(password)) {
    p.cancel("Cancelled");
    process.exit(0);
  }

  const spin = p.spinner();
  spin.start("Detecting provider and testing connection...");

  const { workspace } = await getActiveWorkspace();

  if (workspace.type === "stdio") {
    process.env.STORAGE_BACKEND = "file";
    process.env.DB_PATH = `${workspace.dataDir}/db.json`;
    const storage = createStorage();
    const ctx = { userId: "local", storage };
    const result = await setupAccount(ctx, {
      email: email as string,
      password: password as string,
    });
    spin.stop("Done");
    const accountEmail = result.status === "ok" ? result.account.email : (email as string);
    p.outro(`Account ${accountEmail} configured`);
  } else {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (workspace.token) headers.Authorization = `Bearer ${workspace.token}`;
    const res = await fetch(`${workspace.url}/api/accounts/setup`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, password }),
    });
    spin.stop("Done");
    if (!res.ok) {
      p.outro(`Error: ${await res.text()}`);
      process.exit(1);
    }
    p.outro(`Account ${email as string} configured on remote server`);
  }
}
