import { describe, expect, test } from "bun:test";
import { parseMime } from "./mime.js";

// Minimal quoted-printable encoded MIME message
const QP_MIME = [
  "From: Test <test@example.com>",
  "To: user@example.com",
  "Subject: =?UTF-8?Q?Caf=C3=A9_au_lait?=",
  "Date: Mon, 17 Nov 2025 17:28:03 +0000",
  "MIME-Version: 1.0",
  "Content-Type: text/plain; charset=UTF-8",
  "Content-Transfer-Encoding: quoted-printable",
  "",
  "Bonjour =C3=A0 tous, voici un test avec des caract=C3=A8res sp=C3=A9ciaux.",
].join("\r\n");

const HTML_MIME = [
  "From: Newsletter <news@example.com>",
  "To: user@example.com",
  "Subject: Hello",
  "Date: Tue, 18 Nov 2025 09:00:00 +0000",
  "MIME-Version: 1.0",
  "Content-Type: multipart/alternative; boundary=boundary42",
  "",
  "--boundary42",
  "Content-Type: text/plain; charset=UTF-8",
  "",
  "Plain text version",
  "--boundary42",
  "Content-Type: text/html; charset=UTF-8",
  "",
  "<html><body><h1>Hello</h1><p>World</p></body></html>",
  "--boundary42--",
].join("\r\n");

describe("parseMime — layer 1", () => {
  test("decodes quoted-printable body", async () => {
    const result = await parseMime(QP_MIME);
    expect(result.text).toContain("Bonjour à tous");
    expect(result.text).toContain("caractères spéciaux");
  });

  test("decodes encoded subject", async () => {
    const result = await parseMime(QP_MIME);
    expect(result.subject).toBe("Café au lait");
  });

  test("parses from field", async () => {
    const result = await parseMime(QP_MIME);
    expect(result.from).toContain("test@example.com");
  });

  test("returns null html for text/plain only message", async () => {
    const result = await parseMime(QP_MIME);
    expect(result.html).toBeNull();
  });

  test("extracts html part from multipart/alternative", async () => {
    const result = await parseMime(HTML_MIME);
    expect(result.html).toContain("<h1>Hello</h1>");
    expect(result.hasHtml).toBeUndefined(); // hasHtml is on RenderedEmail, not ParsedMail
    expect(result.html).not.toBeNull();
  });

  test("extracts plain text from multipart/alternative", async () => {
    const result = await parseMime(HTML_MIME);
    expect(result.text).toContain("Plain text version");
  });

  test("returns empty attachments array when none present", async () => {
    const result = await parseMime(QP_MIME);
    expect(result.attachments).toEqual([]);
  });
});
