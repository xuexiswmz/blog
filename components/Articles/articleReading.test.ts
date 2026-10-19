// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  calculateReadingProgress,
  collectArticleHeadings,
  findActiveHeading,
  type TableOfContentsItem,
} from "./articleReading";

describe("collectArticleHeadings", () => {
  it("collects h2 and h3 labels and assigns stable unique ids", () => {
    const article = document.createElement("article");
    article.innerHTML = `
      <h1>Ignored title</h1>
      <h2>Hello <code>Code</code></h2>
      <h3>中文 标题</h3>
      <h2>!!!</h2>
      <h2>Hello Code</h2>
      <h2 id="custom-anchor">Author anchor</h2>
      <h3 id="custom-anchor">Duplicate anchor</h3>
      <h4>Ignored detail</h4>
    `;

    expect(collectArticleHeadings(article)).toEqual([
      { id: "hello-code", label: "Hello Code", level: 2 },
      { id: "中文-标题", label: "中文 标题", level: 3 },
      { id: "section", label: "!!!", level: 2 },
      { id: "hello-code-2", label: "Hello Code", level: 2 },
      { id: "custom-anchor", label: "Author anchor", level: 2 },
      { id: "custom-anchor-2", label: "Duplicate anchor", level: 3 },
    ]);
    expect(article.querySelectorAll("h2, h3")[3].id).toBe("hello-code-2");
    expect(article.querySelectorAll("h2, h3")[5].id).toBe("custom-anchor-2");
  });

  it("reserves later author-provided ids before generating earlier ids", () => {
    const article = document.createElement("article");
    article.innerHTML = `
      <h2>Existing anchor</h2>
      <h2 id="existing-anchor">Author anchor</h2>
    `;

    expect(collectArticleHeadings(article)).toEqual([
      { id: "existing-anchor-2", label: "Existing anchor", level: 2 },
      { id: "existing-anchor", label: "Author anchor", level: 2 },
    ]);
  });

  it("does not let duplicate explicit ids consume another explicit raw id", () => {
    const article = document.createElement("article");
    article.innerHTML = `
      <h2 id="foo">First foo</h2>
      <h2 id="foo">Duplicate foo</h2>
      <h2 id="foo-2">Authored foo two</h2>
    `;

    expect(collectArticleHeadings(article).map(({ id }) => id)).toEqual([
      "foo",
      "foo-3",
      "foo-2",
    ]);
  });
});

describe("findActiveHeading", () => {
  const items: TableOfContentsItem[] = [
    { id: "one", label: "One", level: 2 },
    { id: "two", label: "Two", level: 2 },
    { id: "three", label: "Three", level: 3 },
  ];
  const tops = new Map([
    ["one", 120],
    ["two", 300],
    ["three", 500],
  ]);

  it("uses the first heading before any heading crosses the activation edge", () => {
    expect(findActiveHeading(items, tops, 50)).toBe("one");
  });

  it("uses the last heading at or above the activation edge", () => {
    expect(findActiveHeading(items, tops, 300)).toBe("two");
    expect(findActiveHeading(items, tops, 800)).toBe("three");
  });

  it("returns null for an article without headings", () => {
    expect(findActiveHeading([], new Map(), 100)).toBeNull();
  });
});

describe("calculateReadingProgress", () => {
  it("reports top, middle, and bottom progress relative to the article", () => {
    expect(
      calculateReadingProgress({
        articleTop: 100,
        articleHeight: 1000,
        viewportTop: 100,
        viewportHeight: 400,
      }),
    ).toBe(0);
    expect(
      calculateReadingProgress({
        articleTop: -200,
        articleHeight: 1000,
        viewportTop: 100,
        viewportHeight: 400,
      }),
    ).toBe(50);
    expect(
      calculateReadingProgress({
        articleTop: -500,
        articleHeight: 1000,
        viewportTop: 100,
        viewportHeight: 400,
      }),
    ).toBe(100);
  });

  it("accounts for a scroll container whose top is below the window", () => {
    expect(
      calculateReadingProgress({
        articleTop: -220,
        articleHeight: 1000,
        viewportTop: 80,
        viewportHeight: 400,
      }),
    ).toBe(50);
  });

  it("clamps overscroll and handles short or zero-height articles", () => {
    const values = [
      calculateReadingProgress({
        articleTop: 500,
        articleHeight: 1000,
        viewportTop: 100,
        viewportHeight: 400,
      }),
      calculateReadingProgress({
        articleTop: -900,
        articleHeight: 1000,
        viewportTop: 100,
        viewportHeight: 400,
      }),
      calculateReadingProgress({
        articleTop: 100,
        articleHeight: 300,
        viewportTop: 100,
        viewportHeight: 500,
      }),
      calculateReadingProgress({
        articleTop: 120,
        articleHeight: 0,
        viewportTop: 100,
        viewportHeight: 500,
      }),
    ];

    expect(values).toEqual([0, 100, 100, 0]);
    expect(values.every(Number.isFinite)).toBe(true);
  });
});
