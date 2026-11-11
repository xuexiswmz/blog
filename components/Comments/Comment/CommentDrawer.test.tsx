// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./CommentList", () => ({
  default: () => <div>评论列表</div>,
}));

import CommentDrawer from "./CommentDrawer";

describe("CommentDrawer", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;

    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it("使用 shadcn Sheet 渲染并从右侧打开", async () => {
    await act(async () => {
      root.render(
        <CommentDrawer
          open
          id="comments-test"
          postSlug="react-useeffect-setstate"
          paragraphId="p-a1b2c3d4e5f6"
          onClose={() => undefined}
          onPublished={async () => undefined}
        />,
      );
    });

    const content = document.body.querySelector(
      '[data-slot="sheet-content"]',
    );
    const overlay = document.body.querySelector(
      '[data-slot="sheet-overlay"]',
    );

    expect(content).not.toBeNull();
    expect(overlay).not.toBeNull();
    expect(content?.getAttribute("data-state")).toBe("open");
    expect(content?.getAttribute("role")).toBe("dialog");
    expect(content?.textContent).toContain("段评");
    expect(content?.textContent).toContain("写下你的段评");
  });
});
