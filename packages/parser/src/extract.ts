/**
 * Layer 2 — Content extraction
 *
 * Responsibility: isolate the editorial content of an HTML email by removing
 * newsletter noise (headers, footers, unsubscribe blocks, tracking URLs).
 * Uses @mozilla/readability (Firefox Reader Mode algorithm) with linkedom
 * as the DOM provider (no native deps, Bun-compatible).
 *
 * This layer is non-blocking: if readability fails to detect an article
 * (low confidence score), the original HTML is returned unchanged.
 */

import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";

export interface ExtractResult {
  html: string;
  /** true if readability successfully extracted article content */
  extracted: boolean;
}

export function extractContent(html: string): ExtractResult {
  try {
    const { document } = parseHTML(html);
    const reader = new Readability(document as unknown as Document);
    const article = reader.parse();

    if (article?.content) {
      return { html: article.content, extracted: true };
    }
  } catch {
    // Readability failure is non-fatal — fall through to raw HTML
  }

  return { html, extracted: false };
}
