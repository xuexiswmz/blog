// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useParagraphTextSelection } from "./useParagraphTextSelection";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Harness() {
  const selection = useParagraphTextSelection();

  return (
    <article>
      <p data-paragraph-id="p-a1b2c3d4e5f6">这是没有段评的段落</p>
      <output data-testid="selection">
        {selection
          ? `${selection.paragraphId}|${selection.text}|${selection.startOffset}|${selection.endOffset}`
          : "none"}
      </output>
    </article>
  );
}

function readSelection(container: HTMLElement) {
  return container.querySelector("output")?.textContent ?? "";
}

function selectParagraphText(container: HTMLElement) {
  const paragraph = container.querySelector("p");
  const textNode = paragraph?.firstChild;

  if (!paragraph || !textNode) {
    throw new Error("找不到测试段落");
  }

  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, textNode.textContent?.length ?? 0);

  const selection = window.getSelection();

  if (!selection) {
    throw new Error("浏览器没有提供 Selection");
  }

  selection.removeAllRanges();
  selection.addRange(range);
}

describe("useParagraphTextSelection", () => {
  let container: HTMLElement;
  let root: Root;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    root = createRoot(container);

    // jsdom 没有实现 Range 的布局信息，给选区补一个可视矩形。
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

    await act(async () => {
      root.render(<Harness />);
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });

    container.remove();
    window.getSelection()?.removeAllRanges();
    delete (Range.prototype as unknown as { getClientRects?: unknown })
      .getClientRects;
  });

  it("读取整段文字选区", () => {
    act(() => {
      selectParagraphText(container);
      document.dispatchEvent(new Event("selectionchange"));
    });

    expect(readSelection(container)).toBe(
      "p-a1b2c3d4e5f6|这是没有段评的段落|0|9",
    );
  });
});
