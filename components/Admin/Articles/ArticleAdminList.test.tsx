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

import ArticleAdminList from "./ArticleAdminList";

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

function findButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === label,
  );
}

describe("ArticleAdminList", () => {
  it("asks for confirmation and commits deletion", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          slug: "old-article",
          commitUrl: "https://github.com/commit/delete",
          deployRequired: true,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      root = createRoot(container);
      root.render(
        <ArticleAdminList
          posts={[
            { slug: "old-article", title: "旧文章", date: "2026-01-01" },
            { slug: "keep-article", title: "保留文章", date: "2026-01-02" },
          ]}
        />,
      );
    });

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="删除 旧文章"]')
        ?.click();
    });

    expect(
      container.querySelector(
        'a[href="/admin/articles/old-article/edit"]',
      ),
    ).not.toBeNull();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.body.textContent).toContain("确认删除");

    await act(async () => {
      findButton("确认删除")?.click();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/articles/old-article",
      { method: "DELETE" },
    );
    expect(container.textContent).toContain("已提交删除");
    expect(container.textContent).not.toContain("旧文章");
    expect(container.textContent).toContain("保留文章");
    expect(toastMocks.success).toHaveBeenCalledWith(
      "已提交删除，部署后生效",
    );
  });

  it("shows the token error as a toast and keeps the article", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message:
              "未配置 GITHUB_CONTENT_TOKEN，无法删除 GitHub 上的文章",
          }),
          { status: 500 },
        ),
      ),
    );

    await act(async () => {
      root = createRoot(container);
      root.render(
        <ArticleAdminList
          posts={[
            { slug: "old-article", title: "旧文章", date: "2026-01-01" },
          ]}
        />,
      );
    });

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('button[aria-label="删除 旧文章"]')
        ?.click();
    });
    await act(async () => {
      findButton("确认删除")?.click();
    });

    expect(toastMocks.error).toHaveBeenCalledWith(
      "未配置 GITHUB_CONTENT_TOKEN，无法删除 GitHub 上的文章",
    );
    expect(container.textContent).toContain("旧文章");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("filters by tag and search query", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(
        <ArticleAdminList
          posts={[
            {
              slug: "css-layout",
              title: "CSS 布局",
              date: "2026-01-01",
              tags: ["css"],
            },
            {
              slug: "react-state",
              title: "React 状态",
              date: "2026-01-02",
              tags: ["react"],
            },
          ]}
        />,
      );
    });

    const reactTab = Array.from(
      document.querySelectorAll("button"),
    ).find((button) => button.textContent?.includes("React")) as
      | HTMLButtonElement
      | undefined;

    await act(async () => {
      reactTab?.click();
    });

    expect(container.textContent).toContain("React 状态");
    expect(container.textContent).not.toContain("CSS 布局");

    const allTab = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim().startsWith("全部"),
    ) as HTMLButtonElement | undefined;

    await act(async () => {
      allTab?.click();
    });

    const search = container.querySelector<HTMLInputElement>(
      'input[placeholder="搜索文章标题..."]',
    );
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;

    await act(async () => {
      setter?.call(search, "css");
      search?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(container.textContent).toContain("CSS 布局");
    expect(container.textContent).not.toContain("React 状态");
  });
});
