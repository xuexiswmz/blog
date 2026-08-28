import { describe, expect, it } from "vitest";
import type { TextAnnotation } from "../../Comment/types";
import { buildTextAnnotationInput } from "./buildTextAnnotationInput";

const paragraphText = "0123456789abcdefghijklmnopqrstuvwxyz";

describe("buildTextAnnotationInput", () => {
  it("没有旧画线时保留当前选区", () => {
    const result = buildTextAnnotationInput(
      [],
      {
        paragraphId: "p-123456789abc",
        startOffset: 2,
        endOffset: 6,
        selectedText: "2345",
        lineStyle: "solid",
        color: "sky",
      },
      paragraphText,
    );

    expect(result).toEqual({
      paragraphId: "p-123456789abc",
      startOffset: 2,
      endOffset: 6,
      selectedText: "2345",
      lineStyle: "solid",
      color: "sky",
    });
  });

  it("与旧画线重叠时发送完整合并范围和对应文字", () => {
    const annotations: TextAnnotation[] = [
      {
        id: "old-annotation",
        postSlug: "css-centering",
        paragraphId: "p-123456789abc",
        startOffset: 5,
        endOffset: 12,
        selectedText: paragraphText.slice(5, 12),
        lineStyle: "wavy",
        color: "amber",
        createdAt: "2026-08-27T00:00:00.000Z",
      },
    ];

    const result = buildTextAnnotationInput(
      annotations,
      {
        paragraphId: "p-123456789abc",
        startOffset: 2,
        endOffset: 8,
        selectedText: paragraphText.slice(2, 8),
        lineStyle: "double",
        color: "rose",
      },
      paragraphText,
    );

    expect(result).toEqual({
      paragraphId: "p-123456789abc",
      startOffset: 2,
      endOffset: 12,
      selectedText: paragraphText.slice(2, 12),
      lineStyle: "double",
      color: "rose",
    });
  });

  it("忽略其他段落中的画线", () => {
    const annotations: TextAnnotation[] = [
      {
        id: "other-paragraph",
        postSlug: "css-centering",
        paragraphId: "p-aaaaaaaaaaaa",
        startOffset: 0,
        endOffset: 20,
        selectedText: paragraphText.slice(0, 20),
        lineStyle: "wavy",
        color: "amber",
        createdAt: "2026-08-27T00:00:00.000Z",
      },
    ];

    const result = buildTextAnnotationInput(
      annotations,
      {
        paragraphId: "p-123456789abc",
        startOffset: 2,
        endOffset: 6,
        selectedText: "2345",
        lineStyle: "solid",
        color: "sky",
      },
      paragraphText,
    );

    expect(result.startOffset).toBe(2);
    expect(result.endOffset).toBe(6);
  });
});
