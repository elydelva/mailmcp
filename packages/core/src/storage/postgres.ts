import { SQL } from "bun";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { encrypt } from "../password.js";
import type { CreateAccountInput, EmailAccount, StorageAdapter, User } from "./interface.js";
import { emailAccounts, users } from "./schema.js";

type DrizzleDb = ReturnType<typeof drizzle>;

export class PostgresStorageAdapter implements StorageAdapter {
  private readonly db: DrizzleDb;

  constructor(connectionString: string, _db?: DrizzleDb) {
    this.db = _db ?? drizzle(new SQL(connectionString));
  }

  // ── Users ──────────────────────────────────────────────────────────────────

  async findOrCreateUser(sub: string): Promise<User> {
    const existing = await this.db.select().from(users).where(eq(users.oauthSub, sub)).limit(1);

    if (existing.length > 0) {
      return rowToUser(existing[0]);
    }

    const inserted = await this.db.insert(users).values({ oauthSub: sub }).returning();

    return rowToUser(inserted[0]);
  }

  // ── Accounts ───────────────────────────────────────────────────────────────

  async listAccounts(userId: string): Promise<EmailAccount[]> {
    const rows = await this.db.select().from(emailAccounts).where(eq(emailAccounts.userId, userId));

    return rows.map(rowToAccount);
  }

  async getAccount(userId: string, accountId: string): Promise<EmailAccount | null> {
    const rows = await this.db
      .select()
      .from(emailAccounts)
      .where(and(eq(emailAccounts.userId, userId), eq(emailAccounts.id, accountId)))
      .limit(1);

    return rows.length > 0 ? rowToAccount(rows[0]) : null;
  }

  async createAccount(userId: string, data: CreateAccountInput): Promise<EmailAccount> {
    const existing = await this.db
      .select({ id: emailAccounts.id })
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, userId))
      .limit(1);

    const isFirst = existing.length === 0;

    const inserted = await this.db
      .insert(emailAccounts)
      .values({
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
      })
      .returning();

    return rowToAccount(inserted[0]);
  }

  async updateAccount(
    userId: string,
    accountId: string,
    data: Partial<CreateAccountInput>,
  ): Promise<EmailAccount> {
    const updates: Partial<typeof emailAccounts.$inferInsert> = {};

    if (data.name !== undefined) updates.name = data.name;
    if (data.email !== undefined) updates.email = data.email;
    if (data.provider !== undefined) updates.provider = data.provider;
    if (data.imapHost !== undefined) updates.imapHost = data.imapHost;
    if (data.imapPort !== undefined) updates.imapPort = data.imapPort;
    if (data.imapSecure !== undefined) updates.imapSecure = data.imapSecure;
    if (data.smtpHost !== undefined) updates.smtpHost = data.smtpHost;
    if (data.smtpPort !== undefined) updates.smtpPort = data.smtpPort;
    if (data.smtpSecure !== undefined) updates.smtpSecure = data.smtpSecure;
    if (data.username !== undefined) updates.username = data.username;
    if (data.password !== undefined) {
      updates.passwordEnc = encrypt(data.password);
    }

    const updated = await this.db
      .update(emailAccounts)
      .set(updates)
      .where(and(eq(emailAccounts.userId, userId), eq(emailAccounts.id, accountId)))
      .returning();

    if (updated.length === 0) throw new Error(`Account ${accountId} not found`);

    return rowToAccount(updated[0]);
  }

  async deleteAccount(userId: string, accountId: string): Promise<void> {
    const deleted = await this.db
      .delete(emailAccounts)
      .where(and(eq(emailAccounts.userId, userId), eq(emailAccounts.id, accountId)))
      .returning({ id: emailAccounts.id });

    if (deleted.length === 0) throw new Error(`Account ${accountId} not found`);
  }

  async setDefaultAccount(userId: string, accountId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Verify the target account exists
      const target = await tx
        .select({ id: emailAccounts.id })
        .from(emailAccounts)
        .where(and(eq(emailAccounts.userId, userId), eq(emailAccounts.id, accountId)))
        .limit(1);

      if (target.length === 0) throw new Error(`Account ${accountId} not found`);

      // Reset all accounts for user
      await tx
        .update(emailAccounts)
        .set({ isDefault: false })
        .where(eq(emailAccounts.userId, userId))
        .returning({ id: emailAccounts.id });

      // Set the target as default
      await tx
        .update(emailAccounts)
        .set({ isDefault: true })
        .where(and(eq(emailAccounts.userId, userId), eq(emailAccounts.id, accountId)))
        .returning({ id: emailAccounts.id });
    });
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function rowToUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    oauthSub: row.oauthSub,
    createdAt: row.createdAt,
  };
}

function rowToAccount(row: typeof emailAccounts.$inferSelect): EmailAccount {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    email: row.email,
    provider: row.provider,
    imapHost: row.imapHost,
    imapPort: row.imapPort,
    imapSecure: row.imapSecure,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpSecure: row.smtpSecure,
    username: row.username,
    passwordEnc: row.passwordEnc,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
  };
}
