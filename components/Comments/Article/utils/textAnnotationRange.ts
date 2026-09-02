import { TextAnnotation } from "../../Comment/types";

function findTextPoint(root: HTMLElement, targetOffset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let remainingOffset = targetOffset;
  let currentNode = walker.nextNode();

  while (currentNode) {
    const textNode = currentNode as Text;
    const textLength = textNode.data.length;

    if (remainingOffset <= textLength) {
      return {
        node: textNode,
        offset: remainingOffset,
      };
    }

    remainingOffset -= textLength;
    currentNode = walker.nextNode();
  }
  return null;
}

export function createTextAnnotationRange(
  paragraph: HTMLElement,
  annotation: TextAnnotation,
) {
  const start = findTextPoint(paragraph, annotation.startOffset);

  const end = findTextPoint(paragraph, annotation.endOffset);

  if (!start || !end) {
    return null;
  }

  const range = document.createRange();

  range.setStart(start.node, start.offset);

  range.setEnd(end.node, end.offset);

  if (range.toString() !== annotation.selectedText) {
    return null;
  }

  return range;
}
