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
