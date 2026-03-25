/**
 * IMAP + SMTP connection validator.
 *
 * Tests that credentials actually work before persisting an account.
 * Used by the setup wizard (ADR-011) and the setup_account MCP tool (ADR-007).
 *
 * Placed in @mailmcp/tools (ADR-014) to avoid adding imapflow/nodemailer as
 * direct dependencies of @mailmcp/providers.
 */

import type { ProviderConfig } from "@mailmcp/providers";
import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";

export interface ValidationResult {
  imap: { ok: boolean; error?: string };
  smtp: { ok: boolean; error?: string };
}

export interface Credentials {
  username: string;
  password: string;
}

/**
 * Tests IMAP and SMTP connectivity with the given credentials.
 * Both tests run in parallel. Failures are reported per-protocol, not thrown.
 */
export async function validateConnection(
  config: ProviderConfig,
  credentials: Credentials,
): Promise<ValidationResult> {
  const [imap, smtp] = await Promise.all([
    testImap(config, credentials),
    testSmtp(config, credentials),
  ]);
  return { imap, smtp };
}

// ── IMAP ─────────────────────────────────────────────────────────────────────

async function testImap(
  config: ProviderConfig,
  credentials: Credentials,
): Promise<{ ok: boolean; error?: string }> {
  const client = new ImapFlow({
    host: config.imap.host,
    port: config.imap.port,
    secure: config.imap.secure,
    auth: { user: credentials.username, pass: credentials.password },
    logger: false,
    connectionTimeout: Number(process.env.IMAP_TIMEOUT_MS) || 10_000,
  });

  try {
    await client.connect();
    await client.logout();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: normalizeError(err) };
  }
}

// ── SMTP ─────────────────────────────────────────────────────────────────────

async function testSmtp(
  config: ProviderConfig,
  credentials: Credentials,
): Promise<{ ok: boolean; error?: string }> {
  const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: credentials.username, pass: credentials.password },
    connectionTimeout: Number(process.env.IMAP_TIMEOUT_MS) || 10_000,
  });

  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: normalizeError(err) };
  } finally {
    transporter.close();
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeError(err: unknown): string {
  if (err instanceof Error) {
    if ("responseText" in err && typeof err.responseText === "string" && err.responseText) {
      return err.responseText;
    }
    return err.message;
  }
  return String(err);
}
