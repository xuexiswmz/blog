// @vitest-environment jsdom

import {
  act,
  createRef,
  forwardRef,
  useImperativeHandle,
  type RefObject,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArticleCategoryAdminState } from "@/lib/articleCategories/types";

const mocks = vi.hoisted(() => {
  const replace = vi.fn();
  return {
    replace,
    router: { replace },
    requestArticleCategoryState: vi.fn(),
    requestCreateArticleCategory: vi.fn(),
    requestRenameArticleCategory: vi.fn(),
    requestDeleteArticleCategory: vi.fn(),
    requestMoveArticleCategory: vi.fn(),
    requestAssignArticleCategory: vi.fn(),
    requestMoveArticleInCategory: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock("../api/articleCategoryApi", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../api/articleCategoryApi")>();
  return {
    ...actual,
    requestArticleCategoryState: mocks.requestArticleCategoryState,
    requestCreateArticleCategory: mocks.requestCreateArticleCategory,
    requestRenameArticleCategory: mocks.requestRenameArticleCategory,
    requestDeleteArticleCategory: mocks.requestDeleteArticleCategory,
    requestMoveArticleCategory: mocks.requestMoveArticleCategory,
    requestAssignArticleCategory: mocks.requestAssignArticleCategory,
    requestMoveArticleInCategory: mocks.requestMoveArticleInCategory,
  };
});

import { ArticleCategoryApiError } from "../api/articleCategoryApi";
import useArticleCategories from "./useArticleCategories";

const initialState: ArticleCategoryAdminState = {
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
  unassignedPosts: [],
};

type HookState = ReturnType<typeof useArticleCategories>;
const Harness = forwardRef<HookState>(function Harness(_props, ref) {
  const state = useArticleCategories();
  useImperativeHandle(ref, () => state, [state]);
  return null;
});

let container: HTMLDivElement;
let root: Root;
let hookRef: RefObject<HookState | null>;

function current() {
  if (!hookRef.current) throw new Error("hook is not mounted");
  return hookRef.current;
}

async function renderHook() {
  await act(async () => {
    root.render(<Harness ref={hookRef} />);
    await Promise.resolve();
  });
  await act(async () => Promise.resolve());
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks();
  mocks.requestArticleCategoryState.mockResolvedValue(initialState);
  for (const mutation of [
    mocks.requestCreateArticleCategory,
    mocks.requestRenameArticleCategory,
    mocks.requestDeleteArticleCategory,
    mocks.requestMoveArticleCategory,
    mocks.requestAssignArticleCategory,
    mocks.requestMoveArticleInCategory,
  ]) {
    mutation.mockResolvedValue(undefined);
  }
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  hookRef = createRef<HookState>();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("useArticleCategories", () => {
  it("loads initial state and aborts the request on unmount", async () => {
    let receivedSignal: AbortSignal | undefined;
    mocks.requestArticleCategoryState.mockImplementation(
      async (signal?: AbortSignal) => {
        receivedSignal = signal;
        return initialState;
      },
    );

    await renderHook();
    expect(current().state).toEqual(initialState);
    expect(current().loading).toBe(false);

    await act(async () => root.unmount());
    expect(receivedSignal?.aborted).toBe(true);
    root = createRoot(container);
  });

  it("redirects to login when the session expires", async () => {
    mocks.requestArticleCategoryState.mockRejectedValue(
      new ArticleCategoryApiError("请先登录管理员账号", 401),
    );

    await renderHook();

    expect(mocks.replace).toHaveBeenCalledWith("/admin/login");
  });

  it("retries a failed read and replaces the error with fresh state", async () => {
    mocks.requestArticleCategoryState
      .mockRejectedValueOnce(new Error("读取失败"))
      .mockResolvedValueOnce(initialState);

    await renderHook();
    expect(current().error).toBe("读取失败");

    await act(async () => {
      current().retry();
      await Promise.resolve();
    });
    await act(async () => Promise.resolve());

    expect(current().state).toEqual(initialState);
    expect(current().error).toBe("");
  });

  it("exposes operation-specific pending state and refreshes after success", async () => {
    let finish!: () => void;
    mocks.requestCreateArticleCategory.mockImplementation(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );

    await renderHook();
    let promise!: Promise<boolean>;
    await act(async () => {
      promise = current().createCategory("CSS");
      await Promise.resolve();
    });
    expect(current().pendingKey).toBe("category:create");

    await act(async () => {
      finish();
      await promise;
    });

    expect(current().pendingKey).toBeNull();
    expect(mocks.requestArticleCategoryState).toHaveBeenCalledTimes(2);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("分类已创建");
  });

  it("retains current data and reports mutation failures", async () => {
    mocks.requestDeleteArticleCategory.mockRejectedValue(
      new ArticleCategoryApiError("分类中仍有文章", 409),
    );

    await renderHook();
    await act(async () => {
      await current().deleteCategory("react");
    });

    expect(current().state).toEqual(initialState);
    expect(mocks.toastError).toHaveBeenCalledWith("分类中仍有文章");
    expect(mocks.requestArticleCategoryState).toHaveBeenCalledOnce();
  });
});
