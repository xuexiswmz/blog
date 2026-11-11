// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveParagraphSelection } from "./readParagraphSelection";

function buildArticle() {
  const article = document.createElement("article");

  const firstWrapper = document.createElement("div");
  const first = document.createElement("p");
  first.dataset.paragraphId = "p-aaaaaaaaaaaa";
  first.textContent = "第一段文字";

  const secondWrapper = document.createElement("div");
  const second = document.createElement("p");
  second.dataset.paragraphId = "p-bbbbbbbbbbbb";
  second.textContent = "第二段文字";

  firstWrapper.appendChild(first);
  secondWrapper.appendChild(second);
  article.append(firstWrapper, secondWrapper);
  document.body.appendChild(article);

  return { article, first, second };
}

function selectRange(startNode: Node, startOffset: number, endNode: Node, endOffset: number) {
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);

  const selection = window.getSelection();

  if (!selection) {
    throw new Error("浏览器没有提供 Selection");
  }

  selection.removeAllRanges();
  selection.addRange(range);

  return selection;
}

describe("resolveParagraphSelection", () => {
  beforeEach(() => {
    const rect = {
      x: 100,
      y: 200,
      width: 120,
      height: 24,
      top: 200,
      left: 100,
      right: 220,
      bottom: 224,
    } as DOMRect;

    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value: () => ({
        0: rect,
        length: 1,
        item: () => rect,
      }),
    });
  });

  afterEach(() => {
    document.body.replaceChildren();
    window.getSelection()?.removeAllRanges();
    delete (Range.prototype as unknown as { getClientRects?: unknown })
      .getClientRects;
  });

  it("读取同一个段落内的文字选区", () => {
    const { first } = buildArticle();
    const textNode = first.firstChild as Text;
    const selection = selectRange(textNode, 0, textNode, 4);

    expect(resolveParagraphSelection(selection)).toMatchObject({
      paragraphId: "p-aaaaaaaaaaaa",
      text: "第一段文",
      startOffset: 0,
      endOffset: 4,
    });
  });

  it("整段被选中且结束点落在下一段开头时，仍然收敛到起点段落", () => {
    const { first, second } = buildArticle();
    const textNode = first.firstChild as Text;

    // 三击选中整段时，浏览器会把 Range 的结束点放到下一段开头。
    const selection = selectRange(textNode, 0, second, 0);

    expect(resolveParagraphSelection(selection)).toMatchObject({
      paragraphId: "p-aaaaaaaaaaaa",
      text: "第一段文字",
      startOffset: 0,
      endOffset: 5,
    });
  });

  it("真正跨越多段并选中第二段文字时，不当作段落选区", () => {
    const { first, second } = buildArticle();
    const firstText = first.firstChild as Text;
    const secondText = second.firstChild as Text;

    const selection = selectRange(firstText, 0, secondText, 2);

    expect(resolveParagraphSelection(selection)).toBeNull();
  });

  it("只选中段落之间的空白字符时返回 null", () => {
    const { first, second } = buildArticle();
    const textNode = first.firstChild as Text;

    const selection = selectRange(
      textNode,
      textNode.data.length,
      second,
      0,
    );

    expect(resolveParagraphSelection(selection)).toBeNull();
  });

  it("选区不在可评论段落内时返回 null", () => {
    const { article } = buildArticle();
    const outside = document.createElement("span");
    outside.textContent = "正文之外";
    article.appendChild(outside);

    const selection = selectRange(outside.firstChild as Text, 0, outside.firstChild as Text, 2);

    expect(resolveParagraphSelection(selection)).toBeNull();
  });
});
