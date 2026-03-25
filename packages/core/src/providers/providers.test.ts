import { describe, expect, test } from "bun:test";
import { detectProvider } from "./detector.js";
import { KNOWN_PROVIDERS, lookupKnownProvider } from "./known-providers.js";

// ── known-providers ───────────────────────────────────────────────────────────

describe("lookupKnownProvider", () => {
  test("returns config for known domains", () => {
    const gmail = lookupKnownProvider("gmail.com");
    expect(gmail).toBeDefined();
    expect(gmail?.name).toBe("Gmail");
    expect(gmail?.imap.host).toBe("imap.gmail.com");
    expect(gmail?.imap.port).toBe(993);
    expect(gmail?.smtp.host).toBe("smtp.gmail.com");
  });

  test("is case-insensitive", () => {
    expect(lookupKnownProvider("GMAIL.COM")).toEqual(lookupKnownProvider("gmail.com"));
  });

  test("returns undefined for unknown domain", () => {
    expect(lookupKnownProvider("unknown-domain-xyz.example")).toBeUndefined();
  });

  test("covers all major providers", () => {
    const required = [
      "gmail.com",
      "icloud.com",
      "outlook.com",
      "hotmail.com",
      "yahoo.com",
      "proton.me",
      "fastmail.com",
      "zoho.com",
    ];
    for (const domain of required) {
      expect(lookupKnownProvider(domain)).toBeDefined();
    }
  });

  test("every provider has valid imap and smtp ports", () => {
    for (const [domain, config] of Object.entries(KNOWN_PROVIDERS)) {
      expect(config.imap.port, `${domain} imap.port`).toBeGreaterThan(0);
      expect(config.smtp.port, `${domain} smtp.port`).toBeGreaterThan(0);
    }
  });
});

// ── detectProvider — static path (no network) ────────────────────────────────

describe("detectProvider", () => {
  test("resolves known provider from email address", async () => {
    const result = await detectProvider("user@gmail.com");
    expect(result).not.toBeNull();
    expect(result?.source).toBe("known");
    expect(result?.config.name).toBe("Gmail");
  });

  test("resolves icloud from me.com alias", async () => {
    const result = await detectProvider("user@me.com");
    expect(result?.config.name).toBe("iCloud Mail");
  });

  test("resolves microsoft from hotmail.com", async () => {
    const result = await detectProvider("user@hotmail.com");
    expect(result?.config.imap.host).toBe("outlook.office365.com");
  });

  test("returns null for genuinely unknown domain", async () => {
    // This domain won't have SRV/autoconfig/autodiscover records in CI
    // We test the null path by using a non-routable domain
    const result = await detectProvider("user@this-domain-does-not-exist-xyz-123.invalid");
    expect(result).toBeNull();
  });

  test("returns null for malformed email", async () => {
    expect(await detectProvider("notanemail")).toBeNull();
    expect(await detectProvider("@nodomain")).toBeNull();
  });
});
