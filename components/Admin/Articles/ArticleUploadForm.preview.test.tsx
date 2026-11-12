// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container.remove();
  root = null;
});

describe("ArticleUploadForm preview", () => {
  it("switches from MDX editing to rendered preview and back", async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<ArticleUploadForm posts={[]} />);
    });

    const textarea = container.querySelector<HTMLTextAreaElement>(
      'textarea[placeholder^="##"]',
    );

    expect(textarea).not.toBeNull();

    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;

    await act(async () => {
      setter?.call(textarea, "## 预览标题\n\n正文内容");
      textarea?.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const previewButton =
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="预览"]',
      );

    expect(previewButton).not.toBeNull();

    await act(async () => {
      previewButton?.click();
    });

    expect(
      container.querySelector<HTMLTextAreaElement>(
        'textarea[placeholder^="##"]',
      ),
    ).toBeNull();
    expect(container.textContent).toContain("预览标题");
    expect(container.textContent).toContain("正文内容");

    const editButton =
      container.querySelector<HTMLButtonElement>(
        'button[aria-label="编辑"]',
      );

    await act(async () => {
      editButton?.click();
    });

    expect(
      container.querySelector<HTMLTextAreaElement>(
        'textarea[placeholder^="##"]',
      ),
    ).not.toBeNull();
  });
});
