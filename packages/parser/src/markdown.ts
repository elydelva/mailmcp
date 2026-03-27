/**
 * Layer 3 — Markdown conversion
 *
 * Responsibility: convert clean HTML to readable Markdown.
 * Applies a "strip-tracking-links" rule: anchor tags pointing to known
 * tracking domains (click., track., links., redirect.) are collapsed to
 * their text content; legitimate editorial links are preserved as [text](url).
 */

import TurndownService from "turndown";

const TRACKING_PATTERNS = [
  /^https?:\/\/click\./,
  /^https?:\/\/track\./,
  /^https?:\/\/links\./,
  /[?&](trk|utm_|eid=|midToken=|loid=)/,
  /\/redirect\//,
  /\/comm\/psettings\/email-unsubscribe/,
  /unsub_center/,
];

function isTrackingUrl(href: string): boolean {
  return TRACKING_PATTERNS.some((p) => p.test(href));
}

function buildTurndown(): TurndownService {
  const td = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  });

  td.remove(["style", "script", "head"]);

  // Explicit rule — overrides turndown's built-in image rule
  td.addRule("strip-images", {
    filter: "img",
    replacement: () => "",
  });

  td.addRule("strip-tracking-links", {
    filter: "a",
    replacement(content, node) {
      const href = (node as Element).getAttribute("href") ?? "";
      const text = content.trim();
      if (!href || isTrackingUrl(href) || !text) return text;
      return `[${text}](${href})`;
    },
  });

  return td;
}

const td = buildTurndown();

/**
 * Strip invisible/zero-width characters commonly injected by email clients
 * as preheader spacers: ZWNJ, ZWJ, ZWSP, soft hyphen, BOM, word joiner,
 * figure space (U+2007), combining grapheme joiner (U+034F), etc.
 * Also normalises runs of blank lines and trims trailing whitespace.
 */
function stripInvisible(text: string): string {
  return text
    .replace(/\u00AD|\u034F|\u200B|\u200C|\u200D|\u2007|\u2060|\uFEFF/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^\s+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function toMarkdown(html: string): string {
  return stripInvisible(td.turndown(html));
}
