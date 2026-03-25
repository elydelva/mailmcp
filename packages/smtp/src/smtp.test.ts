import { expect, mock, test } from "bun:test";
import type { EmailAccount } from "@mailmcp/core";

// ---------------------------------------------------------------------------
// Minimal EmailAccount fixture
// ---------------------------------------------------------------------------
const baseAccount: EmailAccount = {
  id: "acc-1",
  userId: "user-1",
  name: "Alice",
  email: "alice@example.com",
  provider: "generic",
  imapHost: "imap.example.com",
  imapPort: 993,
  imapSecure: true,
  smtpHost: "smtp.example.com",
  smtpPort: 465,
  smtpSecure: true,
  username: "alice",
  passwordEnc: "enc",
  isDefault: true,
  createdAt: new Date("2024-01-01"),
};

// ---------------------------------------------------------------------------
// createSmtpTransport
// ---------------------------------------------------------------------------

/** Extract internal nodemailer transport options without using `any`. */
function getTransportOptions(transporter: object): Record<string, unknown> {
  const t = transporter as Record<string, unknown>;
  const inner = t.transporter as Record<string, unknown> | undefined;
  return (inner?.options ?? t.options) as Record<string, unknown>;
}

test("createSmtpTransport — TLS account sets correct transporter options", async () => {
  const { createSmtpTransport } = await import("./client.js");

  const transporter = createSmtpTransport(baseAccount, "s3cr3t");
  const opts = getTransportOptions(transporter);
  const auth = opts.auth as Record<string, unknown>;

  expect(opts.host).toBe("smtp.example.com");
  expect(opts.port).toBe(465);
  expect(opts.secure).toBe(true);
  expect(auth.user).toBe("alice");
  expect(auth.pass).toBe("s3cr3t");
});

test("createSmtpTransport — STARTTLS account sets secure:false", async () => {
  const { createSmtpTransport } = await import("./client.js");

  const starttlsAccount: EmailAccount = {
    ...baseAccount,
    smtpPort: 587,
    smtpSecure: false,
  };

  const transporter = createSmtpTransport(starttlsAccount, "pass");
  const opts = getTransportOptions(transporter);

  expect(opts.port).toBe(587);
  expect(opts.secure).toBe(false);
});

test("createSmtpTransport — uses IMAP_TIMEOUT_MS env var", async () => {
  process.env.IMAP_TIMEOUT_MS = "10000";

  const { createSmtpTransport } = await import("./client.js");
  const transporter = createSmtpTransport(baseAccount, "pass");
  const opts = getTransportOptions(transporter);

  expect(opts.connectionTimeout).toBe(10000);

  delete process.env.IMAP_TIMEOUT_MS;
});

// ---------------------------------------------------------------------------
// quoteText
// ---------------------------------------------------------------------------
test("quoteText — prefixes every line with '> '", async () => {
  const { quoteText } = await import("./operations.js");

  const result = quoteText("Hello\nWorld\nFoo");
  expect(result).toBe("> Hello\n> World\n> Foo");
});

test("quoteText — single line", async () => {
  const { quoteText } = await import("./operations.js");

  expect(quoteText("Only line")).toBe("> Only line");
});

test("quoteText — empty string", async () => {
  const { quoteText } = await import("./operations.js");

  expect(quoteText("")).toBe("> ");
});

// ---------------------------------------------------------------------------
// replyEmail — header construction (mock sendMail)
// ---------------------------------------------------------------------------
test("replyEmail — sets In-Reply-To and References headers", async () => {
  const capturedOptions: Record<string, unknown>[] = [];

  // Mock nodemailer before importing operations
  mock.module("nodemailer", () => ({
    default: {
      createTransport: () => ({
        sendMail: async (opts: Record<string, unknown>) => {
          capturedOptions.push(opts);
          return { messageId: "<reply-123@example.com>" };
        },
      }),
    },
  }));

  const { replyEmail } = await import("./operations.js");

  const result = await replyEmail({
    account: baseAccount,
    password: "pass",
    originalMessageId: "<orig-001@example.com>",
    originalReferences: "<root-000@example.com>",
    to: "bob@example.com",
    subject: "Re: Hello",
    text: "My reply",
  });

  expect(result.messageId).toBe("<reply-123@example.com>");

  const sent = capturedOptions[0];
  const headers = sent.headers as Record<string, string>;
  expect(headers["In-Reply-To"]).toBe("<orig-001@example.com>");
  expect(headers.References).toBe("<root-000@example.com> <orig-001@example.com>");
});

test("replyEmail — References equals originalMessageId when no prior chain", async () => {
  const capturedOptions: Record<string, unknown>[] = [];

  mock.module("nodemailer", () => ({
    default: {
      createTransport: () => ({
        sendMail: async (opts: Record<string, unknown>) => {
          capturedOptions.push(opts);
          return { messageId: "<reply-456@example.com>" };
        },
      }),
    },
  }));

  const { replyEmail } = await import("./operations.js");

  await replyEmail({
    account: baseAccount,
    password: "pass",
    originalMessageId: "<orig-002@example.com>",
    to: "bob@example.com",
    subject: "Re: World",
    text: "Reply without prior chain",
  });

  const sent = capturedOptions[0];
  const headers = sent.headers as Record<string, string>;
  expect(headers.References).toBe("<orig-002@example.com>");
});

// ---------------------------------------------------------------------------
// forwardEmail — body quoting
// ---------------------------------------------------------------------------
test("forwardEmail — quotes originalText below preamble", async () => {
  const capturedOptions: Record<string, unknown>[] = [];

  mock.module("nodemailer", () => ({
    default: {
      createTransport: () => ({
        sendMail: async (opts: Record<string, unknown>) => {
          capturedOptions.push(opts);
          return { messageId: "<fwd-001@example.com>" };
        },
      }),
    },
  }));

  const { forwardEmail } = await import("./operations.js");

  await forwardEmail({
    account: baseAccount,
    password: "pass",
    to: "charlie@example.com",
    subject: "Fwd: Hello",
    originalText: "Line one\nLine two",
    text: "See below:",
  });

  const sent = capturedOptions[0];
  expect(sent.text).toBe("See below:\n\n> Line one\n> Line two");
});

test("forwardEmail — no preamble uses only quoted text", async () => {
  const capturedOptions: Record<string, unknown>[] = [];

  mock.module("nodemailer", () => ({
    default: {
      createTransport: () => ({
        sendMail: async (opts: Record<string, unknown>) => {
          capturedOptions.push(opts);
          return { messageId: "<fwd-002@example.com>" };
        },
      }),
    },
  }));

  const { forwardEmail } = await import("./operations.js");

  await forwardEmail({
    account: baseAccount,
    password: "pass",
    to: "charlie@example.com",
    subject: "Fwd: Hello",
    originalText: "Only original",
  });

  const sent = capturedOptions[0];
  expect(sent.text).toBe("> Only original");
});

// ---------------------------------------------------------------------------
// from address formatting
// ---------------------------------------------------------------------------
test("sendEmail — from address includes display name when account.name is set", async () => {
  const capturedOptions: Record<string, unknown>[] = [];

  mock.module("nodemailer", () => ({
    default: {
      createTransport: () => ({
        sendMail: async (opts: Record<string, unknown>) => {
          capturedOptions.push(opts);
          return { messageId: "<send-001@example.com>" };
        },
      }),
    },
  }));

  const { sendEmail } = await import("./operations.js");

  await sendEmail({
    account: baseAccount, // name: "Alice"
    password: "pass",
    to: "bob@example.com",
    subject: "Hi",
    text: "Hello",
  });

  expect(capturedOptions[0].from).toBe("Alice <alice@example.com>");
});
