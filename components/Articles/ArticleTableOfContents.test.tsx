// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ArticleTableOfContents from "./ArticleTableOfContents";

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("ArticleTableOfContents", () => {
  it("renders hierarchy and highlights only the active entry in blue", async () => {
    await act(async () => {
      root.render(
        <ArticleTableOfContents
          items={[
            { id: "overview", label: "概览", level: 2 },
            { id: "detail", label: "细节", level: 3 },
          ]}
          activeId="detail"
          progress={35}
          onNavigate={() => undefined}
        />,
      );
    });

    const overview = container.querySelector<HTMLButtonElement>(
      'button[data-toc-id="overview"]',
    );
    const detail = container.querySelector<HTMLButtonElement>(
      'button[data-toc-id="detail"]',
    );
    expect(overview?.className).not.toContain("text-blue");
    expect(detail?.className).toContain("text-blue-600");
    expect(detail?.className).toContain("border-l-blue-500");
    expect(detail?.className).toContain("pl-6");
  });

  it("calls onNavigate with the selected heading id", async () => {
    const onNavigate = vi.fn();
    await act(async () => {
      root.render(
        <ArticleTableOfContents
          items={[{ id: "target", label: "目标", level: 2 }]}
          activeId="target"
          progress={60}
          onNavigate={onNavigate}
        />,
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('button[data-toc-id="target"]')
        ?.click();
    });
    expect(onNavigate).toHaveBeenCalledWith("target");
  });

  it("keeps the progress ring but hides navigation for an empty outline", async () => {
    await act(async () => {
      root.render(
        <ArticleTableOfContents
          items={[]}
          activeId={null}
          progress={10}
          onNavigate={() => undefined}
        />,
      );
    });

    expect(container.textContent).toContain("目录");
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(container.querySelector("nav")).toBeNull();
  });
});
