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

function setValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("ArticleUploadForm toast", () => {
  it("shows token configuration errors as a toast", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message:
              "未配置 GITHUB_CONTENT_TOKEN，无法提交文章到 GitHub",
          }),
          { status: 500 },
        ),
      ),
    );

    await act(async () => {
      root = createRoot(container);
      root.render(<ArticleUploadForm posts={[]} />);
    });

    const title = container.querySelector<HTMLInputElement>("#article-title");
    const slug = container.querySelector<HTMLInputElement>("#article-slug");
    const content = container.querySelector<HTMLTextAreaElement>(
      'textarea[placeholder^="##"]',
    );

    await act(async () => {
      if (title) setValue(title, "测试文章");
      if (slug) setValue(slug, "test-article");
      if (content) setValue(content, "## 正文");
    });

    const form = container.querySelector("form");

    await act(async () => {
      form?.requestSubmit();
    });

    expect(toastMocks.error).toHaveBeenCalledWith(
      "未配置 GITHUB_CONTENT_TOKEN，无法提交文章到 GitHub",
    );
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
