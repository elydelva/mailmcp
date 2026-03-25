import { describe, expect, test } from "bun:test";
import type { EmailMessage, EmailSummary, MailboxInfo } from "../imap/operations.js";
import type { ImapPool } from "../imap/pool.js";
import type {
  CreateAccountInput,
  EmailAccount,
  StorageAdapter,
  User,
} from "../storage/interface.js";
import type { ToolContext } from "./context.js";
import {
  batchDelete,
  batchMark,
  batchMove,
  deleteEmail,
  getEmail,
  listEmails,
  listFolders,
  markEmail,
  moveEmail,
  searchEmails,
  sendEmail,
} from "./emails.js";

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

function createAccountInStorage(storage: StorageAdapter, userId: string): Promise<EmailAccount> {
  return storage.createAccount(userId, {
    name: "Test",
    email: "test@example.com",
    provider: "test",
    imapHost: "imap.example.com",
    imapPort: 993,
    imapSecure: true,
    smtpHost: "smtp.example.com",
    smtpPort: 587,
    smtpSecure: false,
    username: "test@example.com",
    // base64 of "password"
    password: Buffer.from("password").toString("base64"),
  });
}

// ── Mock IMAP pool ────────────────────────────────────────────────────────────

function makeEmail(uid: number): EmailSummary {
  return {
    uid,
    subject: `Subject ${uid}`,
    from: "sender@example.com",
    date: new Date("2024-01-01"),
    read: false,
    flagged: false,
  };
}

function makeFullEmail(uid: number): EmailMessage {
  return {
    ...makeEmail(uid),
    body: "body text",
    attachments: [],
  };
}

function createMockPool(
  overrides: {
    listEmails?: EmailSummary[];
    getEmail?: EmailMessage | null;
    listFolders?: MailboxInfo[];
    searchEmails?: EmailSummary[];
    moveEmail?: () => void;
    deleteEmail?: () => void;
    markEmail?: () => void;
  } = {},
): ImapPool & {
  _moves: Array<{ uid: number; from: string; to: string }>;
  _deletes: Array<{ uid: number; mailbox: string }>;
  _marks: Array<{ uid: number; mailbox: string; flags: { read?: boolean; flagged?: boolean } }>;
} {
  const moves: Array<{ uid: number; from: string; to: string }> = [];
  const deletes: Array<{ uid: number; mailbox: string }> = [];
  const marks: Array<{
    uid: number;
    mailbox: string;
    flags: { read?: boolean; flagged?: boolean };
  }> = [];

  const fakeClient = {
    usable: true,
    list: async () =>
      (overrides.listFolders ?? []).map((f) => ({
        path: f.name,
        delimiter: f.delimiter,
        flags: new Set(f.flags),
      })),
    mailboxOpen: async () => {},
    fetch: async function* (range: unknown, _q: unknown) {
      // When range is an array of UIDs (from search), use searchEmails data;
      // otherwise use listEmails data for pagination.
      const emails = Array.isArray(range)
        ? (overrides.searchEmails ?? [])
        : (overrides.listEmails ?? []);
      for (const e of emails) {
        yield {
          uid: e.uid,
          flags: new Set(e.read ? ["\\Seen"] : []),
          envelope: {
            subject: e.subject,
            from: [{ address: e.from }],
            date: e.date,
          },
          bodyParts: new Map(),
        };
      }
    },
    fetchOne: async (_uid: string) => {
      const email = overrides.getEmail ?? null;
      if (!email) return null;
      return {
        uid: email.uid,
        flags: new Set(email.read ? ["\\Seen"] : []),
        envelope: {
          subject: email.subject,
          from: [{ address: email.from }],
          date: email.date,
        },
        bodyParts: new Map([["1", Buffer.from(email.body)]]),
        bodyStructure: { childNodes: [] },
      };
    },
    search: async (_q: unknown) => {
      return (overrides.searchEmails ?? []).map((e) => e.uid);
    },
    messageMove: async (_uid: string, to: string) => {
      moves.push({ uid: Number(_uid), from: "", to });
    },
    messageDelete: async (_uid: string) => {
      deletes.push({ uid: Number(_uid), mailbox: "" });
    },
    messageFlagsAdd: async (_uid: string, flags: string[]) => {
      marks.push({
        uid: Number(_uid),
        mailbox: "",
        flags: { read: flags.includes("\\Seen"), flagged: flags.includes("\\Flagged") },
      });
    },
    messageFlagsRemove: async (_uid: string, flags: string[]) => {
      marks.push({
        uid: Number(_uid),
        mailbox: "",
        flags: { read: !flags.includes("\\Seen"), flagged: !flags.includes("\\Flagged") },
      });
    },
  };

  return {
    poolKey: (userId: string, accountId: string) => `${userId}:${accountId}`,
    getClient: async () => fakeClient as never,
    closeAll: async () => {},
    _moves: moves,
    _deletes: deletes,
    _marks: marks,
  } as unknown as ImapPool & {
    _moves: Array<{ uid: number; from: string; to: string }>;
    _deletes: Array<{ uid: number; mailbox: string }>;
    _marks: Array<{ uid: number; mailbox: string; flags: { read?: boolean; flagged?: boolean } }>;
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("listEmails", () => {
  test("returns paginated results", async () => {
    const storage = createMemoryStorage();
    await createAccountInStorage(storage, "user-1");
    const ctx: ToolContext = { userId: "user-1", storage };

    const mockPool = createMockPool({
      listEmails: [makeEmail(1), makeEmail(2)],
    });

    const result = await listEmails(ctx, { page: 1, limit: 20 }, { pool: mockPool });
    expect(result.emails).toHaveLength(2);
    expect(result.emails[0].uid).toBe(1);
    expect(result.emails[1].uid).toBe(2);
  });
});

describe("getEmail", () => {
  test("returns a message", async () => {
    const storage = createMemoryStorage();
    await createAccountInStorage(storage, "user-1");
    const ctx: ToolContext = { userId: "user-1", storage };

    const mockPool = createMockPool({ getEmail: makeFullEmail(42) });
    const result = await getEmail(ctx, { uid: 42 }, { pool: mockPool });
    expect(result.email).not.toBeNull();
    expect(result.email?.uid).toBe(42);
  });

  test("returns null when message not found", async () => {
    const storage = createMemoryStorage();
    await createAccountInStorage(storage, "user-1");
    const ctx: ToolContext = { userId: "user-1", storage };

    const mockPool = createMockPool({ getEmail: null });
    const result = await getEmail(ctx, { uid: 999 }, { pool: mockPool });
    expect(result.email).toBeNull();
  });
});

describe("listFolders", () => {
  test("returns folders", async () => {
    const storage = createMemoryStorage();
    await createAccountInStorage(storage, "user-1");
    const ctx: ToolContext = { userId: "user-1", storage };

    const mockPool = createMockPool({
      listFolders: [
        { name: "INBOX", delimiter: "/", flags: [] },
        { name: "Sent", delimiter: "/", flags: [] },
      ],
    });

    const result = await listFolders(ctx, {}, { pool: mockPool });
    expect(result.folders).toHaveLength(2);
    expect(result.folders[0].name).toBe("INBOX");
  });
});

describe("searchEmails", () => {
  test("returns matching emails", async () => {
    const storage = createMemoryStorage();
    await createAccountInStorage(storage, "user-1");
    const ctx: ToolContext = { userId: "user-1", storage };

    const mockPool = createMockPool({
      searchEmails: [makeEmail(10), makeEmail(11)],
    });

    const result = await searchEmails(ctx, { query: "hello" }, { pool: mockPool });
    expect(result.emails).toHaveLength(2);
  });

  test("respects limit", async () => {
    const storage = createMemoryStorage();
    await createAccountInStorage(storage, "user-1");
    const ctx: ToolContext = { userId: "user-1", storage };

    const mockPool = createMockPool({
      searchEmails: [makeEmail(1), makeEmail(2), makeEmail(3)],
    });

    const result = await searchEmails(ctx, { query: "hello", limit: 2 }, { pool: mockPool });
    expect(result.emails).toHaveLength(2);
  });
});

describe("sendEmail", () => {
  test("delegates to smtpSend dep and returns its result", async () => {
    const storage = createMemoryStorage();
    await createAccountInStorage(storage, "user-1");
    const ctx: ToolContext = { userId: "user-1", storage };

    let called = false;
    // biome-ignore lint/suspicious/noExplicitAny: mock return value
    const mockSend = async (_input: any) => {
      called = true;
      return { messageId: "<mock-id>" };
    };

    await sendEmail(
      ctx,
      { to: "dest@example.com", subject: "Hi", text: "Hello" },
      { smtpSend: mockSend as never },
    );
    expect(called).toBe(true);
  });
});

describe("moveEmail", () => {
  test("calls the IMAP operation", async () => {
    const storage = createMemoryStorage();
    await createAccountInStorage(storage, "user-1");
    const ctx: ToolContext = { userId: "user-1", storage };

    const mockPool = createMockPool();
    const result = await moveEmail(
      ctx,
      { uid: 5, mailbox: "INBOX", destination: "Archive" },
      { pool: mockPool },
    );
    expect(result.status).toBe("ok");
    expect(mockPool._moves.length).toBeGreaterThan(0);
  });
});

describe("deleteEmail", () => {
  test("calls the IMAP operation", async () => {
    const storage = createMemoryStorage();
    await createAccountInStorage(storage, "user-1");
    const ctx: ToolContext = { userId: "user-1", storage };

    const mockPool = createMockPool();
    const result = await deleteEmail(ctx, { uid: 7, mailbox: "INBOX" }, { pool: mockPool });
    expect(result.status).toBe("ok");
    expect(mockPool._deletes.length).toBeGreaterThan(0);
  });
});

describe("markEmail", () => {
  test("calls the IMAP operation", async () => {
    const storage = createMemoryStorage();
    await createAccountInStorage(storage, "user-1");
    const ctx: ToolContext = { userId: "user-1", storage };

    const mockPool = createMockPool();
    const result = await markEmail(
      ctx,
      { uid: 3, mailbox: "INBOX", read: true },
      { pool: mockPool },
    );
    expect(result.status).toBe("ok");
    expect(mockPool._marks.length).toBeGreaterThan(0);
  });
});

describe("batchMove", () => {
  test("processes all uids", async () => {
    const storage = createMemoryStorage();
    await createAccountInStorage(storage, "user-1");
    const ctx: ToolContext = { userId: "user-1", storage };

    const mockPool = createMockPool();
    const result = await batchMove(
      ctx,
      { uids: [1, 2, 3], mailbox: "INBOX", destination: "Archive" },
      { pool: mockPool },
    );
    expect(result.status).toBe("ok");
    expect(result.moved).toBe(3);
    expect(mockPool._moves).toHaveLength(3);
  });
});

describe("batchDelete", () => {
  test("processes all uids", async () => {
    const storage = createMemoryStorage();
    await createAccountInStorage(storage, "user-1");
    const ctx: ToolContext = { userId: "user-1", storage };

    const mockPool = createMockPool();
    const result = await batchDelete(ctx, { uids: [4, 5], mailbox: "INBOX" }, { pool: mockPool });
    expect(result.status).toBe("ok");
    expect(result.deleted).toBe(2);
    expect(mockPool._deletes).toHaveLength(2);
  });
});

describe("batchMark", () => {
  test("processes all uids", async () => {
    const storage = createMemoryStorage();
    await createAccountInStorage(storage, "user-1");
    const ctx: ToolContext = { userId: "user-1", storage };

    const mockPool = createMockPool();
    const result = await batchMark(
      ctx,
      { uids: [6, 7, 8], mailbox: "INBOX", read: true },
      { pool: mockPool },
    );
    expect(result.status).toBe("ok");
    expect(result.marked).toBe(3);
    expect(mockPool._marks).toHaveLength(3);
  });
});

describe("no account configured", () => {
  test("throws when no account exists", async () => {
    const storage = createMemoryStorage();
    const ctx: ToolContext = { userId: "user-with-no-accounts", storage };

    const mockPool = createMockPool();
    await expect(listEmails(ctx, { page: 1, limit: 10 }, { pool: mockPool })).rejects.toThrow(
      "No account configured",
    );
  });
});
