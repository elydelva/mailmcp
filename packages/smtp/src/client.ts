import type { EmailAccount } from "@mailmcp/storage";
import nodemailer from "nodemailer";

/**
 * Creates a nodemailer transporter for the given account.
 * Supports TLS (port 465, secure: true) and STARTTLS (port 587, secure: false)
 * based on the account's smtpSecure flag.
 */
export function createSmtpTransport(
  account: EmailAccount,
  password: string,
): nodemailer.Transporter {
  const connectionTimeout = parseInt(process.env.IMAP_TIMEOUT_MS ?? "30000", 10);

  return nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpSecure,
    auth: {
      user: account.username,
      pass: password,
    },
    connectionTimeout,
  });
}
