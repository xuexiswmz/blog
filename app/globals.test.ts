import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  fileURLToPath(new URL("./globals.css", import.meta.url)),
  "utf8",
);

function declarationsFor(selector: string) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return new Map<string, string>();
  const bodyStart = css.indexOf("{", start) + 1;
  const bodyEnd = css.indexOf("}", bodyStart);
  const declarations = new Map<string, string>();

  for (const declaration of css.slice(bodyStart, bodyEnd).split(";")) {
    const separator = declaration.indexOf(":");
    if (separator === -1) continue;
    declarations.set(
      declaration.slice(0, separator).trim(),
      declaration.slice(separator + 1).trim(),
    );
  }

  return declarations;
}

describe("global theme tokens", () => {
  it("uses the softer Midscene dark palette", () => {
    const declarations = declarationsFor('html[data-theme="dark"]');

    expect(declarations.get("--background")).toBe("#121212");
    expect(declarations.get("--foreground")).toBe("#fffff5ed");
    expect(declarations.get("--muted-foreground")).toBe("#fffff5a6");
    expect(declarations.get("--border")).toBe("#5454547a");
    expect(declarations.get("--link")).toBe("#33adff");
  });

  it("maps dark article prose to the shared theme colors", () => {
    const declarations = declarationsFor(
      'html[data-theme="dark"] [data-article-content]',
    );

    expect(declarations.get("--tw-prose-body")).toBe("var(--foreground)");
    expect(declarations.get("--tw-prose-links")).toBe("var(--link)");
    expect(declarations.get("--tw-prose-pre-bg")).toBe("var(--background)");
  });

  it("does not generate backticks around styled inline code", () => {
    const declarations = declarationsFor(
      "[data-article-content] :not(pre) > code::before,\n[data-article-content] :not(pre) > code::after",
    );

    expect(declarations.get("content")).toBe("none");
  });
});
