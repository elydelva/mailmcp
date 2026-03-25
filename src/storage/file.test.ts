import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { FileStorageAdapter } from "./file.js";

// ── Test DB in a temp directory ───────────────────────────────────────────────

let tmpDir: string;
let dbPath: string;
let adapter: FileStorageAdapter;

beforeEach(() => {
  tmpDir = join(tmpdir(), `mailmcp-test-${randomUUID()}`);
  mkdirSync(tmpDir, { recursive: true });
  dbPath = join(tmpDir, "db.json");

  // Provide a fake encryption key (64 hex chars = 32 bytes)
  process.env.ENCRYPTION_KEY = "a".repeat(64);

  adapter = new FileStorageAdapter(dbPath);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.ENCRYPTION_KEY;
});

// ── Users ─────────────────────────────────────────────────────────────────────

describe("findOrCreateUser", () => {
  test("creates a user on first call", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    expect(user.oauthSub).toBe("sub-001");
    expect(user.id).toBeString();
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  test("returns the same user on subsequent calls", async () => {
    const a = await adapter.findOrCreateUser("sub-001");
    const b = await adapter.findOrCreateUser("sub-001");
    expect(a.id).toBe(b.id);
  });

  test("creates distinct users for distinct subs", async () => {
    const a = await adapter.findOrCreateUser("sub-001");
    const b = await adapter.findOrCreateUser("sub-002");
    expect(a.id).not.toBe(b.id);
  });
});

// ── Accounts ──────────────────────────────────────────────────────────────────

const SAMPLE_INPUT = {
  name: "Work",
  email: "alice@example.com",
  provider: "generic",
  imapHost: "imap.example.com",
  imapPort: 993,
  imapSecure: true,
  smtpHost: "smtp.example.com",
  smtpPort: 587,
  smtpSecure: true,
  username: "alice@example.com",
  password: "s3cr3t",
};

describe("createAccount", () => {
  test("stores and returns the account", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    const account = await adapter.createAccount(user.id, SAMPLE_INPUT);

    expect(account.id).toBeString();
    expect(account.email).toBe("alice@example.com");
    expect(account.isDefault).toBe(true); // first account → default
  });

  test("password is NOT stored in plaintext", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    const account = await adapter.createAccount(user.id, SAMPLE_INPUT);
    expect(account.passwordEnc).not.toBe("s3cr3t");
  });

  test("second account is not default", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    await adapter.createAccount(user.id, SAMPLE_INPUT);
    const second = await adapter.createAccount(user.id, {
      ...SAMPLE_INPUT,
      email: "alice2@example.com",
      name: "Personal",
    });
    expect(second.isDefault).toBe(false);
  });
});

describe("listAccounts", () => {
  test("returns accounts only for the given user", async () => {
    const alice = await adapter.findOrCreateUser("sub-alice");
    const bob = await adapter.findOrCreateUser("sub-bob");
    await adapter.createAccount(alice.id, SAMPLE_INPUT);
    await adapter.createAccount(bob.id, { ...SAMPLE_INPUT, email: "bob@example.com" });

    const aliceAccounts = await adapter.listAccounts(alice.id);
    expect(aliceAccounts).toHaveLength(1);
    expect(aliceAccounts[0].email).toBe("alice@example.com");
  });
});

describe("getAccount", () => {
  test("returns null for unknown id", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    const result = await adapter.getAccount(user.id, "nonexistent");
    expect(result).toBeNull();
  });

  test("returns the correct account", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    const created = await adapter.createAccount(user.id, SAMPLE_INPUT);
    const fetched = await adapter.getAccount(user.id, created.id);
    expect(fetched?.id).toBe(created.id);
  });
});

describe("updateAccount", () => {
  test("updates specified fields", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    const account = await adapter.createAccount(user.id, SAMPLE_INPUT);
    const updated = await adapter.updateAccount(user.id, account.id, {
      name: "Updated",
    });
    expect(updated.name).toBe("Updated");
    expect(updated.email).toBe("alice@example.com"); // unchanged
  });

  test("re-encrypts password when updated", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    const account = await adapter.createAccount(user.id, SAMPLE_INPUT);
    const original = account.passwordEnc;
    const updated = await adapter.updateAccount(user.id, account.id, {
      password: "newpassword",
    });
    expect(updated.passwordEnc).not.toBe(original);
  });

  test("throws for unknown account", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    expect(
      adapter.updateAccount(user.id, "nonexistent", { name: "X" }),
    ).rejects.toThrow();
  });
});

describe("deleteAccount", () => {
  test("removes the account", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    const account = await adapter.createAccount(user.id, SAMPLE_INPUT);
    await adapter.deleteAccount(user.id, account.id);
    const remaining = await adapter.listAccounts(user.id);
    expect(remaining).toHaveLength(0);
  });

  test("promotes next account to default after deleting default", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    const first = await adapter.createAccount(user.id, SAMPLE_INPUT);
    await adapter.createAccount(user.id, {
      ...SAMPLE_INPUT,
      email: "alice2@example.com",
      name: "Personal",
    });
    await adapter.deleteAccount(user.id, first.id);
    const remaining = await adapter.listAccounts(user.id);
    expect(remaining[0].isDefault).toBe(true);
  });

  test("throws for unknown account", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    expect(adapter.deleteAccount(user.id, "nonexistent")).rejects.toThrow();
  });
});

describe("setDefaultAccount", () => {
  test("sets exactly one account as default", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    const first = await adapter.createAccount(user.id, SAMPLE_INPUT);
    const second = await adapter.createAccount(user.id, {
      ...SAMPLE_INPUT,
      email: "alice2@example.com",
      name: "Personal",
    });

    await adapter.setDefaultAccount(user.id, second.id);
    const accounts = await adapter.listAccounts(user.id);
    const defaults = accounts.filter((a) => a.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].id).toBe(second.id);
    void first; // used for setup
  });

  test("throws for unknown account", async () => {
    const user = await adapter.findOrCreateUser("sub-001");
    expect(
      adapter.setDefaultAccount(user.id, "nonexistent"),
    ).rejects.toThrow();
  });
});
