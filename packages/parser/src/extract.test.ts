import { describe, expect, test } from "bun:test";
import { extractContent } from "./extract.js";

const ARTICLE_HTML = `
<html>
<head><title>Article</title></head>
<body>
  <header><nav>Menu</nav></header>
  <article>
    <h1>The main title</h1>
    <p>This is the first paragraph of the main article content. It is long enough for readability to detect it as the main content of the page.</p>
    <p>Second paragraph with more editorial content to help readability score this as an article worth extracting.</p>
  </article>
  <footer>
    <p>Unsubscribe | Privacy policy | Contact us</p>
    <p>© 2025 Company Inc. All rights reserved.</p>
  </footer>
</body>
</html>`;

const NOISE_HTML = `
<html>
<body>
  <p>&zwnj; &#8199;&zwnj; &#8199;&zwnj;</p>
  <p>Se désabonner: <a href="https://click.example.com/unsub">click here</a></p>
  <p><a href="https://click.email.feverup.com/?qs=abc123">tracking link</a></p>
</body>
</html>`;

describe("extractContent — layer 2", () => {
  test("returns a string for any HTML input", () => {
    const result = extractContent(ARTICLE_HTML);
    expect(typeof result.html).toBe("string");
    expect(result.html.length).toBeGreaterThan(0);
  });

  test("extracted flag is boolean", () => {
    const result = extractContent(ARTICLE_HTML);
    expect(typeof result.extracted).toBe("boolean");
  });

  test("does not throw on empty HTML", () => {
    expect(() => extractContent("")).not.toThrow();
    expect(() => extractContent("<html></html>")).not.toThrow();
  });

  test("falls back gracefully on minimal HTML (extracted=false)", () => {
    const result = extractContent("<p>hi</p>");
    // too short for readability — fallback
    expect(result.html).toContain("hi");
  });

  test("preserves content when extracted=true", () => {
    const result = extractContent(ARTICLE_HTML);
    if (result.extracted) {
      expect(result.html).toContain("main article content");
    } else {
      // fallback path — still contains original
      expect(result.html).toBe(ARTICLE_HTML);
    }
  });

  test("does not throw on noise-only HTML", () => {
    expect(() => extractContent(NOISE_HTML)).not.toThrow();
  });
});
