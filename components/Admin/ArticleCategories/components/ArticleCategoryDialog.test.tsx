// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ArticleCategoryDialog from "./ArticleCategoryDialog";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root | null = null;

const createCategory = vi.fn(async () => true);
const renameCategory = vi.fn(async () => true);
const deleteCategory = vi.fn(async () => true);
const moveCategory = vi.fn(async () => true);

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
});

function findButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll("button")).find(
    (button) => button.textContent?.trim() === label,
  );
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;

  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function renderDialog() {
  await act(async () => {
    root = createRoot(container);
    root.render(
      <ArticleCategoryDialog
        open
        onOpenChange={() => {}}
        state={{
          categories: [
            { id: "cat-1", name: "CSS", position: 0, posts: [] },
            { id: "cat-2", name: "React", position: 1, posts: [] },
          ],
          unassignedPosts: [],
        }}
        loading={false}
        error=""
        pendingKey={null}
        retry={() => {}}
        createCategory={createCategory}
        renameCategory={renameCategory}
        deleteCategory={deleteCategory}
        moveCategory={moveCategory}
      />,
    );
  });
}

describe("ArticleCategoryDialog", () => {
  it("creates, renames and deletes categories", async () => {
    await renderDialog();

    await act(async () => {
      findButton("新增分类")?.click();
    });

    const nameInput = document.querySelector<HTMLInputElement>("#category-name");
    expect(nameInput).not.toBeNull();

    await act(async () => {
      if (nameInput) setInputValue(nameInput, "JavaScript");
    });
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>(
          'button[aria-label="保存新分类"]',
        )
        ?.click();
    });

    expect(createCategory).toHaveBeenCalledWith("JavaScript");

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>(
          'button[aria-label="重命名分类 CSS"]',
        )
        ?.click();
    });

    const renameInput =
      document.querySelector<HTMLInputElement>("#category-name");
    await act(async () => {
      if (renameInput) setInputValue(renameInput, "CSS 基础");
    });
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>(
          'button[aria-label="保存分类名称"]',
        )
        ?.click();
    });

    expect(renameCategory).toHaveBeenCalledWith("cat-1", "CSS 基础");

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>(
          'button[aria-label="删除分类 React"]',
        )
        ?.click();
    });
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>(
          'button[aria-label="确认删除分类 React"]',
        )
        ?.click();
    });

    expect(deleteCategory).toHaveBeenCalledWith("cat-2");
  });

  it("filters categories by name", async () => {
    await renderDialog();

    const search = document.querySelector<HTMLInputElement>(
      'input[aria-label="搜索分类"]',
    );

    await act(async () => {
      if (search) setInputValue(search, "React");
    });

    expect(document.body.textContent).toContain("React");
    expect(document.body.textContent).not.toContain("CSS 基础");
  });
});
