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
