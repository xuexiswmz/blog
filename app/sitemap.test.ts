import { describe, expect, it } from "vitest";
import { buildSitemap } from "./sitemap";

describe("buildSitemap", () => {
  it("lists public static pages and every article with absolute URLs", () => {
    const sitemap = buildSitemap("https://blog.example.com", [
      { slug: "css-grid", date: "2025-07-15" },
      { slug: "draft-date", date: "" },
    ]);

    expect(sitemap.map((entry) => entry.url)).toEqual([
      "https://blog.example.com",
      "https://blog.example.com/graph",
      "https://blog.example.com/posts/css-grid",
      "https://blog.example.com/posts/draft-date",
    ]);
    expect(sitemap[2]?.lastModified).toEqual(new Date("2025-07-15"));
    expect(sitemap[3]?.lastModified).toBeUndefined();
  });
});
