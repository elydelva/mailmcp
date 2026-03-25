import type { ProviderConfig, ValidationResult } from "@mailmcp/core";
import { detectProvider, validateConnection } from "@mailmcp/core";
import type { ToolContext } from "./context.js";

// ── Types ────────────────────────────────────────────────────────────────────

export interface SetupAccountParams {
  email: string;
  password?: string;
  name?: string;
}

export type SetupAccountResult =
  | { status: "ok"; account: { id: string; name: string; email: string; provider: string } }
  | { status: "pending"; setupUrl: string };

export type ListAccountsParams = Record<string, never>;

export interface ListAccountsResult {
  accounts: Array<{
    id: string;
    name: string;
    email: string;
    provider: string;
    isDefault: boolean;
  }>;
}

export interface DeleteAccountParams {
  accountId: string;
}

export interface DeleteAccountResult {
  status: "ok";
}

export interface SetDefaultAccountParams {
  accountId: string;
}

export interface SetDefaultAccountResult {
  status: "ok";
  accountId: string;
}

// ── Deps injection (for testing) ─────────────────────────────────────────────

export type AccountDeps = {
  detect?: typeof detectProvider;
  validate?: typeof validateConnection;
};

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function setupAccount(
  ctx: ToolContext,
  params: SetupAccountParams,
  _deps: AccountDeps = {},
): Promise<SetupAccountResult> {
  const detect = _deps.detect ?? detectProvider;
  const validate = _deps.validate ?? validateConnection;

  const detected = await detect(params.email);
  if (!detected) {
    throw new Error("Could not detect provider for this email address");
  }

  const config: ProviderConfig = detected.config;

  if (params.password) {
    const result: ValidationResult = await validate(config, {
      username: params.email,
      password: params.password,
    });

    if (!result.imap.ok && !result.smtp.ok) {
      const imapErr = result.imap.error ?? "unknown";
      const smtpErr = result.smtp.error ?? "unknown";
      throw new Error(`Connection test failed: IMAP: ${imapErr}; SMTP: ${smtpErr}`);
    }

    const account = await ctx.storage.createAccount(ctx.userId, {
      name: params.name ?? config.name,
      email: params.email,
      provider: config.name,
      imapHost: config.imap.host,
      imapPort: config.imap.port,
      imapSecure: config.imap.secure,
      smtpHost: config.smtp.host,
      smtpPort: config.smtp.port,
      smtpSecure: config.smtp.secure,
      username: params.email,
      password: params.password,
    });

    return {
      status: "ok",
      account: {
        id: account.id,
        name: account.name,
        email: account.email,
        provider: account.provider,
      },
    };
  }

  if (ctx.setupBaseUrl) {
    return {
      status: "pending",
      setupUrl: `${ctx.setupBaseUrl}/api/accounts/setup?email=${encodeURIComponent(params.email)}`,
    };
  }

  throw new Error("Password required");
}

export async function listAccounts(
  ctx: ToolContext,
  _params: ListAccountsParams,
): Promise<ListAccountsResult> {
  const accounts = await ctx.storage.listAccounts(ctx.userId);
  return {
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      provider: a.provider,
      isDefault: a.isDefault,
    })),
  };
}

export async function deleteAccount(
  ctx: ToolContext,
  params: DeleteAccountParams,
): Promise<DeleteAccountResult> {
  const account = await ctx.storage.getAccount(ctx.userId, params.accountId);
  if (!account) {
    throw new Error(`Account not found: ${params.accountId}`);
  }
  await ctx.storage.deleteAccount(ctx.userId, params.accountId);
  return { status: "ok" };
}

export async function setDefaultAccount(
  ctx: ToolContext,
  params: SetDefaultAccountParams,
): Promise<SetDefaultAccountResult> {
  const account = await ctx.storage.getAccount(ctx.userId, params.accountId);
  if (!account) {
    throw new Error(`Account not found: ${params.accountId}`);
  }
  await ctx.storage.setDefaultAccount(ctx.userId, params.accountId);
  return { status: "ok", accountId: params.accountId };
}
