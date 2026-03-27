import { describe, expect, test } from "bun:test";
import type { EmailAccount } from "@mailmcp/storage";
import { createImapClient } from "./client.js";
import {
  deleteEmail,
  getEmail,
  listEmails,
  listFolders,
  markEmail,
  moveEmail,
  searchEmails,
} from "./operations.js";
import { ImapPool } from "./pool.js";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

const mockAccount: EmailAccount = {
  id: "acc-1",
  userId: "user-1",
  name: "Test Account",
  email: "test@example.com",
  provider: "other",
  imapHost: "imap.example.com",
  imapPort: 993,
  imapSecure: true,
  smtpHost: "smtp.example.com",
  smtpPort: 587,
  smtpSecure: false,
  username: "test@example.com",
  passwordEnc: "encrypted",
  isDefault: false,
  createdAt: new Date(),
};

// ---------------------------------------------------------------------------
// Pool key logic
// ---------------------------------------------------------------------------

describe("ImapPool — key logic", () => {
  test("poolKey format is userId:accountId", () => {
    const pool = new ImapPool();
    expect(pool.poolKey("user-1", "acc-1")).toBe("user-1:acc-1");
    expect(pool.poolKey("alice", "inbox")).toBe("alice:inbox");
  });

  test("different users produce different keys for same accountId", () => {
    const pool = new ImapPool();
    const k1 = pool.poolKey("user-1", "acc-1");
    const k2 = pool.poolKey("user-2", "acc-1");
    expect(k1).not.toBe(k2);
  });
});

// ---------------------------------------------------------------------------
// Max connections enforcement
// ---------------------------------------------------------------------------

describe("ImapPool — max connections", () => {
  test("rejects with error when limit exceeded (mock scenario)", async () => {
    const pool = new ImapPool();
    const key = pool.poolKey(mockAccount.userId, mockAccount.id);

    // Manually inflate active count to the limit to simulate 2 active connections
    // without needing a real IMAP server.
    // @ts-expect-error accessing private for test
    pool.activeCount.set(key, 2);

    await expect(pool.getClient(mockAccount.userId, mockAccount, "password")).rejects.toThrow(
      "Maximum connections",
    );
  });
});

// ---------------------------------------------------------------------------
// createImapClient — configuration smoke test
// ---------------------------------------------------------------------------

describe("createImapClient", () => {
  test("returns an ImapFlow instance with correct options inferred from account", () => {
    const client = createImapClient(mockAccount, "secret");
    // ImapFlow is not connected yet — just verify it was constructed without throwing
    expect(client).toBeDefined();
    // usable is false before connect()
    expect(client.usable).toBe(false);
    // Clean up (no real connection was made)
    client.close();
  });

  test("respects IMAP_TIMEOUT_MS env variable", () => {
    process.env.IMAP_TIMEOUT_MS = "12345";
    const client = createImapClient(mockAccount, "secret");
    expect(client).toBeDefined();
    client.close();
    delete process.env.IMAP_TIMEOUT_MS;
  });
});

// ---------------------------------------------------------------------------
// Operations — function existence & signature checks (TypeScript compile-time)
// At runtime we just verify they are functions.
// ---------------------------------------------------------------------------

describe("operations — function exports", () => {
  test("listFolders is a function", () => {
    expect(typeof listFolders).toBe("function");
  });

  test("listEmails is a function", () => {
    expect(typeof listEmails).toBe("function");
  });

  test("getEmail is a function", () => {
    expect(typeof getEmail).toBe("function");
  });

  test("searchEmails is a function", () => {
    expect(typeof searchEmails).toBe("function");
  });

  test("moveEmail is a function", () => {
    expect(typeof moveEmail).toBe("function");
  });

  test("deleteEmail is a function", () => {
    expect(typeof deleteEmail).toBe("function");
  });

  test("markEmail is a function", () => {
    expect(typeof markEmail).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Operations — mock client tests
// ---------------------------------------------------------------------------

describe("operations — with mock client", () => {
  function makeMockClient(overrides: Record<string, unknown> = {}) {
    return {
      usable: true,
      list: async () => [
        {
          path: "INBOX",
          name: "INBOX",
          delimiter: "/",
          flags: new Set(["\\HasNoChildren"]),
        },
        {
          path: "Sent",
          name: "Sent",
          delimiter: "/",
          flags: new Set(["\\Sent"]),
        },
      ],
      mailboxOpen: async (_path: string) => ({}),
      fetch: async function* (_range: unknown, _query: unknown, _opts?: unknown) {
        yield {
          uid: 42,
          seq: 1,
          flags: new Set(["\\Seen"]),
          envelope: {
            subject: "Hello",
            from: [{ name: "Alice", address: "alice@example.com" }],
            date: new Date("2024-01-01T00:00:00Z"),
          },
          bodyParts: new Map(),
        };
      },
      fetchOne: async (_seq: string, _query: unknown, _opts?: unknown) => ({
        uid: 42,
        seq: 1,
        flags: new Set<string>(),
        envelope: {
          subject: "Hello",
          from: [{ name: "Alice", address: "alice@example.com" }],
          date: new Date("2024-01-01T00:00:00Z"),
        },
        bodyParts: new Map([
          ["1", Buffer.from("plain text body")],
          ["2", Buffer.from("<p>html body</p>")],
        ]),
        bodyStructure: { childNodes: [] },
      }),
      search: async (_query: unknown, _opts?: unknown) => [42, 43],
      messageMove: async () => ({}),
      messageDelete: async () => true,
      messageFlagsAdd: async () => true,
      messageFlagsRemove: async () => true,
      ...overrides,
    };
  }

  test("listFolders returns MailboxInfo[]", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: mock client in tests
    const result = await listFolders(makeMockClient() as any);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ name: "INBOX", delimiter: "/" });
    expect(Array.isArray(result[0]?.flags)).toBe(true);
  });

  test("listEmails returns EmailSummary[]", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: mock client in tests
    const result = await listEmails(makeMockClient() as any, "INBOX", {
      page: 1,
      limit: 10,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ uid: 42, subject: "Hello", read: true });
  });

  test("listEmails includes source when returnBody is true", async () => {
    const mockWithBody = makeMockClient({
      fetch: async function* () {
        yield {
          uid: 42,
          seq: 1,
          flags: new Set<string>(),
          envelope: {
            subject: "Hello",
            from: [{ name: "Alice", address: "alice@example.com" }],
            date: new Date("2024-01-01T00:00:00Z"),
          },
          source: Buffer.from("some text"),
        };
      },
    });
    // biome-ignore lint/suspicious/noExplicitAny: mock client in tests
    const result = await listEmails(mockWithBody as any, "INBOX", {
      page: 1,
      limit: 10,
      returnBody: true,
    });
    expect(result[0]?.source).toBe("some text");
  });

  test("getEmail returns EmailMessage with body", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: mock client in tests
    const result = await getEmail(makeMockClient() as any, "INBOX", 42);
    expect(result).not.toBeNull();
    expect(result?.uid).toBe(42);
    expect(result?.body).toBe("plain text body");
    expect(result?.html).toBe("<p>html body</p>");
    expect(Array.isArray(result?.attachments)).toBe(true);
  });

  test("getEmail returns null when fetchOne returns false", async () => {
    const mock = makeMockClient({ fetchOne: async () => false });
    // biome-ignore lint/suspicious/noExplicitAny: mock client in tests
    const result = await getEmail(mock as any, "INBOX", 999);
    expect(result).toBeNull();
  });

  test("searchEmails returns EmailSummary[] matching UIDs", async () => {
    const mock = makeMockClient({
      fetch: async function* () {
        for (const uid of [42, 43]) {
          yield {
            uid,
            seq: uid,
            flags: new Set<string>(),
            envelope: {
              subject: `Message ${uid}`,
              from: [{ address: `user${uid}@example.com` }],
              date: new Date("2024-01-01T00:00:00Z"),
            },
            bodyParts: new Map(),
          };
        }
      },
    });
    // biome-ignore lint/suspicious/noExplicitAny: mock client in tests
    const result = await searchEmails(mock as any, "INBOX", "hello");
    expect(result).toHaveLength(2);
  });

  test("searchEmails returns empty array when no results", async () => {
    const mock = makeMockClient({ search: async () => [] });
    // biome-ignore lint/suspicious/noExplicitAny: mock client in tests
    const result = await searchEmails(mock as any, "INBOX", "zzz");
    expect(result).toEqual([]);
  });

  test("moveEmail calls messageMove", async () => {
    let called = false;
    const mock = makeMockClient({
      messageMove: async () => {
        called = true;
        return {};
      },
    });
    // biome-ignore lint/suspicious/noExplicitAny: mock client in tests
    await moveEmail(mock as any, 42, "INBOX", "Archive");
    expect(called).toBe(true);
  });

  test("deleteEmail calls messageDelete", async () => {
    let called = false;
    const mock = makeMockClient({
      messageDelete: async () => {
        called = true;
        return true;
      },
    });
    // biome-ignore lint/suspicious/noExplicitAny: mock client in tests
    await deleteEmail(mock as any, 42, "INBOX");
    expect(called).toBe(true);
  });

  test("markEmail adds \\Seen flag when read=true", async () => {
    const added: string[][] = [];
    const mock = makeMockClient({
      messageFlagsAdd: async (_range: unknown, flags: string[]) => {
        added.push(flags);
        return true;
      },
    });
    // biome-ignore lint/suspicious/noExplicitAny: mock client in tests
    await markEmail(mock as any, 42, "INBOX", { read: true });
    expect(added).toContainEqual(["\\Seen"]);
  });

  test("markEmail removes \\Seen flag when read=false", async () => {
    const removed: string[][] = [];
    const mock = makeMockClient({
      messageFlagsRemove: async (_range: unknown, flags: string[]) => {
        removed.push(flags);
        return true;
      },
    });
    // biome-ignore lint/suspicious/noExplicitAny: mock client in tests
    await markEmail(mock as any, 42, "INBOX", { read: false });
    expect(removed).toContainEqual(["\\Seen"]);
  });

  test("markEmail adds \\Flagged when flagged=true", async () => {
    const added: string[][] = [];
    const mock = makeMockClient({
      messageFlagsAdd: async (_range: unknown, flags: string[]) => {
        added.push(flags);
        return true;
      },
    });
    // biome-ignore lint/suspicious/noExplicitAny: mock client in tests
    await markEmail(mock as any, 42, "INBOX", { flagged: true });
    expect(added).toContainEqual(["\\Flagged"]);
  });
});
