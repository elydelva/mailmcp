/**
 * Unit tests for PostgresStorageAdapter.
 *
 * We do NOT spin up a real DB. Instead, we pass a lightweight in-memory mock
 * that mimics the Drizzle fluent API surface used by the adapter.
 *
 * The mock tracks stores for `users` and `email_accounts` and uses the Drizzle
 * table name symbol (`Symbol.for("drizzle:BaseName")`) to dispatch between
 * tables, the same way production code does.
 */

import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import type { CreateAccountInput } from "./interface.js";
import { PostgresStorageAdapter } from "./postgres.js";

// ── In-memory stores ──────────────────────────────────────────────────────────

interface MockUser {
  id: string;
  oauthSub: string;
  createdAt: Date;
}

interface MockAccount {
  id: string;
  userId: string;
  name: string;
  email: string;
  provider: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  username: string;
  passwordEnc: string;
  isDefault: boolean;
  createdAt: Date;
}

// ── Mock DB factory ───────────────────────────────────────────────────────────

function makeDb() {
  const usersStore: MockUser[] = [];
  const accountsStore: MockAccount[] = [];
  let idCounter = 0;
  const nextId = () => `id-${++idCounter}`;

  const TABLE = Symbol.for("drizzle:BaseName");

  type AnyRecord = Record<string, unknown>;

  /** Very small snake_case → camelCase converter for column names. */
  function camel(s: string) {
    return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  }

  /**
   * Resolve a Drizzle SQL condition object against a plain JS row.
   *
   * Drizzle expression chunk structures (observed empirically):
   *   eq(col, val)  → 5 chunks: ["", col, " = ", Param{value}, ""]
   *   and(a, b)     → 3 chunks: ["(", {3-chunk: [a, " and ", b]}, ")"]
   */
  function matches(cond: AnyRecord, row: AnyRecord): boolean {
    const chunks = cond.queryChunks as AnyRecord[] | undefined;
    if (!chunks) return true; // unknown — allow

    if (chunks.length === 5) {
      // eq(col, val): chunks[1] = column ref, chunks[3] = Param
      const col = chunks[1] as AnyRecord;
      const param = chunks[3] as AnyRecord;
      const colName = col.name as string | undefined;
      if (colName !== undefined) {
        const value = param.value;
        return row[colName] === value || row[camel(colName)] === value;
      }
    }

    if (chunks.length === 3) {
      // and(): outer = ["(", inner, ")"], inner = [a, " and ", b]
      const middle = chunks[1] as AnyRecord;
      const innerChunks = middle.queryChunks as AnyRecord[] | undefined;
      if (innerChunks && innerChunks.length === 3) {
        const sep = innerChunks[1] as AnyRecord;
        if ((sep.value as string[] | undefined)?.[0]?.toLowerCase().includes("and")) {
          return (
            matches(innerChunks[0] as AnyRecord, row) && matches(innerChunks[2] as AnyRecord, row)
          );
        }
      }
    }

    return true;
  }

  // Chainable result builder — the `then` property is intentional: it makes the
  // chain thenable so callers can `await` it, matching the Drizzle query API.
  function result<T>(rows: () => T[]) {
    const chain = {
      where: (cond: AnyRecord) => {
        const filtered = () => rows().filter((r) => matches(cond, r as AnyRecord));
        return result(filtered);
      },
      limit: (n: number) => result(() => rows().slice(0, n)),
      returning: (_cols?: unknown) => Promise.resolve(rows()),
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable for mock
      then: <R>(resolve: (v: T[]) => R, reject?: (e: unknown) => R) =>
        Promise.resolve(rows()).then(resolve, reject),
    };
    return chain;
  }

  type Store = MockUser[] | MockAccount[];
  function storeFor(table: Record<symbol, string>): Store {
    return table[TABLE] === "users" ? usersStore : accountsStore;
  }

  const db = {
    // Expose stores for assertions
    _users: usersStore,
    _accounts: accountsStore,

    select: (_cols?: unknown) => ({
      from: (table: Record<symbol, string>) => {
        const store = storeFor(table) as unknown as AnyRecord[];
        return result(() => [...store]);
      },
    }),

    insert: (table: Record<symbol, string>) => ({
      values: (data: AnyRecord) => ({
        returning: () => {
          if (table[TABLE] === "users") {
            const row: MockUser = {
              id: nextId(),
              oauthSub: data.oauthSub as string,
              createdAt: new Date(),
            };
            usersStore.push(row);
            return Promise.resolve([row]);
          }
          const row: MockAccount = {
            id: nextId(),
            userId: data.userId as string,
            name: data.name as string,
            email: data.email as string,
            provider: data.provider as string,
            imapHost: data.imapHost as string,
            imapPort: data.imapPort as number,
            imapSecure: data.imapSecure as boolean,
            smtpHost: data.smtpHost as string,
            smtpPort: data.smtpPort as number,
            smtpSecure: data.smtpSecure as boolean,
            username: data.username as string,
            passwordEnc: data.passwordEnc as string,
            isDefault: (data.isDefault as boolean) ?? false,
            createdAt: new Date(),
          };
          accountsStore.push(row);
          return Promise.resolve([row]);
        },
      }),
    }),

    update: (_table: unknown) => ({
      set: (data: Partial<MockAccount>) => ({
        where: (cond: AnyRecord) => ({
          returning: (_cols?: unknown) => {
            const updated: MockAccount[] = [];
            for (const row of accountsStore) {
              if (matches(cond, row as unknown as AnyRecord)) {
                Object.assign(row, data);
                updated.push(row);
              }
            }
            return Promise.resolve(updated);
          },
          // biome-ignore lint/suspicious/noThenProperty: intentional thenable for mock
          then: <R>(resolve: (v: MockAccount[]) => R, reject?: (e: unknown) => R) => {
            const updated: MockAccount[] = [];
            for (const row of accountsStore) {
              if (matches(cond, row as unknown as AnyRecord)) {
                Object.assign(row, data);
                updated.push(row);
              }
            }
            return Promise.resolve(updated).then(resolve, reject);
          },
        }),
      }),
    }),

    delete: (_table: unknown) => ({
      where: (cond: AnyRecord) => ({
        returning: (_cols?: unknown) => {
          const deleted: { id: string }[] = [];
          for (let i = accountsStore.length - 1; i >= 0; i--) {
            if (matches(cond, accountsStore[i] as unknown as AnyRecord)) {
              deleted.push({ id: accountsStore[i].id });
              accountsStore.splice(i, 1);
            }
          }
          return Promise.resolve(deleted);
        },
      }),
    }),

    transaction: async (fn: (tx: unknown) => Promise<void>) => {
      await fn(db);
    },
  };

  return db;
}

// ── Sample data ───────────────────────────────────────────────────────────────

const sampleAccountData: CreateAccountInput = {
  name: "Work",
  email: "work@example.com",
  provider: "gmail",
  imapHost: "imap.gmail.com",
  imapPort: 993,
  imapSecure: true,
  smtpHost: "smtp.gmail.com",
  smtpPort: 465,
  smtpSecure: true,
  username: "work@example.com",
  password: "secret",
};

// ── Test suite ────────────────────────────────────────────────────────────────

describe("PostgresStorageAdapter", () => {
  let db: ReturnType<typeof makeDb>;
  let adapter: PostgresStorageAdapter;

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = "a".repeat(64);
  });

  beforeEach(() => {
    db = makeDb();
    // biome-ignore lint/suspicious/noExplicitAny: intentional mock injection
    adapter = new PostgresStorageAdapter("", db as any);
  });

  describe("findOrCreateUser", () => {
    test("creates a user if not found", async () => {
      const user = await adapter.findOrCreateUser("sub-123");
      expect(user.oauthSub).toBe("sub-123");
      expect(user.id).toBeTruthy();
      expect(db._users).toHaveLength(1);
    });

    test("returns existing user without creating a duplicate", async () => {
      const first = await adapter.findOrCreateUser("sub-abc");
      const second = await adapter.findOrCreateUser("sub-abc");
      expect(first.id).toBe(second.id);
      expect(db._users).toHaveLength(1);
    });
  });

  describe("createAccount", () => {
    test("stores account with encrypted password", async () => {
      const user = await adapter.findOrCreateUser("sub-1");
      const account = await adapter.createAccount(user.id, sampleAccountData);
      expect(account.passwordEnc).not.toBe("secret");
      expect(account.passwordEnc).not.toBe(Buffer.from("secret").toString("base64"));
      expect(account.passwordEnc.length).toBeGreaterThan(0);
      expect(account.userId).toBe(user.id);
      expect(account.name).toBe("Work");
    });

    test("first account becomes default automatically", async () => {
      const user = await adapter.findOrCreateUser("sub-2");
      const account = await adapter.createAccount(user.id, sampleAccountData);
      expect(account.isDefault).toBe(true);
    });

    test("subsequent accounts are not default", async () => {
      const user = await adapter.findOrCreateUser("sub-3");
      await adapter.createAccount(user.id, sampleAccountData);
      const second = await adapter.createAccount(user.id, {
        ...sampleAccountData,
        name: "Personal",
      });
      expect(second.isDefault).toBe(false);
    });
  });

  describe("listAccounts", () => {
    test("returns only accounts for the given userId", async () => {
      const userA = await adapter.findOrCreateUser("sub-a");
      const userB = await adapter.findOrCreateUser("sub-b");
      await adapter.createAccount(userA.id, sampleAccountData);
      await adapter.createAccount(userA.id, { ...sampleAccountData, name: "A2" });
      await adapter.createAccount(userB.id, sampleAccountData);

      const accountsA = await adapter.listAccounts(userA.id);
      const accountsB = await adapter.listAccounts(userB.id);

      expect(accountsA).toHaveLength(2);
      expect(accountsB).toHaveLength(1);
    });
  });

  describe("deleteAccount", () => {
    test("removes the account", async () => {
      const user = await adapter.findOrCreateUser("sub-del");
      const account = await adapter.createAccount(user.id, sampleAccountData);
      await adapter.deleteAccount(user.id, account.id);
      expect(db._accounts).toHaveLength(0);
    });

    test("throws if account not found", async () => {
      const user = await adapter.findOrCreateUser("sub-del2");
      await expect(adapter.deleteAccount(user.id, "nonexistent")).rejects.toThrow("not found");
    });
  });

  describe("setDefaultAccount", () => {
    test("sets isDefault to true on target and false on others", async () => {
      const user = await adapter.findOrCreateUser("sub-def");
      const first = await adapter.createAccount(user.id, sampleAccountData);
      const second = await adapter.createAccount(user.id, { ...sampleAccountData, name: "Second" });

      await adapter.setDefaultAccount(user.id, second.id);

      const firstRow = db._accounts.find((a) => a.id === first.id);
      const secondRow = db._accounts.find((a) => a.id === second.id);
      expect(firstRow?.isDefault).toBe(false);
      expect(secondRow?.isDefault).toBe(true);
    });

    test("throws if account not found", async () => {
      const user = await adapter.findOrCreateUser("sub-def2");
      await expect(adapter.setDefaultAccount(user.id, "ghost")).rejects.toThrow("not found");
    });
  });
});
