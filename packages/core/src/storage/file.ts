/**
 * File-based storage backend using lowdb (JSON file).
 * Suitable for solo/dev use where a full PostgreSQL instance is overkill.
 */

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { JSONFilePreset } from "lowdb/node";
import { encrypt } from "./crypto.js";
import type { CreateAccountInput, EmailAccount, StorageAdapter, User } from "./interface.js";

interface DbSchema {
  users: User[];
  accounts: EmailAccount[];
}

const DEFAULTS: DbSchema = { users: [], accounts: [] };

type Db = Awaited<ReturnType<typeof JSONFilePreset<DbSchema>>>;

export class FileStorageAdapter implements StorageAdapter {
  private readonly dbPath: string;
  private dbPromise: Promise<Db> | null = null;

  constructor(dbPath = "data/db.json") {
    this.dbPath = dbPath;
  }

  private getDb(): Promise<Db> {
    if (!this.dbPromise) {
      mkdirSync(dirname(this.dbPath), { recursive: true });
      this.dbPromise = JSONFilePreset<DbSchema>(this.dbPath, structuredClone(DEFAULTS));
    }
    return this.dbPromise;
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async findOrCreateUser(sub: string): Promise<User> {
    const db = await this.getDb();
    let user = db.data.users.find((u) => u.oauthSub === sub);
    if (!user) {
      user = { id: randomUUID(), oauthSub: sub, createdAt: new Date() };
      db.data.users.push(user);
      await db.write();
    }
    return user;
  }

  // ── Accounts ───────────────────────────────────────────────────────────────

  async listAccounts(userId: string): Promise<EmailAccount[]> {
    const db = await this.getDb();
    return db.data.accounts.filter((a) => a.userId === userId).map(decryptAccount);
  }

  async getAccount(userId: string, accountId: string): Promise<EmailAccount | null> {
    const db = await this.getDb();
    const account = db.data.accounts.find((a) => a.userId === userId && a.id === accountId);
    return account ? decryptAccount(account) : null;
  }

  async createAccount(userId: string, data: CreateAccountInput): Promise<EmailAccount> {
    const db = await this.getDb();

    // First account for this user becomes the default automatically.
    const isFirst = !db.data.accounts.some((a) => a.userId === userId);

    const account: EmailAccount = {
      id: randomUUID(),
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
      passwordEnc: encrypt(data.password),
      isDefault: isFirst,
      createdAt: new Date(),
    };

    db.data.accounts.push(account);
    await db.write();
    return decryptAccount(account);
  }

  async updateAccount(
    userId: string,
    accountId: string,
    data: Partial<CreateAccountInput>,
  ): Promise<EmailAccount> {
    const db = await this.getDb();
    const idx = db.data.accounts.findIndex((a) => a.userId === userId && a.id === accountId);
    if (idx === -1) throw new Error(`Account ${accountId} not found`);

    const existing = db.data.accounts[idx];
    const updated: EmailAccount = {
      ...existing,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.provider !== undefined && { provider: data.provider }),
      ...(data.imapHost !== undefined && { imapHost: data.imapHost }),
      ...(data.imapPort !== undefined && { imapPort: data.imapPort }),
      ...(data.imapSecure !== undefined && { imapSecure: data.imapSecure }),
      ...(data.smtpHost !== undefined && { smtpHost: data.smtpHost }),
      ...(data.smtpPort !== undefined && { smtpPort: data.smtpPort }),
      ...(data.smtpSecure !== undefined && { smtpSecure: data.smtpSecure }),
      ...(data.username !== undefined && { username: data.username }),
      ...(data.password !== undefined && {
        passwordEnc: encrypt(data.password),
      }),
    };
    db.data.accounts[idx] = updated;
    await db.write();
    return decryptAccount(updated);
  }

  async deleteAccount(userId: string, accountId: string): Promise<void> {
    const db = await this.getDb();
    const before = db.data.accounts.length;
    db.data.accounts = db.data.accounts.filter((a) => !(a.userId === userId && a.id === accountId));
    if (db.data.accounts.length === before) {
      throw new Error(`Account ${accountId} not found`);
    }

    // If we deleted the default, promote the oldest remaining account.
    const remaining = db.data.accounts.filter((a) => a.userId === userId);
    if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
      remaining[0].isDefault = true;
    }
    await db.write();
  }

  async setDefaultAccount(userId: string, accountId: string): Promise<void> {
    const db = await this.getDb();
    let found = false;
    for (const account of db.data.accounts) {
      if (account.userId !== userId) continue;
      if (account.id === accountId) {
        account.isDefault = true;
        found = true;
      } else {
        account.isDefault = false;
      }
    }
    if (!found) throw new Error(`Account ${accountId} not found`);
    await db.write();
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function decryptAccount(account: EmailAccount): EmailAccount {
  return { ...account };
}
