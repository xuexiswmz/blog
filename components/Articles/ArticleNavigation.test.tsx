import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ArticleNavigationGroup } from "@/lib/articleCategories/types";
import ArticleNavigation from "./ArticleNavigation";

const groups: ArticleNavigationGroup[] = [
  {
    id: "react",
    name: "React",
    position: 0,
    posts: [
      { slug: "react-hooks", title: "React Hooks", date: "", position: 0 },
      { slug: "hello world", title: "Hello World", date: "", position: 1 },
    ],
  },
  { id: "empty", name: "空分类", position: 1, posts: [] },
];

describe("ArticleNavigation", () => {
  it("renders category and post order with an encoded link", () => {
    const markup = renderToStaticMarkup(
      <ArticleNavigation groups={groups} currentSlug="react-hooks" />,
    );

    expect(markup.indexOf("React")).toBeLessThan(markup.indexOf("空分类"));
    expect(markup.indexOf("React Hooks")).toBeLessThan(
      markup.indexOf("Hello World"),
    );
    expect(markup).toContain('href="/posts/hello%20world"');
    expect(markup).toContain("暂无文章");
  });

  it("marks the current article with monochrome light and dark styles", () => {
    const markup = renderToStaticMarkup(
      <ArticleNavigation groups={groups} currentSlug="react-hooks" />,
    );
    const currentLink = markup.match(
      /<a[^>]*aria-current="page"[^>]*class="([^"]+)"[^>]*>/,
    );

    expect(currentLink?.[1]).toContain("bg-slate-100");
    expect(currentLink?.[1]).toContain("text-slate-950");
    expect(currentLink?.[1]).toContain("dark:bg-white/10");
    expect(currentLink?.[1]).toContain("dark:text-white");
    expect(currentLink?.[1]).not.toContain("blue");
  });

  it("provides a visible keyboard focus style", () => {
    const markup = renderToStaticMarkup(
      <ArticleNavigation groups={groups} currentSlug="none" />,
    );

    expect(markup).toContain("focus-visible:outline-2");
    expect(markup).toContain("focus-visible:outline-offset-2");
  });
});
