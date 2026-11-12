import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/components/Admin/ArticleCategories/hooks/useArticleCategories", () => ({
  default: () => ({
    state: { categories: [], unassignedPosts: [] },
    loading: false,
    error: "",
    pendingKey: null,
    retry: () => {},
    createCategory: async () => true,
    renameCategory: async () => true,
    deleteCategory: async () => true,
    moveCategory: async () => true,
    assignCategory: async () => true,
    movePost: async () => true,
  }),
}));

import ArticleUploadForm from "./ArticleUploadForm";

describe("ArticleUploadForm", () => {
  it("renders article fields, MDX upload and related posts", () => {
    const markup = renderToStaticMarkup(
      <ArticleUploadForm
        posts={[
          { slug: "css-box-model", title: "CSS 盒模型" },
          { slug: "react-hooks", title: "React Hooks" },
        ]}
      />,
    );

    expect(markup).toContain("文章标题");
    expect(markup).toContain("文章属性");
    expect(markup).toContain("发布日期");
    expect(markup).toContain("Slug");
    expect(markup).toContain("标签");
    expect(markup).toContain("关联文章");
    expect(markup).toContain("添加关联");
    expect(markup).toContain('type="date"');
    expect(markup).toContain("上传 .mdx");
    expect(markup).toContain("发布文章");
  });
});
