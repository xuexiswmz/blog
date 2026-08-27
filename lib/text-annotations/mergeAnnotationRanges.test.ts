import { describe, expect, it } from "vitest";
import { mergeAnnotationRanges } from "./mergeAnnotationRanges";

describe("mergeAnnotationRanges", () => {
  it("没有重叠时保留新选区范围", () => {
    const result = mergeAnnotationRanges(
      [
        {
          id: "old-1",
          startOffset: 50,
          endOffset: 60,
        },
      ],
      {
        startOffset: 10,
        endOffset: 20,
      },
    );

    expect(result).toEqual({
      startOffset: 10,
      endOffset: 20,
      replacedIds: [],
    });
  });

  it("新选区与旧画线重叠时合并整条旧画线", () => {
    const result = mergeAnnotationRanges(
      [
        {
          id: "old-1",
          startOffset: 20,
          endOffset: 50,
        },
      ],
      {
        startOffset: 15,
        endOffset: 40,
      },
    );

    expect(result).toEqual({
      startOffset: 15,
      endOffset: 50,
      replacedIds: ["old-1"],
    });
  });

  it("新选区连接多条画线时全部合并", () => {
    const result = mergeAnnotationRanges(
      [
        {
          id: "old-1",
          startOffset: 10,
          endOffset: 20,
        },
        {
          id: "old-2",
          startOffset: 30,
          endOffset: 40,
        },
      ],
      {
        startOffset: 15,
        endOffset: 35,
      },
    );

    expect(result).toEqual({
      startOffset: 10,
      endOffset: 40,
      replacedIds: ["old-1", "old-2"],
    });
  });

  it("选区与旧画线边界相接时也合并", () => {
    const result = mergeAnnotationRanges(
      [
        {
          id: "old-1",
          startOffset: 10,
          endOffset: 20,
        },
      ],
      {
        startOffset: 20,
        endOffset: 30,
      },
    );

    expect(result).toEqual({
      startOffset: 10,
      endOffset: 30,
      replacedIds: ["old-1"],
    });
  });

  it("范围扩张后继续寻找新的相接画线", () => {
    const result = mergeAnnotationRanges(
      [
        {
          id: "old-2",
          startOffset: 30,
          endOffset: 40,
        },
        {
          id: "old-1",
          startOffset: 10,
          endOffset: 25,
        },
      ],
      {
        startOffset: 24,
        endOffset: 30,
      },
    );

    expect(result).toEqual({
      startOffset: 10,
      endOffset: 40,
      replacedIds: ["old-2", "old-1"],
    });
  });
});
