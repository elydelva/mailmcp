import { describe, expect, test } from "bun:test";
import { NEWSLETTER_MIME } from "./__fixtures__/newsletter.mime.js";
import { renderEmail } from "./render.js";

describe("renderEmail — integration pipeline", () => {
  test("returns a RenderedEmail object", async () => {
    const result = await renderEmail(NEWSLETTER_MIME);
    expect(result).toHaveProperty("subject");
    expect(result).toHaveProperty("from");
    expect(result).toHaveProperty("date");
    expect(result).toHaveProperty("markdown");
    expect(result).toHaveProperty("plainText");
    expect(result).toHaveProperty("hasHtml");
    expect(result).toHaveProperty("attachments");
  });

  test("decodes subject from encoded-word", async () => {
    const result = await renderEmail(NEWSLETTER_MIME);
    expect(result.subject).toBe("Découvrez notre spectacle");
  });

  test("sets hasHtml=true for multipart message", async () => {
    const result = await renderEmail(NEWSLETTER_MIME);
    expect(result.hasHtml).toBe(true);
  });

  test("markdown does not contain raw quoted-printable sequences", async () => {
    const result = await renderEmail(NEWSLETTER_MIME);
    expect(result.markdown).not.toMatch(/=[A-F0-9]{2}/);
  });

  test("markdown does not contain HTML entities or zero-width chars", async () => {
    const result = await renderEmail(NEWSLETTER_MIME);
    expect(result.markdown).not.toContain("&zwnj;");
    expect(result.markdown).not.toContain("&#8199;");
    expect(result.markdown).not.toContain("&copy;");
  });

  test("markdown does not contain tracking URLs", async () => {
    const result = await renderEmail(NEWSLETTER_MIME);
    expect(result.markdown).not.toContain("click.email.feverup.com");
    expect(result.markdown).not.toContain("unsub_center");
    expect(result.markdown).not.toContain("qs=");
  });

  test("markdown does not contain style tags", async () => {
    const result = await renderEmail(NEWSLETTER_MIME);
    expect(result.markdown).not.toContain("font-family");
    expect(result.markdown).not.toContain("<style>");
  });

  test("plainText is decoded (no quoted-printable)", async () => {
    const result = await renderEmail(NEWSLETTER_MIME);
    expect(result.plainText).toContain("Découvrez notre nouveau spectacle à Paris");
  });

  test("attachments array is present", async () => {
    const result = await renderEmail(NEWSLETTER_MIME);
    expect(Array.isArray(result.attachments)).toBe(true);
    expect(result.attachments).toHaveLength(0);
  });

  test("date is a valid Date object", async () => {
    const result = await renderEmail(NEWSLETTER_MIME);
    expect(result.date).toBeInstanceOf(Date);
    expect(result.date.getFullYear()).toBe(2025);
  });
});
