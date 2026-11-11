import type { ParagraphTextSelection } from "../../Comment/types";
import { createTextRange } from "./textAnnotationRange";

/**
 * 根据选区中的节点，寻找它所属的可评论段落。
 *
 * range.commonAncestorContainer 既可能是 Element，
 * 也可能是文本节点，因此不能直接调用 closest()。
 */
function findCommentableParagraph(node: Node) {
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest<HTMLElement>("[data-paragraph-id]") ?? null;
}

// 获取选区最后一行的位置
function getSelectionRect(range: Range) {
  const rects = range.getClientRects();
  return rects.item(rects.length - 1) ?? range.getBoundingClientRect();
}

// 计算 Tooltip 相对于浏览器视口的位置。
function getTooltipPosition(
  range: Range,
): ParagraphTextSelection["position"] {
  const rect = getSelectionRect(range);

  const x = Math.min(
    Math.max(rect.left + rect.width / 2, 72),
    window.innerWidth - 72,
  );

  const hasEnoughSpaceAbove = rect.top >= 48;

  return {
    x,
    y: hasEnoughSpaceAbove ? rect.top - 8 : rect.bottom + 8,
    placement: hasEnoughSpaceAbove ? ("top" as const) : ("bottom" as const),
  };
}

function getParagraphOffset(
  paragraph: HTMLElement,
  container: Node,
  offset: number,
) {
  const prefixRange = document.createRange();

  prefixRange.selectNodeContents(paragraph);
  prefixRange.setEnd(container, offset);

  return prefixRange.toString().length;
}

/**
 * 判断选区超出当前段落的部分是否只有空白字符。
 *
 * 三击选中整段时，浏览器通常会把 Range 的结束点放到
 * 下一段开头；此时选区看起来只覆盖当前段，但结束点已经
 * 不属于当前段落。只用空白字符连接时，仍然按当前段落处理。
 */
function hasOnlyWhitespaceAfterParagraph(range: Range, paragraph: HTMLElement) {
  const outsideRange = document.createRange();

  outsideRange.setStart(paragraph, paragraph.childNodes.length);

  try {
    outsideRange.setEnd(range.endContainer, range.endOffset);
  } catch {
    return false;
  }

  return outsideRange.toString().trim() === "";
}

/**
 * 把浏览器选区转换成段落评论需要的段落 ID、文字和字符偏移。
 *
 * 当选区从当前段落开始，并在下一段开头结束时（例如三击整段），
 * 把结束位置收敛到当前段落末尾，避免因为起点/终点段落不同而
 * 丢失整个选区。
 */
export function resolveParagraphSelection(
  selection: Selection | null,
): ParagraphTextSelection | null {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const paragraph = findCommentableParagraph(range.startContainer);
  const paragraphId = paragraph?.dataset.paragraphId;

  if (!paragraph || !paragraphId) {
    return null;
  }

  const paragraphLength = paragraph.textContent?.length ?? 0;
  const startOffset = getParagraphOffset(
    paragraph,
    range.startContainer,
    range.startOffset,
  );

  const endParagraph = findCommentableParagraph(range.endContainer);
  let endOffset: number;

  if (endParagraph === paragraph) {
    endOffset = getParagraphOffset(
      paragraph,
      range.endContainer,
      range.endOffset,
    );
  } else {
    if (!hasOnlyWhitespaceAfterParagraph(range, paragraph)) {
      return null;
    }

    endOffset = paragraphLength;
  }

  const normalizedStart = Math.min(Math.max(startOffset, 0), paragraphLength);
  const normalizedEnd = Math.min(
    Math.max(endOffset, normalizedStart),
    paragraphLength,
  );
  const text = (paragraph.textContent ?? "").slice(
    normalizedStart,
    normalizedEnd,
  );

  // 只选择空格或换行时，不显示添加段评入口。
  if (!text.trim()) {
    return null;
  }

  // 选区可能跨到下一段，用收敛后的范围计算 Tooltip 位置。
  const positionRange =
    createTextRange(paragraph, normalizedStart, normalizedEnd) ?? range;

  return {
    paragraphId,
    text,
    startOffset: normalizedStart,
    endOffset: normalizedEnd,
    position: getTooltipPosition(positionRange),
  };
}
