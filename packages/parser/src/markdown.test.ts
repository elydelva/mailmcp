import { describe, expect, test } from "bun:test";
import { toMarkdown } from "./markdown.js";

describe("toMarkdown — layer 3", () => {
  test("converts headings", () => {
    const md = toMarkdown("<h1>Title</h1>");
    expect(md).toBe("# Title");
  });

  test("converts paragraphs", () => {
    const md = toMarkdown("<p>Hello world</p>");
    expect(md).toContain("Hello world");
  });

  test("strips style and script tags", () => {
    const md = toMarkdown("<style>.foo{color:red}</style><p>Content</p><script>alert(1)</script>");
    expect(md).not.toContain(".foo");
    expect(md).not.toContain("alert");
    expect(md).toContain("Content");
  });

  test("strips img tags", () => {
    const md = toMarkdown('<img src="https://example.com/img.png" alt="photo"><p>Text</p>');
    expect(md).not.toContain("img.png");
    expect(md).toContain("Text");
  });

  test("preserves editorial links", () => {
    const md = toMarkdown('<a href="https://example.com/article">Read more</a>');
    expect(md).toBe("[Read more](https://example.com/article)");
  });

  test("strips tracking links — click. domain", () => {
    const md = toMarkdown('<a href="https://click.email.feverup.com/?qs=abc123">Book now</a>');
    expect(md).not.toContain("https://click.email.feverup.com");
    expect(md).toContain("Book now");
  });

  test("strips tracking links — utm_ param", () => {
    const md = toMarkdown(
      '<a href="https://example.com/page?utm_source=email&utm_medium=nl">Promo</a>',
    );
    expect(md).not.toContain("utm_source");
    expect(md).toContain("Promo");
  });

  test("strips tracking links — unsub_center", () => {
    const md = toMarkdown(
      '<a href="https://click.example.com/unsub_center.aspx?qs=xyz">Se désabonner</a>',
    );
    expect(md).not.toContain("unsub_center");
    expect(md).toContain("Se désabonner");
  });

  test("collapses anchor with empty text", () => {
    const md = toMarkdown('<a href="https://example.com">   </a>');
    expect(md.trim()).toBe("");
  });

  test("converts unordered list", () => {
    const md = toMarkdown("<ul><li>Item 1</li><li>Item 2</li></ul>");
    expect(md).toContain("Item 1");
    expect(md).toContain("Item 2");
    expect(md).toMatch(/^-\s+Item 1/m);
  });

  test("converts strong/em", () => {
    const md = toMarkdown("<p><strong>Bold</strong> and <em>italic</em></p>");
    expect(md).toContain("**Bold**");
    expect(md).toContain("_italic_");
  });

  test("does not throw on empty string", () => {
    expect(() => toMarkdown("")).not.toThrow();
  });
});
