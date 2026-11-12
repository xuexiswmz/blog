import matter from "gray-matter";
import { describe, expect, it } from "vitest";
import {
  buildArticleMdx,
  getArticleFilePath,
  validateArticleInput,
  withArticleHeading,
} from "./articleInput";
import {
  getTodayDate,
  slugifyArticleTitle,
  stripMdxFrontmatter,
} from "./helpers";

const validInput = {
  title: "React 状态管理",
  slug: "react-state-management",
  date: "2026-11-11",
  description: "从 useState 到外部 store。",
  tags: ["react", "状态管理", "react"],
  related: ["css-box-model", "react-useeffect-setstate"],
  content: "## 先看一个例子\n\n内容。",
};

describe("article input", () => {
  it("validates and normalizes a new article", () => {
    const result = validateArticleInput(validInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.tags).toEqual(["react", "状态管理"]);
      expect(result.value.related).toEqual([
        "css-box-model",
        "react-useeffect-setstate",
      ]);
    }
  });

  it("rejects invalid slugs, dates and empty content", () => {
    const result = validateArticleInput({
      ...validInput,
      slug: "../secret",
      date: "2026-02-30",
      content: " ",
      related: ["../secret", "css-box-model"],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.slug).toBeTruthy();
      expect(result.errors.date).toBeTruthy();
      expect(result.errors.content).toBeTruthy();
    }
  });

  it("rejects relating an article to itself", () => {
    const result = validateArticleInput({
      ...validInput,
      related: [validInput.slug],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.related).toBe("不能关联文章自身");
    }
  });

  it("builds frontmatter and prepends an H1 only when missing", () => {
    const result = validateArticleInput(validInput);
    if (!result.ok) {
      throw new Error("input should be valid");
    }

    const file = buildArticleMdx(result.value);
    const parsed = matter(file);

    expect(parsed.data.title).toBe("React 状态管理");
    expect(parsed.data.related).toEqual([
      "css-box-model",
      "react-useeffect-setstate",
    ]);
    expect(parsed.content).toContain("# React 状态管理");
    expect(parsed.content).toContain("## 先看一个例子");
    expect(parsed.content.match(/# React 状态管理/g)).toHaveLength(1);

    const updated = matter(
      buildArticleMdx(result.value, {
        source: "yuque-export",
        image: "/images/cover.png",
        imageAlt: "封面",
      }),
    );
    expect(updated.data.source).toBe("yuque-export");
    expect(updated.data.image).toBe("/images/cover.png");
    expect(updated.data.imageAlt).toBe("封面");
  });

  it("does not duplicate an existing H1", () => {
    expect(withArticleHeading("标题", "# 已有标题\n\n正文")).toBe(
      "# 已有标题\n\n正文",
    );
  });

  it("builds the repository path", () => {
    expect(getArticleFilePath("css-box-model")).toBe(
      "content/posts/css-box-model.mdx",
    );
  });
});

describe("article helpers", () => {
  it("creates ascii slugs and leaves chinese titles empty for manual input", () => {
    expect(slugifyArticleTitle("React 19: New Hooks!")).toBe(
      "react-19-new-hooks",
    );
    expect(slugifyArticleTitle("中文标题")).toBe("");
  });

  it("strips frontmatter from uploaded MDX", () => {
    expect(
      stripMdxFrontmatter("---\ntitle: A\n---\n\n# 正文\n"),
    ).toBe("# 正文");
  });

  it("returns a local YYYY-MM-DD date", () => {
    expect(getTodayDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
