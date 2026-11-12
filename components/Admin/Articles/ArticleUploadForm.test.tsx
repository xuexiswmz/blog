import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
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

    expect(markup).toContain("标题");
    expect(markup).toContain("slug");
    expect(markup).toContain('type="date"');
    expect(markup).toContain("上传 .mdx");
    expect(markup).toContain("CSS 盒模型");
    expect(markup).toContain("css-box-model");
    expect(markup).toContain("提交文章");
  });
});
