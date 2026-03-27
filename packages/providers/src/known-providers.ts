/**
 * Static database of known email providers.
 * Maps domain patterns to IMAP + SMTP configuration.
 *
 * ADR-004 — Provider Detection
 */

export interface ProviderConfig {
  /** Human-readable provider name */
  name: string;
  imap: {
    host: string;
    port: number;
    secure: boolean; // true = TLS, false = STARTTLS
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
  };
  /**
   * Instructions shown to the user during setup.
   * Most providers require an app-specific password instead of the account password.
   */
  setupNote?: string;
}

/** Exact domain → provider config */
export const KNOWN_PROVIDERS: Record<string, ProviderConfig> = {
  // ── Google ──────────────────────────────────────────────────────────────────
  "gmail.com": {
    name: "Gmail",
    imap: { host: "imap.gmail.com", port: 993, secure: true },
    smtp: { host: "smtp.gmail.com", port: 587, secure: false },
    setupNote:
      "Gmail requires an App Password. Enable 2-Step Verification then visit myaccount.google.com/apppasswords.",
  },
  "googlemail.com": {
    name: "Gmail",
    imap: { host: "imap.gmail.com", port: 993, secure: true },
    smtp: { host: "smtp.gmail.com", port: 587, secure: false },
    setupNote:
      "Gmail requires an App Password. Enable 2-Step Verification then visit myaccount.google.com/apppasswords.",
  },

  // ── Apple ───────────────────────────────────────────────────────────────────
  "icloud.com": {
    name: "iCloud Mail",
    imap: { host: "imap.mail.me.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.me.com", port: 587, secure: false },
    setupNote:
      "iCloud requires an App-Specific Password. Generate one at appleid.apple.com under Sign-In and Security.",
  },
  "me.com": {
    name: "iCloud Mail",
    imap: { host: "imap.mail.me.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.me.com", port: 587, secure: false },
    setupNote:
      "iCloud requires an App-Specific Password. Generate one at appleid.apple.com under Sign-In and Security.",
  },
  "mac.com": {
    name: "iCloud Mail",
    imap: { host: "imap.mail.me.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.me.com", port: 587, secure: false },
    setupNote:
      "iCloud requires an App-Specific Password. Generate one at appleid.apple.com under Sign-In and Security.",
  },

  // ── Microsoft ───────────────────────────────────────────────────────────────
  "outlook.com": {
    name: "Outlook.com",
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
  },
  "hotmail.com": {
    name: "Hotmail",
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
  },
  "live.com": {
    name: "Live Mail",
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
  },
  "msn.com": {
    name: "MSN Mail",
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
  },

  // ── Yahoo ───────────────────────────────────────────────────────────────────
  "yahoo.com": {
    name: "Yahoo Mail",
    imap: { host: "imap.mail.yahoo.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.yahoo.com", port: 587, secure: false },
    setupNote: "Yahoo requires an App Password. Visit account.security.yahoo.com to generate one.",
  },
  "yahoo.fr": {
    name: "Yahoo Mail",
    imap: { host: "imap.mail.yahoo.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.yahoo.com", port: 587, secure: false },
    setupNote: "Yahoo requires an App Password. Visit account.security.yahoo.com to generate one.",
  },
  "yahoo.co.uk": {
    name: "Yahoo Mail",
    imap: { host: "imap.mail.yahoo.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.yahoo.com", port: 587, secure: false },
    setupNote: "Yahoo requires an App Password. Visit account.security.yahoo.com to generate one.",
  },
  "ymail.com": {
    name: "Yahoo Mail",
    imap: { host: "imap.mail.yahoo.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.yahoo.com", port: 587, secure: false },
    setupNote: "Yahoo requires an App Password. Visit account.security.yahoo.com to generate one.",
  },

  // ── Proton ──────────────────────────────────────────────────────────────────
  "proton.me": {
    name: "Proton Mail",
    imap: { host: "127.0.0.1", port: 1143, secure: false },
    smtp: { host: "127.0.0.1", port: 1025, secure: false },
    setupNote:
      "Proton Mail requires the Proton Mail Bridge app running locally. Download it at proton.me/mail/bridge.",
  },
  "protonmail.com": {
    name: "Proton Mail",
    imap: { host: "127.0.0.1", port: 1143, secure: false },
    smtp: { host: "127.0.0.1", port: 1025, secure: false },
    setupNote:
      "Proton Mail requires the Proton Mail Bridge app running locally. Download it at proton.me/mail/bridge.",
  },
  "pm.me": {
    name: "Proton Mail",
    imap: { host: "127.0.0.1", port: 1143, secure: false },
    smtp: { host: "127.0.0.1", port: 1025, secure: false },
    setupNote:
      "Proton Mail requires the Proton Mail Bridge app running locally. Download it at proton.me/mail/bridge.",
  },

  // ── Fastmail ─────────────────────────────────────────────────────────────────
  "fastmail.com": {
    name: "Fastmail",
    imap: { host: "imap.fastmail.com", port: 993, secure: true },
    smtp: { host: "smtp.fastmail.com", port: 587, secure: false },
    setupNote: "Fastmail requires an App Password. Generate one in Settings → Privacy & Security.",
  },
  "fastmail.fm": {
    name: "Fastmail",
    imap: { host: "imap.fastmail.com", port: 993, secure: true },
    smtp: { host: "smtp.fastmail.com", port: 587, secure: false },
    setupNote: "Fastmail requires an App Password. Generate one in Settings → Privacy & Security.",
  },

  // ── Zoho ────────────────────────────────────────────────────────────────────
  "zoho.com": {
    name: "Zoho Mail",
    imap: { host: "imap.zoho.com", port: 993, secure: true },
    smtp: { host: "smtp.zoho.com", port: 587, secure: false },
  },
  "zohomail.com": {
    name: "Zoho Mail",
    imap: { host: "imap.zoho.com", port: 993, secure: true },
    smtp: { host: "smtp.zoho.com", port: 587, secure: false },
  },
};

/** Returns the provider config for a given domain, or undefined. */
export function lookupKnownProvider(domain: string): ProviderConfig | undefined {
  return KNOWN_PROVIDERS[domain.toLowerCase()];
}
