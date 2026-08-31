# Existing Text Annotation Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 点击已有文章画线时显示操作 Tooltip，让管理员能够修改整条画线的颜色、线型或删除画线，并让没有段评的段落继续提供添加段评入口。

**Architecture:** 保留 CSS Custom Highlight 渲染方式，用点击坐标换算段落字符偏移并匹配 annotation。API 和 `useTextAnnotations` 接通现有 PATCH/DELETE Route，Provider 管理当前激活画线，段落组件根据段评数量与管理员权限组合 Tooltip。

**Tech Stack:** Next.js 16、React 19、TypeScript、CSS Custom Highlight API、Vitest、Tailwind CSS。

---

## 文件结构

新增文件：

```text
components/Comments/Article/
├── components/
│   ├── ExistingTextAnnotationTooltip.tsx
│   └── TextAnnotationControls.tsx
├── hooks/
│   └── useActiveTextAnnotation.ts
└── utils/
    ├── findTextAnnotationAtOffset.test.ts
    ├── findTextAnnotationAtOffset.ts
    ├── textAnnotationCollection.test.ts
    ├── textAnnotationCollection.ts
    ├── textAnnotationRange.ts
    ├── textAnnotationTooltipActions.test.ts
    └── textAnnotationTooltipActions.ts
```

修改文件：

```text
components/Comments/Comment/types.ts
components/Comments/Article/api/textAnnotationsApi.test.ts
components/Comments/Article/api/textAnnotationsApi.ts
components/Comments/Article/hooks/useTextAnnotations.ts
components/Comments/Article/hooks/useTextAnnotationHighlights.ts
components/Comments/Article/components/SelectionCommentTooltip.tsx
components/Comments/Article/components/CommentableParagraph.tsx
components/Comments/Article/context/ArticleCommentsContext.ts
components/Comments/Article/providers/ArticleCommentsProvider.tsx
```

## Task 1：接通前端 PATCH 和 DELETE API

**Files:**

- Modify: `components/Comments/Comment/types.ts`
- Modify: `components/Comments/Article/api/textAnnotationsApi.test.ts`
- Modify: `components/Comments/Article/api/textAnnotationsApi.ts`

- [ ] **Step 1：先在 API 测试文件末尾添加失败测试**

在 `components/Comments/Article/api/textAnnotationsApi.test.ts` 的 import 中加入：

```ts
import {
  createTextAnnotation,
  deleteTextAnnotation,
  requestTextAnnotations,
  updateTextAnnotation,
} from "./textAnnotationsApi";
```

删除原来的同名 import，然后在文件末尾添加：

```ts
describe("updateTextAnnotation", () => {
  it("修改指定画线的颜色和线型", async () => {
    const updatedAnnotation: TextAnnotation = {
      ...annotation,
      lineStyle: "wavy",
      color: "rose",
    };

    fetchMock.mockResolvedValue(
      Response.json({
        annotation: updatedAnnotation,
      }),
    );

    const result = await updateTextAnnotation(
      "css-centering",
      "annotation/id",
      {
        lineStyle: "wavy",
        color: "rose",
      },
    );

    expect(result).toEqual(updatedAnnotation);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts/css-centering/text-annotations/annotation%2Fid",
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          lineStyle: "wavy",
          color: "rose",
        }),
      },
    );
  });

  it("服务端修改失败时抛出接口消息", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          message: "修改文章画线失败",
        },
        {
          status: 500,
        },
      ),
    );

    await expect(
      updateTextAnnotation("css-centering", annotation.id, {
        lineStyle: "solid",
        color: "sky",
      }),
    ).rejects.toThrow("修改文章画线失败");
  });
});

describe("deleteTextAnnotation", () => {
  it("删除指定画线", async () => {
    fetchMock.mockResolvedValue(
      Response.json({
        message: "画线已删除",
      }),
    );

    await deleteTextAnnotation("css-centering", "annotation/id");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts/css-centering/text-annotations/annotation%2Fid",
      {
        method: "DELETE",
      },
    );
  });

  it("服务端删除失败时抛出接口消息", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          message: "删除文章画线失败",
        },
        {
          status: 500,
        },
      ),
    );

    await expect(
      deleteTextAnnotation("css-centering", annotation.id),
    ).rejects.toThrow("删除文章画线失败");
  });
});
```

- [ ] **Step 2：运行测试，确认新测试失败**

```bash
pnpm exec vitest run components/Comments/Article/api/textAnnotationsApi.test.ts
```

预期：FAIL，提示 `updateTextAnnotation` 或 `deleteTextAnnotation` 没有导出。

- [ ] **Step 3：在共享类型文件增加更新与删除响应类型**

在 `components/Comments/Comment/types.ts` 的 `CreateTextAnnotationResponse` 后添加：

```ts
export type UpdateTextAnnotation = Pick<
  TextAnnotation,
  "lineStyle" | "color"
>;

export type UpdateTextAnnotationResponse = {
  annotation: TextAnnotation;
  message?: string;
};

export type DeleteTextAnnotationResponse = {
  message?: string;
};

export type TextAnnotationTooltipPosition =
  ParagraphTextSelection["position"];

export type ActiveTextAnnotation = {
  annotation: TextAnnotation;
  position: TextAnnotationTooltipPosition;
};
```

- [ ] **Step 4：把 API 文件替换成下面的完整代码**

`components/Comments/Article/api/textAnnotationsApi.ts`：

```ts
import type {
  CreateTextAnnotationResponse,
  DeleteTextAnnotationResponse,
  NewTextAnnotation,
  TextAnnotation,
  TextAnnotationsResponse,
  UpdateTextAnnotation,
  UpdateTextAnnotationResponse,
} from "../../Comment/types";

function getTextAnnotationsUrl(postSlug: string) {
  return `/api/posts/${encodeURIComponent(postSlug)}/text-annotations`;
}

function getTextAnnotationUrl(postSlug: string, annotationId: string) {
  return `${getTextAnnotationsUrl(postSlug)}/${encodeURIComponent(annotationId)}`;
}

export async function requestTextAnnotations(
  postSlug: string,
  signal?: AbortSignal,
): Promise<TextAnnotation[]> {
  const response = await fetch(getTextAnnotationsUrl(postSlug), {
    method: "GET",
    cache: "no-cache",
    signal,
  });

  const result = (await response.json()) as TextAnnotationsResponse;

  if (!response.ok) {
    throw new Error(result.message ?? "获取文章画线失败");
  }

  return result.annotations;
}

export async function createTextAnnotation(
  postSlug: string,
  input: NewTextAnnotation,
): Promise<CreateTextAnnotationResponse> {
  const response = await fetch(getTextAnnotationsUrl(postSlug), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const result = (await response.json()) as CreateTextAnnotationResponse;

  if (!response.ok) {
    throw new Error(result.message ?? "添加文章画线失败");
  }

  return result;
}

export async function updateTextAnnotation(
  postSlug: string,
  annotationId: string,
  input: UpdateTextAnnotation,
): Promise<TextAnnotation> {
  const response = await fetch(
    getTextAnnotationUrl(postSlug, annotationId),
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  const result = (await response.json()) as UpdateTextAnnotationResponse;

  if (!response.ok) {
    throw new Error(result.message ?? "修改文章画线失败");
  }

  return result.annotation;
}

export async function deleteTextAnnotation(
  postSlug: string,
  annotationId: string,
): Promise<void> {
  const response = await fetch(
    getTextAnnotationUrl(postSlug, annotationId),
    {
      method: "DELETE",
    },
  );

  const result = (await response.json()) as DeleteTextAnnotationResponse;

  if (!response.ok) {
    throw new Error(result.message ?? "删除文章画线失败");
  }
}
```

- [ ] **Step 5：运行 API 测试**

```bash
pnpm exec vitest run components/Comments/Article/api/textAnnotationsApi.test.ts
```

预期：全部 PASS。

- [ ] **Step 6：提交 API 改动**

```bash
git add components/Comments/Comment/types.ts components/Comments/Article/api/textAnnotationsApi.ts components/Comments/Article/api/textAnnotationsApi.test.ts
git commit -m "feat: 添加文章画线修改和删除请求"
```

## Task 2：用纯函数维护本地画线集合

**Files:**

- Create: `components/Comments/Article/utils/textAnnotationCollection.test.ts`
- Create: `components/Comments/Article/utils/textAnnotationCollection.ts`
- Modify: `components/Comments/Article/hooks/useTextAnnotations.ts`

- [ ] **Step 1：新建集合更新测试**

`components/Comments/Article/utils/textAnnotationCollection.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import type { TextAnnotation } from "../../Comment/types";
import {
  removeTextAnnotation,
  replaceTextAnnotation,
} from "./textAnnotationCollection";

const firstAnnotation: TextAnnotation = {
  id: "first",
  postSlug: "css-centering",
  paragraphId: "p-one",
  startOffset: 0,
  endOffset: 4,
  selectedText: "第一段",
  lineStyle: "solid",
  color: "amber",
  createdAt: "2026-08-31T00:00:00.000Z",
};

const secondAnnotation: TextAnnotation = {
  ...firstAnnotation,
  id: "second",
  startOffset: 10,
  endOffset: 14,
  selectedText: "第二段",
  color: "sky",
};

describe("replaceTextAnnotation", () => {
  it("只替换相同ID的画线", () => {
    const updatedAnnotation: TextAnnotation = {
      ...firstAnnotation,
      lineStyle: "wavy",
      color: "rose",
    };

    expect(
      replaceTextAnnotation(
        [firstAnnotation, secondAnnotation],
        updatedAnnotation,
      ),
    ).toEqual([updatedAnnotation, secondAnnotation]);
  });
});

describe("removeTextAnnotation", () => {
  it("只删除指定ID的画线", () => {
    expect(
      removeTextAnnotation(
        [firstAnnotation, secondAnnotation],
        firstAnnotation.id,
      ),
    ).toEqual([secondAnnotation]);
  });
});
```

- [ ] **Step 2：运行测试，确认模块不存在**

```bash
pnpm exec vitest run components/Comments/Article/utils/textAnnotationCollection.test.ts
```

预期：FAIL，提示无法找到 `textAnnotationCollection`。

- [ ] **Step 3：新建集合更新实现**

`components/Comments/Article/utils/textAnnotationCollection.ts`：

```ts
import type { TextAnnotation } from "../../Comment/types";

export function replaceTextAnnotation(
  annotations: TextAnnotation[],
  updatedAnnotation: TextAnnotation,
) {
  return annotations.map((annotation) =>
    annotation.id === updatedAnnotation.id ? updatedAnnotation : annotation,
  );
}

export function removeTextAnnotation(
  annotations: TextAnnotation[],
  annotationId: string,
) {
  return annotations.filter((annotation) => annotation.id !== annotationId);
}
```

- [ ] **Step 4：运行集合测试**

```bash
pnpm exec vitest run components/Comments/Article/utils/textAnnotationCollection.test.ts
```

预期：2 个测试全部 PASS。

- [ ] **Step 5：把状态 Hook 替换成下面的完整代码**

`components/Comments/Article/hooks/useTextAnnotations.ts`：

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  NewTextAnnotation,
  TextAnnotation,
  UpdateTextAnnotation,
} from "../../Comment/types";
import {
  createTextAnnotation,
  deleteTextAnnotation as deleteTextAnnotationRequest,
  requestTextAnnotations,
  updateTextAnnotation as updateTextAnnotationRequest,
} from "../api/textAnnotationsApi";
import { buildTextAnnotationInput } from "../utils/buildTextAnnotationInput";
import {
  removeTextAnnotation,
  replaceTextAnnotation,
} from "../utils/textAnnotationCollection";

function sortAnnotations(annotations: TextAnnotation[]) {
  return [...annotations].sort((left, right) => {
    if (left.paragraphId !== right.paragraphId) {
      return left.paragraphId.localeCompare(right.paragraphId);
    }

    return left.startOffset - right.startOffset;
  });
}

export function useTextAnnotations(postSlug: string) {
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const annotationsRef = useRef<TextAnnotation[]>([]);

  const replaceAnnotations = useCallback(
    (nextAnnotations: TextAnnotation[]) => {
      const sortedAnnotations = sortAnnotations(nextAnnotations);

      annotationsRef.current = sortedAnnotations;
      setAnnotations(sortedAnnotations);
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnnotations() {
      try {
        const loadedAnnotations = await requestTextAnnotations(
          postSlug,
          controller.signal,
        );

        replaceAnnotations(loadedAnnotations);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("获取文章画线失败", error);
        toast.error(
          error instanceof Error ? error.message : "获取文章画线失败",
        );
      }
    }

    void loadAnnotations();

    return () => {
      controller.abort();
    };
  }, [postSlug, replaceAnnotations]);

  const addTextAnnotation = useCallback(
    async (input: NewTextAnnotation) => {
      const paragraph = document.querySelector<HTMLElement>(
        `[data-paragraph-id="${CSS.escape(input.paragraphId)}"]`,
      );

      if (!paragraph) {
        throw new Error("找不到需要画线的段落");
      }

      const requestInput = buildTextAnnotationInput(
        annotationsRef.current,
        input,
        paragraph.textContent ?? "",
      );

      const result = await createTextAnnotation(postSlug, requestInput);
      const replacedIds = new Set(result.replacedIds);

      replaceAnnotations([
        ...annotationsRef.current.filter(
          (annotation) => !replacedIds.has(annotation.id),
        ),
        result.annotation,
      ]);
    },
    [postSlug, replaceAnnotations],
  );

  const updateTextAnnotation = useCallback(
    async (annotationId: string, input: UpdateTextAnnotation) => {
      const updatedAnnotation = await updateTextAnnotationRequest(
        postSlug,
        annotationId,
        input,
      );

      replaceAnnotations(
        replaceTextAnnotation(
          annotationsRef.current,
          updatedAnnotation,
        ),
      );
    },
    [postSlug, replaceAnnotations],
  );

  const deleteTextAnnotation = useCallback(
    async (annotationId: string) => {
      await deleteTextAnnotationRequest(postSlug, annotationId);

      replaceAnnotations(
        removeTextAnnotation(annotationsRef.current, annotationId),
      );
    },
    [postSlug, replaceAnnotations],
  );

  return {
    annotations,
    addTextAnnotation,
    updateTextAnnotation,
    deleteTextAnnotation,
  };
}
```

- [ ] **Step 6：运行相关测试和类型检查**

```bash
pnpm exec vitest run components/Comments/Article/api/textAnnotationsApi.test.ts components/Comments/Article/utils/textAnnotationCollection.test.ts
pnpm exec tsc --noEmit
```

预期：测试全部 PASS，TypeScript 无错误。

- [ ] **Step 7：提交状态管理改动**

```bash
git add components/Comments/Article/hooks/useTextAnnotations.ts components/Comments/Article/utils/textAnnotationCollection.ts components/Comments/Article/utils/textAnnotationCollection.test.ts
git commit -m "feat: 更新文章画线本地状态"
```

## Task 3：识别点击的是哪一条画线

**Files:**

- Create: `components/Comments/Article/utils/findTextAnnotationAtOffset.test.ts`
- Create: `components/Comments/Article/utils/findTextAnnotationAtOffset.ts`
- Create: `components/Comments/Article/utils/textAnnotationRange.ts`
- Create: `components/Comments/Article/hooks/useActiveTextAnnotation.ts`
- Modify: `components/Comments/Article/hooks/useTextAnnotationHighlights.ts`

- [ ] **Step 1：先写字符偏移匹配测试**

`components/Comments/Article/utils/findTextAnnotationAtOffset.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import type { TextAnnotation } from "../../Comment/types";
import { findTextAnnotationAtOffset } from "./findTextAnnotationAtOffset";

const annotations: TextAnnotation[] = [
  {
    id: "other-paragraph",
    postSlug: "css-centering",
    paragraphId: "p-two",
    startOffset: 0,
    endOffset: 4,
    selectedText: "其他段",
    lineStyle: "double",
    color: "rose",
    createdAt: "2026-08-31T00:00:00.000Z",
  },
  {
    id: "first",
    postSlug: "css-centering",
    paragraphId: "p-one",
    startOffset: 0,
    endOffset: 4,
    selectedText: "第一段",
    lineStyle: "solid",
    color: "amber",
    createdAt: "2026-08-31T00:00:00.000Z",
  },
  {
    id: "second",
    postSlug: "css-centering",
    paragraphId: "p-one",
    startOffset: 5,
    endOffset: 9,
    selectedText: "第二段",
    lineStyle: "wavy",
    color: "sky",
    createdAt: "2026-08-31T00:00:00.000Z",
  },
];

describe("findTextAnnotationAtOffset", () => {
  it("偏移位于画线范围内时返回对应画线", () => {
    expect(findTextAnnotationAtOffset(annotations, "p-one", 2)?.id).toBe(
      "first",
    );
  });

  it("偏移没有落在画线范围内时返回null", () => {
    expect(findTextAnnotationAtOffset(annotations, "p-one", 20)).toBeNull();
  });

  it("不会命中其他段落的画线", () => {
    expect(findTextAnnotationAtOffset(annotations, "p-one", 1)?.id).toBe(
      "first",
    );
  });

  it("字符边界只命中相邻画线中的一条", () => {
    expect(findTextAnnotationAtOffset(annotations, "p-one", 4)?.id).toBe(
      "first",
    );
    expect(findTextAnnotationAtOffset(annotations, "p-one", 5)?.id).toBe(
      "second",
    );
  });
});
```

- [ ] **Step 2：运行测试，确认模块不存在**

```bash
pnpm exec vitest run components/Comments/Article/utils/findTextAnnotationAtOffset.test.ts
```

预期：FAIL，提示无法找到 `findTextAnnotationAtOffset`。

- [ ] **Step 3：实现纯匹配函数**

`components/Comments/Article/utils/findTextAnnotationAtOffset.ts`：

```ts
import type { TextAnnotation } from "../../Comment/types";

export function findTextAnnotationAtOffset(
  annotations: TextAnnotation[],
  paragraphId: string,
  offset: number,
) {
  return (
    annotations.find(
      (annotation) =>
        annotation.paragraphId === paragraphId &&
        annotation.startOffset <= offset &&
        offset <= annotation.endOffset,
    ) ?? null
  );
}
```

- [ ] **Step 4：运行匹配测试**

```bash
pnpm exec vitest run components/Comments/Article/utils/findTextAnnotationAtOffset.test.ts
```

预期：4 个测试全部 PASS。

- [ ] **Step 5：抽出画线 Range 创建工具**

新建 `components/Comments/Article/utils/textAnnotationRange.ts`：

```ts
import type { TextAnnotation } from "../../Comment/types";

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
```

- [ ] **Step 6：把高亮 Hook 替换成复用 Range 工具的版本**

`components/Comments/Article/hooks/useTextAnnotationHighlights.ts`：

```ts
"use client";

import { useEffect } from "react";
import type { TextAnnotation, TextAnnotationColor } from "../../Comment/types";
import { createTextAnnotationRange } from "../utils/textAnnotationRange";

const COLORS: TextAnnotationColor[] = [
  "amber",
  "rose",
  "sky",
  "emerald",
  "violet",
];

const HIGHLIGHT_NAMES = COLORS.flatMap((color) => [
  `text-annotation-solid-${color}`,
  `text-annotation-double-inner-${color}`,
  `text-annotation-double-outer-${color}`,
  `text-annotation-wavy-${color}`,
]);

function getAnnotationHighlightNames(annotation: TextAnnotation) {
  if (annotation.lineStyle === "double") {
    return [
      `text-annotation-double-inner-${annotation.color}`,
      `text-annotation-double-outer-${annotation.color}`,
    ];
  }

  return [`text-annotation-${annotation.lineStyle}-${annotation.color}`];
}

export function useTextAnnotationHighlights(annotations: TextAnnotation[]) {
  useEffect(() => {
    if (!("highlights" in CSS) || typeof Highlight === "undefined") {
      return;
    }

    for (const highlightName of HIGHLIGHT_NAMES) {
      CSS.highlights.delete(highlightName);
    }

    const rangesByHighlight = new Map<string, Range[]>();

    for (const annotation of annotations) {
      const paragraph = document.querySelector<HTMLElement>(
        `[data-paragraph-id="${CSS.escape(annotation.paragraphId)}"]`,
      );

      if (!paragraph) {
        continue;
      }

      const range = createTextAnnotationRange(paragraph, annotation);

      if (!range) {
        continue;
      }

      const highlightNames = getAnnotationHighlightNames(annotation);

      for (const highlightName of highlightNames) {
        const ranges = rangesByHighlight.get(highlightName) ?? [];

        ranges.push(range.cloneRange());
        rangesByHighlight.set(highlightName, ranges);
      }
    }

    for (const [highlightName, ranges] of rangesByHighlight) {
      CSS.highlights.set(highlightName, new Highlight(...ranges));
    }

    return () => {
      for (const highlightName of HIGHLIGHT_NAMES) {
        CSS.highlights.delete(highlightName);
      }
    };
  }, [annotations]);
}
```

- [ ] **Step 7：新增点击管理 Hook**

`components/Comments/Article/hooks/useActiveTextAnnotation.ts`：

```ts
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActiveTextAnnotation,
  TextAnnotation,
  TextAnnotationTooltipPosition,
} from "../../Comment/types";
import { findTextAnnotationAtOffset } from "../utils/findTextAnnotationAtOffset";
import { createTextAnnotationRange } from "../utils/textAnnotationRange";

type CaretPoint = {
  node: Node;
  offset: number;
};

type DocumentWithCaretApis = Document & {
  caretPositionFromPoint?: (
    x: number,
    y: number,
  ) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

type ActiveTextAnnotationTarget = {
  annotationId: string;
  position: TextAnnotationTooltipPosition;
};

function getCaretPoint(x: number, y: number): CaretPoint | null {
  const caretDocument = document as DocumentWithCaretApis;
  const caretPosition = caretDocument.caretPositionFromPoint?.(x, y);

  if (caretPosition) {
    return {
      node: caretPosition.offsetNode,
      offset: caretPosition.offset,
    };
  }

  const caretRange = caretDocument.caretRangeFromPoint?.(x, y);

  if (!caretRange) {
    return null;
  }

  return {
    node: caretRange.startContainer,
    offset: caretRange.startOffset,
  };
}

function getParagraphOffset(
  paragraph: HTMLElement,
  point: CaretPoint,
) {
  if (!paragraph.contains(point.node)) {
    return null;
  }

  try {
    const range = document.createRange();

    range.selectNodeContents(paragraph);
    range.setEnd(point.node, point.offset);

    return range.toString().length;
  } catch {
    return null;
  }
}

function findClickedRangeRect(range: Range, x: number, y: number) {
  const verticalPadding = 2;

  return (
    Array.from(range.getClientRects()).find(
      (rect) =>
        rect.left <= x &&
        x <= rect.right &&
        rect.top - verticalPadding <= y &&
        y <= rect.bottom + verticalPadding,
    ) ?? null
  );
}

function getTooltipPosition(
  x: number,
  rangeRect: DOMRect,
): TextAnnotationTooltipPosition {
  const tooltipX = Math.min(
    Math.max(x, 72),
    window.innerWidth - 72,
  );
  const hasEnoughSpaceAbove = rangeRect.top >= 48;

  return {
    x: tooltipX,
    y: hasEnoughSpaceAbove ? rangeRect.top - 8 : rangeRect.bottom + 8,
    placement: hasEnoughSpaceAbove ? "top" : "bottom",
  };
}

function getTargetElement(target: EventTarget | null) {
  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Node) {
    return target.parentElement;
  }

  return null;
}

export function useActiveTextAnnotation(annotations: TextAnnotation[]) {
  const [activeTarget, setActiveTarget] =
    useState<ActiveTextAnnotationTarget | null>(null);

  const closeActiveTextAnnotation = useCallback(() => {
    setActiveTarget(null);
  }, []);

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
    function handleDocumentClick(event: MouseEvent) {
      const targetElement = getTargetElement(event.target);

      if (targetElement?.closest("[data-text-annotation-tooltip]")) {
        return;
      }

      const selection = window.getSelection();

      if (selection && !selection.isCollapsed) {
        closeActiveTextAnnotation();
        return;
      }

      const paragraph = targetElement?.closest<HTMLElement>(
        "[data-paragraph-id]",
      );
      const paragraphId = paragraph?.dataset.paragraphId;

      if (!paragraph || !paragraphId) {
        closeActiveTextAnnotation();
        return;
      }

      const caretPoint = getCaretPoint(event.clientX, event.clientY);

      if (!caretPoint) {
        closeActiveTextAnnotation();
        return;
      }

      const offset = getParagraphOffset(paragraph, caretPoint);

      if (offset === null) {
        closeActiveTextAnnotation();
        return;
      }

      const annotation = findTextAnnotationAtOffset(
        annotations,
        paragraphId,
        offset,
      );

      if (!annotation) {
        closeActiveTextAnnotation();
        return;
      }

      const range = createTextAnnotationRange(paragraph, annotation);
      const rangeRect = range
        ? findClickedRangeRect(range, event.clientX, event.clientY)
        : null;

      if (!rangeRect) {
        closeActiveTextAnnotation();
        return;
      }

      setActiveTarget({
        annotationId: annotation.id,
        position: getTooltipPosition(event.clientX, rangeRect),
      });
    }

    function handleSelectionChange() {
      const selection = window.getSelection();

      if (selection && !selection.isCollapsed) {
        closeActiveTextAnnotation();
      }
    }

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
```

- [ ] **Step 8：运行测试、TypeScript 和 ESLint**

```bash
pnpm exec vitest run components/Comments/Article/utils/findTextAnnotationAtOffset.test.ts
pnpm exec tsc --noEmit
pnpm exec eslint components/Comments/Article/hooks/useActiveTextAnnotation.ts components/Comments/Article/hooks/useTextAnnotationHighlights.ts components/Comments/Article/utils/findTextAnnotationAtOffset.ts components/Comments/Article/utils/textAnnotationRange.ts
```

预期：全部通过。

- [ ] **Step 9：提交点击识别功能**

```bash
git add components/Comments/Article/hooks/useActiveTextAnnotation.ts components/Comments/Article/hooks/useTextAnnotationHighlights.ts components/Comments/Article/utils/findTextAnnotationAtOffset.ts components/Comments/Article/utils/findTextAnnotationAtOffset.test.ts components/Comments/Article/utils/textAnnotationRange.ts
git commit -m "feat: 识别点击的文章画线"
```

## Task 4：复用画线控件并增加已有画线 Tooltip

**Files:**

- Create: `components/Comments/Article/utils/textAnnotationTooltipActions.test.ts`
- Create: `components/Comments/Article/utils/textAnnotationTooltipActions.ts`
- Create: `components/Comments/Article/components/TextAnnotationControls.tsx`
- Create: `components/Comments/Article/components/ExistingTextAnnotationTooltip.tsx`
- Modify: `components/Comments/Article/components/SelectionCommentTooltip.tsx`

- [ ] **Step 1：写 Tooltip 权限矩阵测试**

`components/Comments/Article/utils/textAnnotationTooltipActions.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { getTextAnnotationTooltipActions } from "./textAnnotationTooltipActions";

describe("getTextAnnotationTooltipActions", () => {
  it("游客在没有段评时只看到添加段评", () => {
    expect(getTextAnnotationTooltipActions(0, false)).toEqual({
      showAddComment: true,
      showManageAnnotation: false,
      shouldRender: true,
    });
  });

  it("游客在已有段评时不显示Tooltip", () => {
    expect(getTextAnnotationTooltipActions(1, false)).toEqual({
      showAddComment: false,
      showManageAnnotation: false,
      shouldRender: false,
    });
  });

  it("管理员在没有段评时看到全部操作", () => {
    expect(getTextAnnotationTooltipActions(0, true)).toEqual({
      showAddComment: true,
      showManageAnnotation: true,
      shouldRender: true,
    });
  });

  it("管理员在已有段评时只看到画线管理", () => {
    expect(getTextAnnotationTooltipActions(2, true)).toEqual({
      showAddComment: false,
      showManageAnnotation: true,
      shouldRender: true,
    });
  });
});
```

- [ ] **Step 2：运行测试，确认模块不存在**

```bash
pnpm exec vitest run components/Comments/Article/utils/textAnnotationTooltipActions.test.ts
```

预期：FAIL，提示无法找到 `textAnnotationTooltipActions`。

- [ ] **Step 3：实现权限矩阵函数**

`components/Comments/Article/utils/textAnnotationTooltipActions.ts`：

```ts
export function getTextAnnotationTooltipActions(
  commentCount: number,
  canManageTextAnnotations: boolean,
) {
  const showAddComment = commentCount === 0;
  const showManageAnnotation = canManageTextAnnotations;

  return {
    showAddComment,
    showManageAnnotation,
    shouldRender: showAddComment || showManageAnnotation,
  };
}
```

- [ ] **Step 4：运行权限矩阵测试**

```bash
pnpm exec vitest run components/Comments/Article/utils/textAnnotationTooltipActions.test.ts
```

预期：4 个测试全部 PASS。

- [ ] **Step 5：新增共享颜色和线型控件**

`components/Comments/Article/components/TextAnnotationControls.tsx`：

```tsx
import type {
  TextAnnotationColor,
  TextAnnotationLineStyle,
} from "../../Comment/types";

type TextAnnotationControlsProps = {
  selectedColor: TextAnnotationColor;
  selectedLineStyle?: TextAnnotationLineStyle;
  disabled?: boolean;
  onColorSelect: (color: TextAnnotationColor) => void;
  onLineStyleSelect: (lineStyle: TextAnnotationLineStyle) => void;
};

const COLORS: Array<{
  name: TextAnnotationColor;
  label: string;
  value: string;
}> = [
  { name: "amber", label: "黄色", value: "#f59e0b" },
  { name: "rose", label: "红色", value: "#f43f5e" },
  { name: "sky", label: "蓝色", value: "#0ea5e9" },
  { name: "emerald", label: "绿色", value: "#10b981" },
  { name: "violet", label: "紫色", value: "#8b5cf6" },
];

const LINE_STYLES: Array<{
  name: TextAnnotationLineStyle;
  label: string;
}> = [
  { name: "solid", label: "直线" },
  { name: "double", label: "双线" },
  { name: "wavy", label: "波浪" },
];

export default function TextAnnotationControls({
  selectedColor,
  selectedLineStyle,
  disabled = false,
  onColorSelect,
  onLineStyleSelect,
}: TextAnnotationControlsProps) {
  return (
    <>
      {COLORS.map((color) => (
        <button
          key={color.name}
          type="button"
          aria-label={`选择${color.label}`}
          aria-pressed={selectedColor === color.name}
          title={color.label}
          disabled={disabled}
          onClick={() => {
            onColorSelect(color.name);
          }}
          style={{ backgroundColor: color.value }}
          className={`
            size-5 shrink-0 rounded-full
            ring-offset-2
            ring-offset-white
            disabled:cursor-not-allowed
            disabled:opacity-50
            dark:ring-offset-[#181818]
            ${
              selectedColor === color.name
                ? "ring-2 ring-slate-700 dark:ring-slate-200"
                : ""
            }
          `}
        />
      ))}

      <span className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

      {LINE_STYLES.map((lineStyle) => (
        <button
          key={lineStyle.name}
          type="button"
          aria-pressed={selectedLineStyle === lineStyle.name}
          disabled={disabled}
          onClick={() => {
            onLineStyleSelect(lineStyle.name);
          }}
          className={`
            shrink-0 rounded-lg
            px-2 py-1.5
            disabled:cursor-not-allowed
            disabled:opacity-50
            ${
              selectedLineStyle === lineStyle.name
                ? "bg-slate-100 text-slate-950 dark:bg-[#2a2a2a] dark:text-white"
                : "hover:bg-slate-100 dark:hover:bg-[#242424]"
            }
          `}
        >
          {lineStyle.label}
        </button>
      ))}
    </>
  );
}
```

- [ ] **Step 6：把选区 Tooltip 替换成使用共享控件的版本**

`components/Comments/Article/components/SelectionCommentTooltip.tsx`：

```tsx
"use client";

import { MessageCirclePlus } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import type {
  ParagraphTextSelection,
  TextAnnotationColor,
  TextAnnotationLineStyle,
} from "../../Comment/types";
import TextAnnotationControls from "./TextAnnotationControls";

type SelectionCommentTooltipProps = {
  position: ParagraphTextSelection["position"];
  onAddComment: () => void;
  canManageTextAnnotations: boolean;
  onAddAnnotation: (
    lineStyle: TextAnnotationLineStyle,
    color: TextAnnotationColor,
  ) => void;
};

export default function SelectionCommentTooltip({
  position,
  onAddComment,
  canManageTextAnnotations,
  onAddAnnotation,
}: SelectionCommentTooltipProps) {
  const [selectedColor, setSelectedColor] =
    useState<TextAnnotationColor>("amber");

  if (typeof document === "undefined") {
    return null;
  }

  const placementClass =
    position.placement === "top" ? "-translate-y-full" : "";

  return createPortal(
    <div
      role="toolbar"
      aria-label="选中文字操作"
      style={{
        left: position.x,
        top: position.y,
      }}
      onPointerDown={(event) => {
        event.preventDefault();
      }}
      className={`
        not-prose
        fixed z-50
        -translate-x-1/2
        ${placementClass}
        flex max-w-[calc(100vw-16px)]
        items-center gap-1
        overflow-x-auto rounded-xl
        border border-slate-200
        bg-white p-1.5
        text-xs text-slate-600
        shadow-xl
        dark:border-[#303030]
        dark:bg-[#181818]
        dark:text-slate-300
      `}
    >
      <button
        type="button"
        aria-label="添加段评"
        title="添加段评"
        onClick={onAddComment}
        className="
          inline-flex size-8 shrink-0
          items-center justify-center
          rounded-lg text-sky-600
          hover:bg-sky-50
          dark:text-sky-400
          dark:hover:bg-[#242424]
        "
      >
        <MessageCirclePlus
          aria-hidden="true"
          className="size-4"
          strokeWidth={1.5}
        />
      </button>

      {canManageTextAnnotations && (
        <>
          <span className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

          <TextAnnotationControls
            selectedColor={selectedColor}
            onColorSelect={setSelectedColor}
            onLineStyleSelect={(lineStyle) => {
              onAddAnnotation(lineStyle, selectedColor);
            }}
          />
        </>
      )}
    </div>,
    document.body,
  );
}
```

- [ ] **Step 7：新增已有画线 Tooltip**

`components/Comments/Article/components/ExistingTextAnnotationTooltip.tsx`：

```tsx
"use client";

import { MessageCirclePlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import type {
  ActiveTextAnnotation,
  UpdateTextAnnotation,
} from "../../Comment/types";
import TextAnnotationControls from "./TextAnnotationControls";

type ExistingTextAnnotationTooltipProps = {
  activeTextAnnotation: ActiveTextAnnotation;
  showAddComment: boolean;
  canManageTextAnnotations: boolean;
  onAddComment: () => void;
  onUpdate: (input: UpdateTextAnnotation) => Promise<void>;
  onDelete: () => Promise<void>;
};

export default function ExistingTextAnnotationTooltip({
  activeTextAnnotation,
  showAddComment,
  canManageTextAnnotations,
  onAddComment,
  onUpdate,
  onDelete,
}: ExistingTextAnnotationTooltipProps) {
  const [pending, setPending] = useState(false);
  const { annotation, position } = activeTextAnnotation;

  if (typeof document === "undefined") {
    return null;
  }

  const placementClass =
    position.placement === "top" ? "-translate-y-full" : "";

  async function runAction(action: () => Promise<void>) {
    if (pending) {
      return;
    }

    setPending(true);

    try {
      await action();
    } catch {
      // 调用方负责展示具体错误消息。
    } finally {
      setPending(false);
    }
  }

  return createPortal(
    <div
      data-text-annotation-tooltip
      role="toolbar"
      aria-label="已有画线操作"
      style={{
        left: position.x,
        top: position.y,
      }}
      onPointerDown={(event) => {
        event.preventDefault();
      }}
      onClick={(event) => {
        event.stopPropagation();
      }}
      className={`
        not-prose
        fixed z-50
        -translate-x-1/2
        ${placementClass}
        flex max-w-[calc(100vw-16px)]
        items-center gap-1
        overflow-x-auto rounded-xl
        border border-slate-200
        bg-white p-1.5
        text-xs text-slate-600
        shadow-xl
        dark:border-[#303030]
        dark:bg-[#181818]
        dark:text-slate-300
      `}
    >
      {showAddComment && (
        <button
          type="button"
          aria-label="添加段评"
          title="添加段评"
          disabled={pending}
          onClick={onAddComment}
          className="
            inline-flex size-8 shrink-0
            items-center justify-center
            rounded-lg text-sky-600
            hover:bg-sky-50
            disabled:cursor-not-allowed
            disabled:opacity-50
            dark:text-sky-400
            dark:hover:bg-[#242424]
          "
        >
          <MessageCirclePlus
            aria-hidden="true"
            className="size-4"
            strokeWidth={1.5}
          />
        </button>
      )}

      {showAddComment && canManageTextAnnotations && (
        <span className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
      )}

      {canManageTextAnnotations && (
        <>
          <TextAnnotationControls
            selectedColor={annotation.color}
            selectedLineStyle={annotation.lineStyle}
            disabled={pending}
            onColorSelect={(color) => {
              if (color === annotation.color) {
                return;
              }

              void runAction(() =>
                onUpdate({
                  lineStyle: annotation.lineStyle,
                  color,
                }),
              );
            }}
            onLineStyleSelect={(lineStyle) => {
              if (lineStyle === annotation.lineStyle) {
                return;
              }

              void runAction(() =>
                onUpdate({
                  lineStyle,
                  color: annotation.color,
                }),
              );
            }}
          />

          <span className="mx-1 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />

          <button
            type="button"
            aria-label="删除整条画线"
            title="删除整条画线"
            disabled={pending}
            onClick={() => {
              void runAction(onDelete);
            }}
            className="
              inline-flex size-8 shrink-0
              items-center justify-center
              rounded-lg text-rose-500
              hover:bg-rose-50
              disabled:cursor-not-allowed
              disabled:opacity-50
              dark:text-rose-400
              dark:hover:bg-rose-950/30
            "
          >
            <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.5} />
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}
```

- [ ] **Step 8：运行测试和静态检查**

```bash
pnpm exec vitest run components/Comments/Article/utils/textAnnotationTooltipActions.test.ts
pnpm exec tsc --noEmit
pnpm exec eslint components/Comments/Article/components/TextAnnotationControls.tsx components/Comments/Article/components/SelectionCommentTooltip.tsx components/Comments/Article/components/ExistingTextAnnotationTooltip.tsx components/Comments/Article/utils/textAnnotationTooltipActions.ts
```

预期：全部通过。

- [ ] **Step 9：提交 Tooltip 组件**

```bash
git add components/Comments/Article/components/TextAnnotationControls.tsx components/Comments/Article/components/SelectionCommentTooltip.tsx components/Comments/Article/components/ExistingTextAnnotationTooltip.tsx components/Comments/Article/utils/textAnnotationTooltipActions.ts components/Comments/Article/utils/textAnnotationTooltipActions.test.ts
git commit -m "feat: 添加已有画线操作工具栏"
```

## Task 5：把激活画线接入 Provider 和段落组件

**Files:**

- Modify: `components/Comments/Article/context/ArticleCommentsContext.ts`
- Modify: `components/Comments/Article/providers/ArticleCommentsProvider.tsx`
- Modify: `components/Comments/Article/components/CommentableParagraph.tsx`

- [ ] **Step 1：替换 Context 完整代码**

`components/Comments/Article/context/ArticleCommentsContext.ts`：

```ts
"use client";

import { createContext, useContext } from "react";
import type {
  ActiveTextAnnotation,
  NewTextAnnotation,
  ParagraphTextSelection,
  UpdateTextAnnotation,
} from "../../Comment/types";

export type ArticleCommentsContextValue = {
  postSlug: string;
  commentCounts: Record<string, number>;
  refreshCommentCounts: () => Promise<void>;
  paragraphSelection: ParagraphTextSelection | null;
  activeTextAnnotation: ActiveTextAnnotation | null;
  canManageTextAnnotations: boolean;
  addTextAnnotation: (annotation: NewTextAnnotation) => Promise<void>;
  updateTextAnnotation: (
    annotationId: string,
    input: UpdateTextAnnotation,
  ) => Promise<void>;
  deleteTextAnnotation: (annotationId: string) => Promise<void>;
  closeActiveTextAnnotation: () => void;
};

export const ArticleCommentsContext =
  createContext<ArticleCommentsContextValue | null>(null);

export function useArticleComments() {
  const context = useContext(ArticleCommentsContext);

  if (!context) {
    throw new Error("useArticleComments 必须在 ArticleCommentsProvider 内使用");
  }

  return context;
}
```

- [ ] **Step 2：替换 Provider 完整代码**

`components/Comments/Article/providers/ArticleCommentsProvider.tsx`：

```tsx
"use client";

import { type ReactNode, useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { ArticleCommentsContext } from "../context/ArticleCommentsContext";
import { useActiveTextAnnotation } from "../hooks/useActiveTextAnnotation";
import { useArticleCommentCounts } from "../hooks/useArticleCommentCounts";
import { useParagraphTextSelection } from "../hooks/useParagraphTextSelection";
import { useTextAnnotationHighlights } from "../hooks/useTextAnnotationHighlights";
import { useTextAnnotations } from "../hooks/useTextAnnotations";

type ArticleCommentsProviderProps = {
  postSlug: string;
  children: ReactNode;
};

function ArticleCommentsProvider({
  postSlug,
  children,
}: ArticleCommentsProviderProps) {
  const { data: session } = authClient.useSession();
  const paragraphSelection = useParagraphTextSelection();
  const { commentCounts, refreshCommentCounts } =
    useArticleCommentCounts(postSlug);
  const {
    annotations,
    addTextAnnotation,
    updateTextAnnotation,
    deleteTextAnnotation,
  } = useTextAnnotations(postSlug);
  const {
    activeTextAnnotation,
    closeActiveTextAnnotation,
  } = useActiveTextAnnotation(annotations);

  useTextAnnotationHighlights(annotations);

  const contextValue = useMemo(
    () => ({
      postSlug,
      commentCounts,
      refreshCommentCounts,
      paragraphSelection,
      activeTextAnnotation,
      canManageTextAnnotations: Boolean(session),
      addTextAnnotation,
      updateTextAnnotation,
      deleteTextAnnotation,
      closeActiveTextAnnotation,
    }),
    [
      postSlug,
      commentCounts,
      refreshCommentCounts,
      paragraphSelection,
      activeTextAnnotation,
      session,
      addTextAnnotation,
      updateTextAnnotation,
      deleteTextAnnotation,
      closeActiveTextAnnotation,
    ],
  );

  return (
    <ArticleCommentsContext.Provider value={contextValue}>
      {children}
    </ArticleCommentsContext.Provider>
  );
}

export default ArticleCommentsProvider;
```

- [ ] **Step 3：替换段落组件完整代码**

`components/Comments/Article/components/CommentableParagraph.tsx`：

```tsx
"use client";

import { type ComponentPropsWithoutRef, useState } from "react";
import { toast } from "sonner";
import CommentComposerDialog from "../../Comment/CommentComposerDialog";
import CommentDrawer from "../../Comment/CommentDrawer";
import type {
  TextAnnotationColor,
  TextAnnotationLineStyle,
  UpdateTextAnnotation,
} from "../../Comment/types";
import { useArticleComments } from "../context/ArticleCommentsContext";
import { getTextAnnotationTooltipActions } from "../utils/textAnnotationTooltipActions";
import ExistingTextAnnotationTooltip from "./ExistingTextAnnotationTooltip";
import ParagraphCommentTrigger from "./paragraphCommentTrigger";

type CommentableParagraphProps = ComponentPropsWithoutRef<"p"> & {
  paragraphId: string;
};

function CommentableParagraph({
  paragraphId,
  children,
  className,
  ...paragraphProps
}: CommentableParagraphProps) {
  const {
    postSlug,
    commentCounts,
    refreshCommentCounts,
    paragraphSelection,
    activeTextAnnotation,
    canManageTextAnnotations,
    addTextAnnotation,
    updateTextAnnotation,
    deleteTextAnnotation,
    closeActiveTextAnnotation,
  } = useArticleComments();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");

  const drawerId = `comments-${paragraphId}`;
  const commentCount = commentCounts[paragraphId] ?? 0;

  const activeSelection =
    paragraphSelection?.paragraphId === paragraphId ? paragraphSelection : null;

  const activeAnnotation =
    activeTextAnnotation?.annotation.paragraphId === paragraphId
      ? activeTextAnnotation
      : null;

  const annotationTooltipActions = getTextAnnotationTooltipActions(
    commentCount,
    canManageTextAnnotations,
  );

  function openCommentComposer() {
    if (!activeSelection) {
      return;
    }

    setSelectedText(activeSelection.text);
    setComposerOpen(true);
    window.getSelection()?.removeAllRanges();
  }

  function openAnnotationCommentComposer() {
    if (!activeAnnotation) {
      return;
    }

    setSelectedText(activeAnnotation.annotation.selectedText);
    setComposerOpen(true);
    closeActiveTextAnnotation();
  }

  function handleCommentPublished() {
    void refreshCommentCounts();
    setDrawerOpen(true);
  }

  async function handleAddAnnotation(
    lineStyle: TextAnnotationLineStyle,
    color: TextAnnotationColor,
  ) {
    if (!activeSelection) {
      return;
    }

    try {
      await addTextAnnotation({
        paragraphId,
        startOffset: activeSelection.startOffset,
        endOffset: activeSelection.endOffset,
        selectedText: activeSelection.text,
        lineStyle,
        color,
      });

      window.getSelection()?.removeAllRanges();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加画线失败");
    }
  }

  async function handleUpdateAnnotation(input: UpdateTextAnnotation) {
    if (!activeAnnotation) {
      return;
    }

    try {
      await updateTextAnnotation(activeAnnotation.annotation.id, input);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改画线失败");
      throw error;
    }
  }

  async function handleDeleteAnnotation() {
    if (!activeAnnotation) {
      return;
    }

    try {
      await deleteTextAnnotation(activeAnnotation.annotation.id);
      closeActiveTextAnnotation();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除画线失败");
      throw error;
    }
  }

  return (
    <div className="my-[1.25em] grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2">
      <p
        {...paragraphProps}
        data-paragraph-id={paragraphId}
        className={`m-0! ${className ?? ""}`}
      >
        {children}
      </p>

      <ParagraphCommentTrigger
        commentCount={commentCount}
        selection={activeSelection}
        expanded={drawerOpen}
        controls={drawerId}
        onAddComment={openCommentComposer}
        canManageTextAnnotations={canManageTextAnnotations}
        onAddAnnotation={handleAddAnnotation}
        onOpenComments={() => {
          setDrawerOpen(true);
        }}
      />

      {activeAnnotation && annotationTooltipActions.shouldRender && (
        <ExistingTextAnnotationTooltip
          activeTextAnnotation={activeAnnotation}
          showAddComment={annotationTooltipActions.showAddComment}
          canManageTextAnnotations={
            annotationTooltipActions.showManageAnnotation
          }
          onAddComment={openAnnotationCommentComposer}
          onUpdate={handleUpdateAnnotation}
          onDelete={handleDeleteAnnotation}
        />
      )}

      {drawerOpen && (
        <CommentDrawer
          id={drawerId}
          postSlug={postSlug}
          paragraphId={paragraphId}
          onClose={() => {
            setDrawerOpen(false);
          }}
          onPublished={refreshCommentCounts}
        />
      )}

      {composerOpen && (
        <CommentComposerDialog
          mode="comment"
          postSlug={postSlug}
          paragraphId={paragraphId}
          selectedText={selectedText}
          onClose={() => {
            setComposerOpen(false);
          }}
          onPublished={handleCommentPublished}
        />
      )}
    </div>
  );
}

export default CommentableParagraph;
```

- [ ] **Step 4：运行完整测试和静态检查**

```bash
pnpm test
pnpm exec tsc --noEmit
pnpm exec eslint components/Comments/Article components/Comments/Comment/types.ts
```

预期：Vitest 全部 PASS，TypeScript 和 ESLint 无错误。

- [ ] **Step 5：提交功能接线**

```bash
git add components/Comments/Article/context/ArticleCommentsContext.ts components/Comments/Article/providers/ArticleCommentsProvider.tsx components/Comments/Article/components/CommentableParagraph.tsx
git commit -m "feat: 接通已有文章画线交互"
```

## Task 6：浏览器验收

**Files:** 无代码改动。

- [ ] **Step 1：启动开发服务器**

```bash
pnpm dev
```

预期：应用正常启动，没有 CSS 或 TypeScript 编译错误。

- [ ] **Step 2：以游客身份验证**

依次检查：

1. 游客仍能看到已有画线。
2. 点击没有画线的文字不会显示 Tooltip。
3. 点击没有段评的已有画线，只显示“添加段评”。
4. 点击“添加段评”后，弹窗引用整条画线文字。
5. 点击已有段评的画线，不显示空 Tooltip。
6. 游客看不到颜色、线型和删除按钮。

- [ ] **Step 3：以管理员身份验证**

依次检查：

1. 点击已有画线后显示当前颜色和线型的选中状态。
2. 选择新颜色后整条画线立即改变，刷新页面后仍保持。
3. 选择新线型后整条画线立即改变，刷新页面后仍保持。
4. 点击当前已经选中的颜色或线型不会发送重复请求。
5. 点击删除后整条画线消失，刷新页面后不会恢复。
6. 没有段评时同时显示添加段评和画线管理操作。
7. 已有段评时只显示画线管理操作。
8. 拖动选择新文字时，已有画线 Tooltip 关闭，现有选区 Tooltip 正常出现。

- [ ] **Step 4：检查失败场景**

在浏览器开发者工具中临时切换到离线状态，再尝试修改或删除：

1. 页面显示错误 toast。
2. 原画线仍然存在。
3. Tooltip 没有因为失败而丢失当前画线状态。

- [ ] **Step 5：最终检查工作区**

```bash
git status --short
git log -5 --oneline
```

预期：没有遗漏的未提交功能文件，最近提交依次包含 API、本地状态、点击识别、Tooltip 和最终接线。
