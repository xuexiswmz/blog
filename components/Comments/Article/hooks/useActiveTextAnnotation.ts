"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActiveTextAnnotation,
  TextAnnotation,
  TextAnnotationTooltipPosition,
} from "../../Comment/types";
import { findTextAnnotationAtOffset } from "../utils/findTextAnnotationAtOffset";
import { createTextAnnotationRange } from "../utils/textAnnotationRange";

/**
 * 点击位置允许在文字矩形上下额外偏移的距离。
 *
 * 画线通常位于文字底部，用户可能点击在线条上，
 * 而不是严格点击在浏览器计算的文字矩形中。
 */
const RANGE_CLICK_VERTICAL_TOLERANCE = 2;

/**
 * Tooltip 中心点距离视口左右边缘的最小距离。
 *
 * Tooltip 使用 `-translate-x-1/2`，position.x 对应的是 Tooltip 中心。
 * 如果中心点过于靠近屏幕边缘，Tooltip 会有一部分跑出屏幕。
 */
const TOOLTIP_ANCHOR_EDGE_GUARD = 72;

/**
 * 文字上方至少有这么多空间时，Tooltip 才放在文字上方。
 *
 * 这个值包含 Tooltip 大致高度以及与文字之间的间隔。
 */
const TOOLTIP_MIN_SPACE_ABOVE = 48;

/**
 * Tooltip 与被点击文字之间的垂直间距。
 */
const TOOLTIP_VERTICAL_GAP = 8;

/**
 * 浏览器根据屏幕坐标计算出来的光标位置。
 *
 * node：
 * 点击位置对应的 DOM 节点，通常是 Text 文本节点。
 *
 * offset：
 * 点击位置位于该节点中的字符偏移。
 */
type CaretPoint = {
  node: Node;
  offset: number;
};

/**
 * 不同浏览器提供的坐标转光标 API 不完全一致：
 *
 * - caretPositionFromPoint：标准 API
 * - caretRangeFromPoint：WebKit 兼容 API
 *
 * 使用可选字段是因为部分浏览器可能只支持其中一种。
 */
type DocumentWithCaretApis = Document & {
  caretPositionFromPoint?: (
    x: number,
    y: number,
  ) => {
    offsetNode: Node;
    offset: number;
  } | null;

  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

/**
 * Hook 内部保存的激活状态。
 *
 * 这里只保存 annotationId，而不是完整 annotation。
 * 这样修改画线后，可以始终从最新的 annotations 中读取数据。
 */
type ActiveTextAnnotationTarget = {
  annotationId: string;
  position: TextAnnotationTooltipPosition;
};

/**
 * 根据点击的视口坐标，找到对应的 DOM 节点和节点内字符偏移。
 */
function getCaretPoint(x: number, y: number): CaretPoint | null {
  const caretDocument = document as DocumentWithCaretApis;

  /**
   * 优先使用标准的 caretPositionFromPoint。
   */
  const caretPosition = caretDocument.caretPositionFromPoint?.(x, y);

  if (caretPosition) {
    return {
      node: caretPosition.offsetNode,
      offset: caretPosition.offset,
    };
  }

  /**
   * 如果当前浏览器不支持标准 API，
   * 再尝试 WebKit 的 caretRangeFromPoint。
   */
  const caretRange = caretDocument.caretRangeFromPoint?.(x, y);

  if (!caretRange) {
    return null;
  }

  return {
    node: caretRange.startContainer,
    offset: caretRange.startOffset,
  };
}

/**
 * 把文本节点内部的 offset，转换成整个段落内的绝对字符偏移。
 *
 * 例如段落 DOM 为：
 *
 * <p>
 *   这是
 *   <strong>测试</strong>
 *   文字
 * </p>
 *
 * 点击“测”时，浏览器返回的是 <strong> 内部文本节点的 offset。
 * 但画线数据保存的是相对于整个段落的 offset，
 * 所以需要从段落开头计算到点击位置的总字符数。
 */
function getParagraphOffset(paragraph: HTMLElement, point: CaretPoint) {
  /**
   * 点击返回的节点必须属于当前段落。
   * 否则不能使用该节点给当前段落创建 Range。
   */
  if (!paragraph.contains(point.node)) {
    return null;
  }

  try {
    const range = document.createRange();

    /**
     * 先让 Range 覆盖整个段落。
     */
    range.selectNodeContents(paragraph);

    /**
     * 再把 Range 的终点缩短到点击位置。
     *
     * 最终 Range 表示：
     * 段落开头 → 用户点击位置
     */
    range.setEnd(point.node, point.offset);

    /**
     * Range 文字长度就是点击位置在整个段落中的绝对 offset。
     */
    return range.toString().length;
  } catch {
    /**
     * 如果节点或 offset 已经失效，
     * Range.setEnd() 可能抛出异常。
     */
    return null;
  }
}

/**
 * 判断点击坐标是否确实位于画线 Range 的可视区域内。
 *
 * 不能只根据字符 offset 判断，因为浏览器在字符边界处
 * 可能返回左侧或者右侧字符的位置。
 */
function findClickedRangeRect(range: Range, x: number, y: number) {
  /**
   * 一条跨行的 Range 会产生多个 DOMRect：
   *
   * 第一行画线 -> 一个 rect
   * 第二行画线 -> 一个 rect
   *
   * 因此要遍历所有 rect，查找点击位置所在的那一行。
   */
  return (
    Array.from(range.getClientRects()).find(
      (rect) =>
        /**
         * 点击位置位于矩形左右边界之间。
         */
        rect.left <= x &&
        x <= rect.right &&
        /**
         * 点击位置位于矩形上下边界之间。
         *
         * 上下各放宽少量像素，
         * 允许用户点击文字底部的画线。
         */
        rect.top - RANGE_CLICK_VERTICAL_TOLERANCE <= y &&
        y <= rect.bottom + RANGE_CLICK_VERTICAL_TOLERANCE,
    ) ?? null
  );
}

/**
 * 根据点击位置和被点击文字的矩形，
 * 计算 Tooltip 在浏览器视口中的坐标。
 */
function getTooltipPosition(
  x: number,
  rangeRect: DOMRect,
): TextAnnotationTooltipPosition {
  /**
   * 先限制 Tooltip 中心点的最小 x。
   *
   * 如果用户点击位置小于 72，
   * 就把中心点设置为 72。
   */
  const minimumX = TOOLTIP_ANCHOR_EDGE_GUARD;

  /**
   * 限制 Tooltip 中心点的最大 x。
   *
   * 例如视口宽 390：
   * maximumX = 390 - 72 = 318
   */
  const maximumX = window.innerWidth - TOOLTIP_ANCHOR_EDGE_GUARD;

  /**
   * 把 x 限制在 minimumX 和 maximumX 之间。
   *
   * 等价于：
   *
   * if (x < minimumX) return minimumX;
   * if (x > maximumX) return maximumX;
   * return x;
   */
  const tooltipX = Math.min(Math.max(x, minimumX), maximumX);

  /**
   * 判断画线文字上方有没有足够空间显示 Tooltip。
   *
   * rangeRect.top 是文字顶部到视口顶部的距离。
   */
  const hasEnoughSpaceAbove = rangeRect.top >= TOOLTIP_MIN_SPACE_ABOVE;

  if (hasEnoughSpaceAbove) {
    return {
      x: tooltipX,

      /**
       * Tooltip 放在文字上方，
       * 并保留 8px 间距。
       */
      y: rangeRect.top - TOOLTIP_VERTICAL_GAP,

      placement: "top",
    };
  }

  return {
    x: tooltipX,

    /**
     * 上方空间不足时放到文字下方，
     * 同样保留 8px 间距。
     */
    y: rangeRect.bottom + TOOLTIP_VERTICAL_GAP,

    placement: "bottom",
  };
}

/**
 * 把事件目标转换为 Element。
 *
 * MouseEvent.target 通常是 Element，
 * 但类型上也可能是普通 Node。
 */
function getTargetElement(target: EventTarget | null) {
  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Node) {
    return target.parentElement;
  }

  return null;
}

/**
 * 管理用户当前点击的文章画线。
 *
 * 主要职责：
 *
 * 1. 监听整篇文章的点击。
 * 2. 根据点击坐标计算段落字符 offset。
 * 3. 找出被点击的 TextAnnotation。
 * 4. 保存 Tooltip 位置。
 * 5. 点击其他地方或产生文字选区时关闭 Tooltip。
 */
export function useActiveTextAnnotation(annotations: TextAnnotation[]) {
  /**
   * 保存当前命中的画线 ID 和 Tooltip 位置。
   */
  const [activeTarget, setActiveTarget] =
    useState<ActiveTextAnnotationTarget | null>(null);

  /**
   * 统一关闭当前画线 Tooltip。
   *
   * useCallback 保持函数引用稳定，
   * 避免 useEffect 因函数引用变化重复绑定事件。
   */
  const closeActiveTextAnnotation = useCallback(() => {
    setActiveTarget(null);
  }, []);

  /**
   * 根据 annotationId 从最新 annotations 中读取完整画线。
   *
   * PATCH 修改画线后，annotations 会变化，
   * 这里就会返回更新后的颜色和线型。
   *
   * DELETE 删除画线后，该 ID 找不到，
   * 这里返回 null，Tooltip 自动消失。
   */
  const activeTextAnnotation = useMemo<ActiveTextAnnotation | null>(() => {
    if (!activeTarget) {
      return null;
    }

    const annotation = annotations.find(
      (item) => item.id === activeTarget.annotationId,
    );

    if (!annotation) {
      return null;
    }

    return {
      annotation,
      position: activeTarget.position,
    };
  }, [activeTarget, annotations]);

  useEffect(() => {
    /**
     * 处理页面点击。
     */
    function handleDocumentClick(event: MouseEvent) {
      const targetElement = getTargetElement(event.target);

      /**
       * 如果点击的是 Tooltip 自己，
       * 不要关闭或重新计算当前画线。
       */
      if (targetElement?.closest("[data-text-annotation-tooltip]")) {
        return;
      }

      const selection = window.getSelection();

      /**
       * 如果页面当前存在非折叠选区，
       * 说明用户是在拖动选中文字。
       *
       * 此时让选区 Tooltip 优先，
       * 关闭已有画线 Tooltip。
       */
      if (selection && !selection.isCollapsed) {
        closeActiveTextAnnotation();
        return;
      }

      /**
       * 找到点击位置所属的可评论段落。
       */
      const paragraph = targetElement?.closest<HTMLElement>(
        "[data-paragraph-id]",
      );

      const paragraphId = paragraph?.dataset.paragraphId;

      /**
       * 点击不在文章段落中，关闭 Tooltip。
       */
      if (!paragraph || !paragraphId) {
        closeActiveTextAnnotation();
        return;
      }

      /**
       * 根据鼠标坐标找到文字节点和节点内 offset。
       */
      const caretPoint = getCaretPoint(event.clientX, event.clientY);

      if (!caretPoint) {
        closeActiveTextAnnotation();
        return;
      }

      /**
       * 把节点内部 offset 换算成整个段落的 offset。
       */
      const paragraphOffset = getParagraphOffset(paragraph, caretPoint);

      if (paragraphOffset === null) {
        closeActiveTextAnnotation();
        return;
      }

      /**
       * 根据段落 ID 和字符 offset 找候选画线。
       */
      const annotation = findTextAnnotationAtOffset(
        annotations,
        paragraphId,
        paragraphOffset,
      );

      if (!annotation) {
        closeActiveTextAnnotation();
        return;
      }

      /**
       * 使用画线保存的 startOffset 和 endOffset，
       * 创建该画线在页面中的真实 DOM Range。
       */
      const range = createTextAnnotationRange(paragraph, annotation);

      /**
       * 再使用真实矩形确认用户真的点在画线文字上。
       */
      const clickedRangeRect = range
        ? findClickedRangeRect(range, event.clientX, event.clientY)
        : null;

      if (!clickedRangeRect) {
        closeActiveTextAnnotation();
        return;
      }

      /**
       * 点击命中画线：
       *
       * - 保存画线 ID
       * - 根据被点击行的矩形计算 Tooltip 位置
       */
      setActiveTarget({
        annotationId: annotation.id,

        position: getTooltipPosition(event.clientX, clickedRangeRect),
      });
    }

    /**
     * 用户产生非折叠文字选区时，
     * 关闭已有画线 Tooltip。
     */
    function handleSelectionChange() {
      const selection = window.getSelection();

      if (selection && !selection.isCollapsed) {
        closeActiveTextAnnotation();
      }
    }

    /**
     * document 级事件只绑定一次。
     */
    document.addEventListener("click", handleDocumentClick);

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("click", handleDocumentClick);

      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [annotations, closeActiveTextAnnotation]);

  return {
    activeTextAnnotation,
    closeActiveTextAnnotation,
  };
}
