// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArticleCategoryAdminState } from "@/lib/articleCategories/types";

const hook = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("../hooks/useArticleCategories", () => ({
  default: () => hook.current,
}));

import ArticleCategoryManager from "./ArticleCategoryManager";

const state: ArticleCategoryAdminState = {
  categories: [
    {
      id: "react",
      name: "React",
      position: 0,
      posts: [
        {
          slug: "react-hooks",
          title: "React Hooks",
          date: "2026-10-01",
          position: 0,
        },
      ],
    },
  ],
  unassignedPosts: [
    { slug: "css-grid", title: "CSS Grid", date: "2026-09-01", position: 0 },
    { slug: "html-basics", title: "HTML Basics", date: "2026-08-01", position: 1 },
  ],
};

const actions = {
  retry: vi.fn(),
  createCategory: vi.fn(),
  renameCategory: vi.fn(),
  deleteCategory: vi.fn(),
  moveCategory: vi.fn(),
  assignCategory: vi.fn(),
  movePost: vi.fn(),
};

let container: HTMLDivElement;
let root: Root;

async function renderManager() {
  await act(async () => root.render(<ArticleCategoryManager />));
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  hook.current = {
    state,
    loading: false,
    error: "",
    pendingKey: null,
    ...actions,
  };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("ArticleCategoryManager", () => {
  it("renders every classified and unassigned article", async () => {
    await renderManager();

    expect(container.textContent).toContain("React Hooks");
    expect(container.textContent).toContain("CSS Grid");
    expect(container.textContent).toContain("HTML Basics");
  });

  it("disables impossible moves and explains protected deletion", async () => {
    await renderManager();

    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="上移分类 React"]',
      )?.disabled,
    ).toBe(true);
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="删除分类 React"]',
      )?.disabled,
    ).toBe(true);
    expect(container.textContent).toContain("移动全部文章后才能删除分类");
    expect(
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="上移文章 React Hooks"]',
      )?.disabled,
    ).toBe(true);
  });

  it("changes an unassigned article category through its labeled select", async () => {
    await renderManager();
    const select = container.querySelector<HTMLSelectElement>(
      'select[aria-label="设置文章 CSS Grid 的分类"]',
    );
    expect(select).not.toBeNull();

    await act(async () => {
      select!.value = "react";
      select!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(actions.assignCategory).toHaveBeenCalledWith("css-grid", "react");
  });

  it("renders a retryable error without discarding the page", async () => {
    hook.current = {
      ...hook.current,
      state: null,
      loading: false,
      error: "读取分类失败",
    };
    await renderManager();

    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "读取分类失败",
    );
    const retry = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "重试",
    );
    await act(async () => retry?.click());
    expect(actions.retry).toHaveBeenCalledOnce();
  });
});
