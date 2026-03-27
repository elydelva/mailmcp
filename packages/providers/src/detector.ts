/**
 * Email provider detection pipeline.
 *
 * Resolution order (first match wins):
 *   1. Known-provider static database  (instant, no network)
 *   2. DNS SRV records (_imap._tcp, _imaps._tcp, _submission._tcp)
 *   3. Mozilla Autoconfig  (https://autoconfig.<domain>/mail/config-v1.1.xml)
 *   4. Microsoft Autodiscover  (https://autodiscover.<domain>/autodiscover/autodiscover.xml)
 *
 * ADR-004 — Provider Detection
 */

import { resolveSrv as dnsResolveSrv } from "node:dns/promises";
import type { ProviderConfig } from "./known-providers.js";
import { lookupKnownProvider } from "./known-providers.js";

export type DetectionSource = "known" | "dns-srv" | "autoconfig" | "autodiscover";

export interface DetectionResult {
  config: ProviderConfig;
  source: DetectionSource;
}

/**
 * Detects IMAP/SMTP configuration for a given email address.
 * Returns null if no configuration could be found via any method.
 */
export async function detectProvider(email: string): Promise<DetectionResult | null> {
  const domain = extractDomain(email);
  if (!domain) return null;

  // 1. Static database
  const known = lookupKnownProvider(domain);
  if (known) return { config: known, source: "known" };

  // 2. DNS SRV
  const dns = await detectViaDns(domain);
  if (dns) return dns;

  // 3. Mozilla Autoconfig
  const autoconfig = await detectViaMozillaAutoconfig(domain, email);
  if (autoconfig) return autoconfig;

  // 4. Microsoft Autodiscover
  const autodiscover = await detectViaAutodiscover(domain, email);
  if (autodiscover) return autodiscover;

  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

// ── DNS SRV ──────────────────────────────────────────────────────────────────

interface SrvRecord {
  name: string;
  port: number;
}

async function resolveSrv(hostname: string): Promise<SrvRecord[]> {
  try {
    const records = await dnsResolveSrv(hostname);
    return records.map((r) => ({ name: r.name, port: r.port }));
  } catch {
    return [];
  }
}

async function detectViaDns(domain: string): Promise<DetectionResult | null> {
  const [imapsTls, imapStarttls, submission] = await Promise.all([
    resolveSrv(`_imaps._tcp.${domain}`),
    resolveSrv(`_imap._tcp.${domain}`),
    resolveSrv(`_submission._tcp.${domain}`),
  ]);

  const imapRecord = imapsTls[0] ?? imapStarttls[0];
  const smtpRecord = submission[0];

  if (!imapRecord || !smtpRecord) return null;

  const imapSecure = imapsTls.length > 0;

  return {
    source: "dns-srv",
    config: {
      name: domain,
      imap: { host: imapRecord.name, port: imapRecord.port, secure: imapSecure },
      smtp: { host: smtpRecord.name, port: smtpRecord.port, secure: smtpRecord.port === 465 },
    },
  };
}

// ── Mozilla Autoconfig ────────────────────────────────────────────────────────

async function detectViaMozillaAutoconfig(
  domain: string,
  email: string,
): Promise<DetectionResult | null> {
  const urls = [
    `https://autoconfig.${domain}/mail/config-v1.1.xml?emailaddress=${encodeURIComponent(email)}`,
    `https://autoconfig.thunderbird.net/v1.1/${domain}`,
  ];

  for (const url of urls) {
    const config = await fetchAndParseMozillaXml(url);
    if (config) return { config, source: "autoconfig" };
  }
  return null;
}

async function fetchAndParseMozillaXml(url: string): Promise<ProviderConfig | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const xml = await res.text();
    return parseMozillaXml(xml);
  } catch {
    return null;
  }
}

function parseMozillaXml(xml: string): ProviderConfig | null {
  // Parse incomingServer type="imap"
  const imapMatch = xml.match(/<incomingServer\s+type="imap"[^>]*>([\s\S]*?)<\/incomingServer>/i);
  const smtpMatch = xml.match(/<outgoingServer\s+type="smtp"[^>]*>([\s\S]*?)<\/outgoingServer>/i);
  const nameMatch = xml.match(/<displayName>(.*?)<\/displayName>/i);

  if (!imapMatch || !smtpMatch) return null;

  const imap = parseServerBlock(imapMatch[1]);
  const smtp = parseServerBlock(smtpMatch[1]);
  if (!imap || !smtp) return null;

  return {
    name: nameMatch?.[1]?.trim() ?? "Unknown",
    imap,
    smtp,
  };
}

function parseServerBlock(block: string): { host: string; port: number; secure: boolean } | null {
  const host = block.match(/<hostname>(.*?)<\/hostname>/i)?.[1]?.trim();
  const port = Number(block.match(/<port>(.*?)<\/port>/i)?.[1]);
  const socketType = block
    .match(/<socketType>(.*?)<\/socketType>/i)?.[1]
    ?.trim()
    .toUpperCase();

  if (!host || !port) return null;

  // SSL/TLS = direct TLS, STARTTLS = upgrade, PLAIN = no encryption
  const secure = socketType === "SSL" || socketType === "SSL/TLS";

  return { host, port, secure };
}

// ── Microsoft Autodiscover ───────────────────────────────────────────────────

async function detectViaAutodiscover(
  domain: string,
  email: string,
): Promise<DetectionResult | null> {
  const url = `https://autodiscover.${domain}/autodiscover/autodiscover.xml`;
  const body = `<?xml version="1.0" encoding="utf-8"?>
<Autodiscover xmlns="http://schemas.microsoft.com/exchange/autodiscover/outlook/requestschema/2006">
  <Request>
    <EMailAddress>${email}</EMailAddress>
    <AcceptableResponseSchema>http://schemas.microsoft.com/exchange/autodiscover/outlook/responseschema/2006a</AcceptableResponseSchema>
  </Request>
</Autodiscover>`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/xml" },
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const xml = await res.text();
    return parseAutodiscoverXml(xml, domain);
  } catch {
    return null;
  }
}

function parseAutodiscoverXml(xml: string, domain: string): DetectionResult | null {
  // Extract IMAP Protocol block
  const imapMatch = xml
    .match(/<Protocol>([\s\S]*?)<\/Protocol>/gi)
    ?.find((block) => /<Type>IMAP<\/Type>/i.test(block));
  const smtpMatch = xml
    .match(/<Protocol>([\s\S]*?)<\/Protocol>/gi)
    ?.find((block) => /<Type>SMTP<\/Type>/i.test(block));

  if (!imapMatch || !smtpMatch) return null;

  const imap = parseAutodiscoverBlock(imapMatch);
  const smtp = parseAutodiscoverBlock(smtpMatch);
  if (!imap || !smtp) return null;

  return {
    source: "autodiscover",
    config: { name: domain, imap, smtp },
  };
}

function parseAutodiscoverBlock(
  block: string,
): { host: string; port: number; secure: boolean } | null {
  const host = block.match(/<Server>(.*?)<\/Server>/i)?.[1]?.trim();
  const port = Number(block.match(/<Port>(.*?)<\/Port>/i)?.[1]);
  const ssl = block
    .match(/<SSL>(.*?)<\/SSL>/i)?.[1]
    ?.trim()
    .toUpperCase();

  if (!host || !port) return null;
  return { host, port, secure: ssl === "ON" };
}
