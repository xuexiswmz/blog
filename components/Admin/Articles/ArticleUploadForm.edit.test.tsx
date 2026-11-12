// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

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

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container.remove();
  root = null;
  vi.unstubAllGlobals();
});

describe("ArticleUploadForm edit mode", () => {
  it("prefills the article and submits a PUT update", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          slug: "react-state",
          path: "content/posts/react-state.mdx",
          commitUrl: "https://github.com/commit/update",
          fileUrl: "https://github.com/file/update",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      root = createRoot(container);
      root.render(
        <ArticleUploadForm
          posts={[{ slug: "css-box-model", title: "CSS 盒模型" }]}
          variant="edit"
          initialArticle={{
            slug: "react-state",
            title: "React 状态",
            date: "2026-11-12",
            description: "文章简介",
            tags: ["react"],
            related: ["css-box-model"],
            content: "## 正文\n\n内容。",
          }}
        />,
      );
    });

    const title = container.querySelector<HTMLInputElement>("#article-title");
    const slug = container.querySelector<HTMLInputElement>("#article-slug");
    const body = container.querySelector<HTMLTextAreaElement>(
      'textarea[placeholder^="##"]',
    );

    expect(title?.value).toBe("React 状态");
    expect(slug?.value).toBe("react-state");
    expect(slug?.readOnly).toBe(true);
    expect(body?.value).toContain("## 正文");
    expect(container.textContent).toContain("保存修改");
    expect(container.textContent).toContain("查看文章");

    await act(async () => {
      container.querySelector("form")?.requestSubmit();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/articles/react-state",
      expect.objectContaining({
        method: "PUT",
      }),
    );

    const payload = JSON.parse(
      String(fetchMock.mock.calls[0][1].body),
    );
    expect(payload).toMatchObject({
      title: "React 状态",
      slug: "react-state",
      date: "2026-11-12",
      description: "文章简介",
      tags: ["react"],
      related: ["css-box-model"],
    });
    expect(payload.content).toContain("## 正文");
    expect(toastMocks.success).toHaveBeenCalledWith(
      "修改已提交到 GitHub",
    );
    expect(container.textContent).toContain("修改已提交到 GitHub");
  });
});
