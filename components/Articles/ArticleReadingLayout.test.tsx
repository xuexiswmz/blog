// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ArticleNavigationGroup } from "@/lib/articleCategories/types";
import ArticleReadingLayout from "./ArticleReadingLayout";

const groups: ArticleNavigationGroup[] = [
  {
    id: "react",
    name: "React",
    position: 0,
    posts: [
      { slug: "current", title: "Current article", date: "", position: 0 },
    ],
  },
];

function rectangle(top: number, height: number): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    left: 0,
    right: 800,
    width: 800,
    height,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect;
}

let container: HTMLDivElement;
let root: Root;
let callbacks: Map<number, FrameRequestCallback>;
let nextFrame: number;
let cancelFrame: ReturnType<typeof vi.fn>;

async function flushFrames() {
  const queued = [...callbacks.values()];
  callbacks.clear();
  await act(async () => {
    queued.forEach((callback) => callback(0));
    await Promise.resolve();
  });
}

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  callbacks = new Map();
  nextFrame = 1;
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      const id = nextFrame++;
      callbacks.set(id, callback);
      return id;
    }),
  );
  cancelFrame = vi.fn((id: number) => callbacks.delete(id));
  vi.stubGlobal("cancelAnimationFrame", cancelFrame);
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({ matches: false }),
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("ArticleReadingLayout", () => {
  it("shows the three-column reader from the large breakpoint", () => {
    const markup = renderToStaticMarkup(
      <ArticleReadingLayout groups={groups} currentSlug="current">
        <h1>Article</h1>
      </ArticleReadingLayout>,
    );

    expect(markup).toContain("lg:grid");
    expect(markup).toContain("hidden lg:block");
    expect(markup).toContain("lg:hidden");
    expect(markup.match(/<details/g)).toHaveLength(2);
    expect(markup).toContain("data-article-content");
  });

  it("collects headings and updates active section and article progress on scroll", async () => {
    await act(async () => {
      root.render(
        <main>
          <ArticleReadingLayout groups={groups} currentSlug="current">
            <h1>Article</h1>
            <h2>First</h2>
            <h2>Second</h2>
          </ArticleReadingLayout>
        </main>,
      );
    });

    const main = container.querySelector("main")!;
    const article = container.querySelector<HTMLElement>(
      "[data-article-content]",
    )!;
    const headings = article.querySelectorAll<HTMLHeadingElement>("h2");
    Object.defineProperty(main, "clientHeight", {
      configurable: true,
      value: 400,
    });
    main.getBoundingClientRect = () => rectangle(50, 400);
    article.getBoundingClientRect = () => rectangle(50, 1400);
    headings[0].getBoundingClientRect = () => rectangle(100, 40);
    headings[1].getBoundingClientRect = () => rectangle(700, 40);
    headings[0].scrollIntoView = vi.fn();

    await flushFrames();
    expect(container.querySelectorAll('[data-toc-id="first"]')).toHaveLength(2);
    expect(
      container.querySelectorAll('[role="progressbar"][aria-valuenow="0"]'),
    ).toHaveLength(2);

    article.getBoundingClientRect = () => rectangle(-500, 1400);
    headings[0].getBoundingClientRect = () => rectangle(-100, 40);
    headings[1].getBoundingClientRect = () => rectangle(60, 40);
    main.dispatchEvent(new Event("scroll"));
    await flushFrames();

    expect(
      container.querySelectorAll('[role="progressbar"][aria-valuenow="55"]'),
    ).toHaveLength(2);
    expect(
      container.querySelectorAll(
        '[data-toc-id="second"][aria-current="location"]',
      ),
    ).toHaveLength(2);

    vi.mocked(matchMedia).mockReturnValue({
      matches: true,
    } as MediaQueryList);
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-toc-id="first"]')
        ?.click();
    });
    expect(headings[0].scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "start",
    });
  });

  it("cancels queued measurement work when unmounted", async () => {
    await act(async () => {
      root.render(
        <main>
          <ArticleReadingLayout groups={groups} currentSlug="current">
            <h2>First</h2>
          </ArticleReadingLayout>
        </main>,
      );
    });
    expect(callbacks.size).toBeGreaterThan(0);

    await act(async () => root.unmount());
    expect(cancelFrame).toHaveBeenCalled();
    root = createRoot(container);
  });
});
