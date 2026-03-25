import type { EmailAccount } from "@mailmcp/core";
import type { ImapFlow } from "imapflow";
import { createImapClient } from "./client.js";

const TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CONNECTIONS_PER_ACCOUNT = 2;

interface PoolEntry {
  client: ImapFlow;
  lastUsed: number;
}

/**
 * Simple IMAP connection pool.
 *
 * Key:   `${userId}:${accountId}`
 * TTL:   Idle connections are closed after 5 minutes (checked on each getClient call).
 * Limit: Max 2 simultaneous connections per account — rejects with an error if exceeded.
 */
export class ImapPool {
  private readonly pool = new Map<string, PoolEntry>();
  /** Tracks how many active connections exist per account key. */
  private readonly activeCount = new Map<string, number>();

  poolKey(userId: string, accountId: string): string {
    return `${userId}:${accountId}`;
  }

  private evictStale(): void {
    const now = Date.now();
    for (const [key, entry] of this.pool) {
      if (now - entry.lastUsed > TTL_MS) {
        try {
          entry.client.close();
        } catch {
          // best-effort
        }
        this.pool.delete(key);
        this.activeCount.delete(key);
      }
    }
  }

  /**
   * Returns a connected ImapFlow client, reusing an existing one if possible.
   * Throws if the account already has MAX_CONNECTIONS_PER_ACCOUNT active connections.
   */
  async getClient(userId: string, account: EmailAccount, password: string): Promise<ImapFlow> {
    this.evictStale();

    const key = this.poolKey(userId, account.id);
    const existing = this.pool.get(key);

    if (existing?.client.usable) {
      existing.lastUsed = Date.now();
      return existing.client;
    }

    // Remove stale / unusable entry
    if (existing) {
      try {
        existing.client.close();
      } catch {
        // best-effort
      }
      this.pool.delete(key);
    }

    const count = this.activeCount.get(key) ?? 0;
    if (count >= MAX_CONNECTIONS_PER_ACCOUNT) {
      throw new Error(
        `Maximum connections (${MAX_CONNECTIONS_PER_ACCOUNT}) reached for account ${account.id}`,
      );
    }

    this.activeCount.set(key, count + 1);
    const client = createImapClient(account, password);

    try {
      await client.connect();
    } catch (err) {
      this.activeCount.set(key, (this.activeCount.get(key) ?? 1) - 1);
      throw err;
    }

    this.pool.set(key, { client, lastUsed: Date.now() });
    return client;
  }

  /** Gracefully close all pooled connections. */
  async closeAll(): Promise<void> {
    for (const [key, entry] of this.pool) {
      try {
        await entry.client.logout();
      } catch {
        try {
          entry.client.close();
        } catch {
          // best-effort
        }
      }
      this.pool.delete(key);
    }
    this.activeCount.clear();
  }
}

/** Singleton pool — one per process. */
export const imapPool = new ImapPool();
