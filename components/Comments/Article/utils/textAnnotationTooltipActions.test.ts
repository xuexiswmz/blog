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
