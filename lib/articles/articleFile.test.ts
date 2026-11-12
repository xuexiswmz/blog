import { beforeEach, describe, expect, it, vi } from "vitest";

const fileSystem = vi.hoisted(() => ({
  readFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => fileSystem);

import {
  getArticleForEdit,
  getArticleFrontmatterExtras,
} from "./articleFile";

describe("article file editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses frontmatter and strips the duplicate title heading", async () => {
    fileSystem.readFile.mockResolvedValue(`---
title: React 状态
date: "2026-11-12"
description: 简介
tags:
  - react
related:
  - css-box-model
---

# React 状态

## 正文

内容。
`);

    const article = await getArticleForEdit("react-state");

    expect(article).toEqual({
      slug: "react-state",
      title: "React 状态",
      date: "2026-11-12",
      description: "简介",
      tags: ["react"],
      related: ["css-box-model"],
      content: "## 正文\n\n内容。",
    });
  });

  it("returns null for invalid or missing slugs", async () => {
    await expect(getArticleForEdit("../secret")).resolves.toBeNull();

    fileSystem.readFile.mockRejectedValue(new Error("missing"));
    await expect(getArticleForEdit("missing")).resolves.toBeNull();
  });

  it("uses the body H1 as the title when it differs from frontmatter", async () => {
    fileSystem.readFile.mockResolvedValue(`---
title: 短标题
date: "2026-11-12"
---

# 更完整的标题：副标题

正文。
`);

    const article = await getArticleForEdit("article-with-heading");

    expect(article?.title).toBe("更完整的标题：副标题");
    expect(article?.content).toBe("正文。");
  });

  it("keeps non-editable frontmatter fields for updates", async () => {
    fileSystem.readFile.mockResolvedValue(`---
title: 文章
source: yuque-export
image: /images/cover.png
imageAlt: 封面
date: "2026-11-12"
---

正文。
`);

    await expect(
      getArticleFrontmatterExtras("article"),
    ).resolves.toEqual({
      source: "yuque-export",
      image: "/images/cover.png",
      imageAlt: "封面",
    });
  });
});
