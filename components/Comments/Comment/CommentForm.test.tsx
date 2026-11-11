// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMocks,
}));

import CommentForm from "./CommentForm";
import { GUEST_USERNAME_STORAGE_KEY } from "./utils/guestUsername";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe("CommentForm", () => {
  let container: HTMLElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;

  const onPublished = vi.fn();
  const onSubmitted = vi.fn();

  beforeEach(async () => {
    window.localStorage.clear();
    onPublished.mockReset();
    onSubmitted.mockReset();

    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: "评论提交成功",
        comment: {
          status: "published",
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <CommentForm
          postSlug="react-useeffect-setstate"
          paragraphId="p-a1b2c3d4e5f6"
          replyTarget={null}
          onPublished={onPublished}
          onSubmitted={onSubmitted}
        />,
      );
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });

    container.remove();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("不再渲染用户名输入框", () => {
    expect(container.querySelector('input[type="text"]')).toBeNull();
    expect(container.querySelector("label")?.textContent).not.toContain(
      "用户名",
    );
  });

  it("自动生成 user_xxxx 并写入浏览器存储", () => {
    const username = window.localStorage.getItem(
      GUEST_USERNAME_STORAGE_KEY,
    );

    expect(username).toMatch(/^user_[0-9a-z]{8}$/);
  });

  it("提交时使用自动生成的用户名", async () => {
    const username = window.localStorage.getItem(
      GUEST_USERNAME_STORAGE_KEY,
    );

    const textarea = container.querySelector("textarea");

    if (!textarea) {
      throw new Error("找不到评论输入框");
    }

    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;

    await act(async () => {
      valueSetter?.call(textarea, "测试评论");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });

    const form = container.querySelector("form");

    if (!form) {
      throw new Error("找不到评论表单");
    }

    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));

    expect(url).toBe("/api/posts/react-useeffect-setstate/comments");
    expect(body).toMatchObject({
      blockId: "p-a1b2c3d4e5f6",
      username,
      content: "测试评论",
      replyToId: null,
    });
    expect(onPublished).toHaveBeenCalled();
    expect(onSubmitted).toHaveBeenCalled();
  });
});
