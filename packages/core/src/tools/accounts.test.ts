import { describe, expect, test } from "bun:test";
import type { DetectionResult } from "../providers/detector.js";
import type { ValidationResult } from "../providers/validator.js";
import type {
  CreateAccountInput,
  EmailAccount,
  StorageAdapter,
  User,
} from "../storage/interface.js";
import { deleteAccount, listAccounts, setDefaultAccount, setupAccount } from "./accounts.js";
import type { ToolContext } from "./context.js";

// ── In-memory StorageAdapter ─────────────────────────────────────────────────

function createMemoryStorage(): StorageAdapter {
  const accounts = new Map<string, EmailAccount>();
  let idCounter = 1;

  return {
    async findOrCreateUser(sub: string): Promise<User> {
      return { id: sub, oauthSub: sub, createdAt: new Date() };
    },
    async listAccounts(userId: string): Promise<EmailAccount[]> {
      return [...accounts.values()].filter((a) => a.userId === userId);
    },
    async getAccount(userId: string, accountId: string): Promise<EmailAccount | null> {
      const a = accounts.get(accountId);
      if (!a || a.userId !== userId) return null;
      return a;
    },
    async createAccount(userId: string, data: CreateAccountInput): Promise<EmailAccount> {
      const id = String(idCounter++);
      const allUserAccounts = [...accounts.values()].filter((a) => a.userId === userId);
      const account: EmailAccount = {
        id,
        userId,
        name: data.name,
        email: data.email,
        provider: data.provider,
        imapHost: data.imapHost,
        imapPort: data.imapPort,
        imapSecure: data.imapSecure,
        smtpHost: data.smtpHost,
        smtpPort: data.smtpPort,
        smtpSecure: data.smtpSecure,
        username: data.username,
        passwordEnc: data.password,
        isDefault: allUserAccounts.length === 0,
        createdAt: new Date(),
      };
      accounts.set(id, account);
      return account;
    },
    async updateAccount(
      userId: string,
      accountId: string,
      data: Partial<CreateAccountInput>,
    ): Promise<EmailAccount> {
      const a = accounts.get(accountId);
      if (!a || a.userId !== userId) throw new Error("Not found");
      const updated = { ...a, ...data };
      accounts.set(accountId, updated);
      return updated;
    },
    async deleteAccount(_userId: string, accountId: string): Promise<void> {
      accounts.delete(accountId);
    },
    async setDefaultAccount(userId: string, accountId: string): Promise<void> {
      for (const [id, a] of accounts) {
        if (a.userId === userId) {
          accounts.set(id, { ...a, isDefault: id === accountId });
        }
      }
    },
  };
}

// ── Mock deps ────────────────────────────────────────────────────────────────

const mockDetectGmail = async (_email: string): Promise<DetectionResult> => ({
  source: "known",
  config: {
    name: "Gmail",
    imap: { host: "imap.gmail.com", port: 993, secure: true },
    smtp: { host: "smtp.gmail.com", port: 587, secure: false },
  },
});

const mockDetectNull = async (_email: string): Promise<null> => null;

const mockValidateOk = async (): Promise<ValidationResult> => ({
  imap: { ok: true },
  smtp: { ok: true },
});

const mockValidateBothFail = async (): Promise<ValidationResult> => ({
  imap: { ok: false, error: "auth failed" },
  smtp: { ok: false, error: "auth failed" },
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("setupAccount", () => {
  test("with password succeeds and creates account", async () => {
    const storage = createMemoryStorage();
    const ctx: ToolContext = { userId: "user-1", storage };

    const result = await setupAccount(
      ctx,
      { email: "test@gmail.com", password: "secret", name: "My Gmail" },
      { detect: mockDetectGmail, validate: mockValidateOk },
    );

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.account.email).toBe("test@gmail.com");
      expect(result.account.provider).toBe("Gmail");
      expect(result.account.name).toBe("My Gmail");
      expect(result.account.id).toBeDefined();
    }

    const accounts = await storage.listAccounts("user-1");
    expect(accounts).toHaveLength(1);
  });

  test("without password + setupBaseUrl returns pending", async () => {
    const storage = createMemoryStorage();
    const ctx: ToolContext = {
      userId: "user-1",
      storage,
      setupBaseUrl: "http://localhost:3000",
    };

    const result = await setupAccount(
      ctx,
      { email: "test@gmail.com" },
      { detect: mockDetectGmail },
    );

    expect(result.status).toBe("pending");
    if (result.status === "pending") {
      expect(result.setupUrl).toContain("http://localhost:3000/api/accounts/setup");
      expect(result.setupUrl).toContain("test%40gmail.com");
    }
  });

  test("without password and without setupBaseUrl throws", async () => {
    const storage = createMemoryStorage();
    const ctx: ToolContext = { userId: "user-1", storage };

    await expect(
      setupAccount(ctx, { email: "test@gmail.com" }, { detect: mockDetectGmail }),
    ).rejects.toThrow("Password required");
  });

  test("unknown provider throws", async () => {
    const storage = createMemoryStorage();
    const ctx: ToolContext = { userId: "user-1", storage };

    await expect(
      setupAccount(
        ctx,
        { email: "test@unknown-domain-xyz.invalid", password: "secret" },
        { detect: mockDetectNull },
      ),
    ).rejects.toThrow("Could not detect provider");
  });

  test("both imap and smtp fail → throws", async () => {
    const storage = createMemoryStorage();
    const ctx: ToolContext = { userId: "user-1", storage };

    await expect(
      setupAccount(
        ctx,
        { email: "test@gmail.com", password: "wrong" },
        { detect: mockDetectGmail, validate: mockValidateBothFail },
      ),
    ).rejects.toThrow("Connection test failed");
  });
});

describe("listAccounts", () => {
  test("returns accounts for user", async () => {
    const storage = createMemoryStorage();
    const ctx: ToolContext = { userId: "user-1", storage };

    await setupAccount(
      ctx,
      { email: "test@gmail.com", password: "secret" },
      { detect: mockDetectGmail, validate: mockValidateOk },
    );

    const result = await listAccounts(ctx, {});
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0].email).toBe("test@gmail.com");
    expect(result.accounts[0].isDefault).toBe(true);
  });
});

describe("deleteAccount", () => {
  test("removes account", async () => {
    const storage = createMemoryStorage();
    const ctx: ToolContext = { userId: "user-1", storage };

    const setup = await setupAccount(
      ctx,
      { email: "test@gmail.com", password: "secret" },
      { detect: mockDetectGmail, validate: mockValidateOk },
    );

    if (setup.status !== "ok") throw new Error("Expected ok");
    const result = await deleteAccount(ctx, { accountId: setup.account.id });
    expect(result.status).toBe("ok");

    const list = await listAccounts(ctx, {});
    expect(list.accounts).toHaveLength(0);
  });

  test("with unknown id throws", async () => {
    const storage = createMemoryStorage();
    const ctx: ToolContext = { userId: "user-1", storage };

    await expect(deleteAccount(ctx, { accountId: "nonexistent" })).rejects.toThrow(
      "Account not found",
    );
  });
});

describe("setDefaultAccount", () => {
  test("works", async () => {
    const storage = createMemoryStorage();
    const ctx: ToolContext = { userId: "user-1", storage };

    const setup1 = await setupAccount(
      ctx,
      { email: "a@gmail.com", password: "secret" },
      { detect: mockDetectGmail, validate: mockValidateOk },
    );
    const setup2 = await setupAccount(
      ctx,
      { email: "b@gmail.com", password: "secret" },
      { detect: mockDetectGmail, validate: mockValidateOk },
    );

    if (setup1.status !== "ok" || setup2.status !== "ok") throw new Error("Expected ok");

    const result = await setDefaultAccount(ctx, { accountId: setup2.account.id });
    expect(result.status).toBe("ok");
    expect(result.accountId).toBe(setup2.account.id);

    const list = await listAccounts(ctx, {});
    const defaultAcc = list.accounts.find((a) => a.isDefault);
    expect(defaultAcc?.id).toBe(setup2.account.id);
  });

  test("unknown id throws", async () => {
    const storage = createMemoryStorage();
    const ctx: ToolContext = { userId: "user-1", storage };

    await expect(setDefaultAccount(ctx, { accountId: "bad-id" })).rejects.toThrow(
      "Account not found",
    );
  });
});
